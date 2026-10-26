"use client";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { IntentsDecideRequest } from "@capiro/meri-client/intents";
import type { IntentsAccess } from "@/shared/meri-intents/access";
import { intentRows, type IntentRow, type Viewer } from "./intent-view";
import { useIntentList, type ListState } from "./useIntentList";
import { useIntentExpiry } from "./useIntentExpiry";
import {
  intentDecisionRecovery,
  type IntentDecisionScope,
} from "./decision-recovery";

export type { ListState };
export type Choice = IntentsDecideRequest["decision"];
export type Attempt =
  | { state: "pending"; decision: Choice }
  | { state: "uncertain"; decision: Choice; message?: string };
export type IntentScope = IntentDecisionScope;
type RecoveryState = {
  key: string;
  access: IntentsAccess;
  list: ListState | null;
  ready: boolean;
  attempts: Readonly<Record<string, Attempt>>;
  error?: string;
};

/** Current list/proposal authority plus a durable exact decision; hydration never dispatches. */
export function useConversationIntents(
  access: IntentsAccess,
  scope: IntentScope,
  options: { now?: () => number; refreshKey?: string } = {},
) {
  const now = options.now ?? Date.now;
  const { conversationId, tenantId, actorId } = scope;
  const { list, refresh, retry, loadMore } = useIntentList(
    access,
    conversationId,
    options.refreshKey,
  );
  const key = JSON.stringify([tenantId, actorId, conversationId]);
  const checkedAt = useIntentExpiry(list, key, now);
  const current = useRef({ access, key, active: true });
  useLayoutEffect(() => {
    current.current = { access, key, active: true };
    return () => {
      current.current.active = false;
    };
  }, [access, key]);
  const pending = useRef(new Map<string, IntentsAccess>());
  const [recovery, setRecovery] = useState<RecoveryState>({
    key,
    access,
    list: null,
    ready: false,
    attempts: {},
  });
  const guard = useCallback(() => {
    if (
      !current.current.active ||
      current.current.access !== access ||
      current.current.key !== key
    )
      throw new DOMException("The decision view changed.", "AbortError");
  }, [access, key]);
  const recoveryFor = useCallback(
    (id: string) =>
      intentDecisionRecovery({ tenantId, actorId, conversationId }, id, guard),
    [tenantId, actorId, conversationId, guard],
  );

  useEffect(() => {
    if (list.status !== "ready") return;
    let active = true;
    void (async () => {
      const entries: Array<[string, Attempt]> = [];
      for (const item of list.items) {
        if (
          item.state !== "prepared" ||
          item.kind !== "proposal" ||
          "withheld" in item
        )
          continue;
        const id = item.proposal.proposalId,
          journal = recoveryFor(id);
        if (pending.current.get(id) === access) continue;
        const saved = await journal.load();
        guard();
        if (!saved) continue;
        journal.matches(saved, item.proposal, item.deliveryId);
        if (
          (item.phase === "rejected" &&
            typeof item.decision === "object" &&
            item.decision?.decision === "rejected") ||
          (item.phase === "completed" &&
            typeof item.execution === "object" &&
            item.execution?.state === "completed")
        )
          await journal.observed(item.proposal, item.deliveryId);
        else
          entries.push([id, { state: "uncertain", decision: saved.decision }]);
      }
      guard();
      if (active)
        setRecovery((previous) => ({
          key,
          access,
          list,
          ready: true,
          attempts: {
            ...Object.fromEntries(entries),
            ...Object.fromEntries(
              Object.entries(
                previous.key === key ? previous.attempts : {},
              ).filter(([id]) => pending.current.get(id) === access),
            ),
          },
        }));
    })().catch((error: unknown) => {
      if (
        active &&
        current.current.active &&
        current.current.key === key &&
        current.current.access === access
      )
        setRecovery((previous) => ({
          key,
          access,
          list,
          ready: false,
          attempts: previous.key === key ? previous.attempts : {},
          error:
            error instanceof Error
              ? error.message
              : "Saved decision recovery is unavailable.",
        }));
    });
    return () => {
      active = false;
    };
  }, [list, key, access, recoveryFor, guard]);

  const attempts = useMemo(
    () => (recovery.key === key ? recovery.attempts : {}),
    [recovery, key],
  );
  const ready =
    list.status === "ready" &&
    recovery.key === key &&
    recovery.access === access &&
    recovery.list === list &&
    recovery.ready;
  const decide = useCallback(
    async (row: IntentRow, decision: Choice) => {
      const proposal = row.proposal;
      if (
        !proposal ||
        !ready ||
        pending.current.get(proposal.proposalId) === access
      )
        return;
      const id = proposal.proposalId,
        prior = attempts[id];
      // A throttled tab may still hold a control from before the deadline.
      // Keep saved decision reconciliation separate from a new decision.
      if (!prior && Date.parse(proposal.expiresAt) <= now()) return;
      if (prior?.state === "pending" || (prior && prior.decision !== decision))
        return;
      const request: IntentsDecideRequest = {
        conversationId,
        deliveryId: row.deliveryId,
        proposalId: id,
        commandSha256: proposal.commandSha256,
        decision,
      };
      pending.current.set(id, access);
      setRecovery((previous) => ({
        ...previous,
        attempts: {
          ...previous.attempts,
          [id]: { state: "pending", decision },
        },
      }));
      let attempt: Attempt | null = { state: "uncertain", decision };
      try {
        guard();
        const reply = await recoveryFor(id).decide(
          access,
          request,
          proposal,
          new AbortController().signal,
        );
        if (reply.kind === "ok" && reply.value.status !== "indeterminate")
          attempt = null;
        else if (reply.kind === "refused")
          attempt = {
            state: "uncertain",
            decision,
            message: `The service returned ${reply.code}. The saved decision remains unresolved; refresh or retry the same request.`,
          };
        else if (reply.kind === "unavailable" && !reply.dispatched)
          attempt = {
            state: "uncertain",
            decision,
            message:
              "This attempt was not sent. Your exact decision is saved; retry it or refresh the current proposal.",
          };
      } catch (error) {
        attempt = {
          state: "uncertain",
          decision,
          message:
            error instanceof Error
              ? error.message
              : "Decision recovery is unavailable.",
        };
      } finally {
        if (pending.current.get(id) === access) pending.current.delete(id);
      }
      if (
        !current.current.active ||
        current.current.key !== key ||
        current.current.access !== access
      )
        return;
      setRecovery((previous) => {
        const next = { ...previous.attempts };
        if (attempt) next[id] = attempt;
        else delete next[id];
        return { ...previous, attempts: next };
      });
      await refresh();
    },
    [
      access,
      attempts,
      conversationId,
      ready,
      recoveryFor,
      guard,
      key,
      refresh,
      now,
    ],
  );

  const viewer = useMemo<Viewer>(
    () => ({ tenantId, actorId }),
    [tenantId, actorId],
  );
  const rows = useMemo(
    () =>
      list.status === "ready" ? intentRows(list.items, checkedAt, viewer) : [],
    [list, checkedAt, viewer],
  );
  return {
    list,
    rows,
    attempts,
    refresh,
    retry,
    loadMore,
    decide,
    decisionsReady: ready,
    recoveryError: recovery.key === key ? recovery.error : undefined,
  };
}

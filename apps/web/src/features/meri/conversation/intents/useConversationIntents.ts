"use client";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  IntentsDecideRequest,
  IntentsItem,
} from "@capiro/meri-client/intents";
import type { IntentsAccess } from "@/shared/meri-intents/access";
import { intentRows, type IntentRow, type Viewer } from "./intent-view";
import { useIntentList, type ListState } from "./useIntentList";
import {
  isClientRecordProposal,
  clientRecordSettled,
} from "./client-record-view";
import { isBizdevProposal, bizdevSettled } from "./bizdev-view";
import { isLegiwatchProposal, legiwatchSettled } from "./legiwatch-view";
import { isMailSendProposal, mailOutcomeSettled } from "./mail-view";
import { useIntentExpiry } from "./useIntentExpiry";
import { useResearchShareResults } from "./useResearchShareResults";
import {
  isResearchShareProposal,
  intentDecisionSettled,
} from "./research-share-view";
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

/**
 * A durable owner outcome that settles this saved decision. A mail decision settles only on its
 * exact native-mail accepted/failed outcome; absent, unreadable or mismatched stays uncertain.
 */
function settledOwnerOutcome(
  item: Extract<IntentsItem, { kind: "proposal"; proposal: unknown }>,
) {
  if (item.phase === "rejected")
    return (
      typeof item.decision === "object" &&
      item.decision?.decision === "rejected"
    );
  if (item.phase !== "completed") return false;
  const execution = item.execution;
  if (
    execution === null ||
    execution === "unavailable" ||
    execution.state !== "completed"
  )
    return false;
  return isMailSendProposal(item.proposal)
    ? mailOutcomeSettled(execution.outcome)
    : true;
}

/** Current list/proposal authority plus a durable exact decision; hydration never dispatches. */
export function useConversationIntents(
  access: IntentsAccess,
  scope: IntentScope,
  options: {
    now?: () => number;
    refreshKey?: string;
    onDecisionSettled?: (runId: string) => void;
  } = {},
) {
  const now = options.now ?? Date.now;
  const onDecisionSettled = options.onDecisionSettled;
  const { conversationId, tenantId, actorId } = scope;
  const { list, refresh, retry, loadMore } = useIntentList(
    access,
    conversationId,
    options.refreshKey,
  );
  const key = JSON.stringify([tenantId, actorId, conversationId]);
  const oneTime = useResearchShareResults(key, access, list);
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
          (item.kind !== "proposal" &&
            item.kind !== "research_share" &&
            item.kind !== "legiwatch_action" &&
            item.kind !== "client_record_action" &&
            item.kind !== "bizdev_action") ||
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
          (item.kind === "bizdev_action" &&
            item.result !== "unavailable" &&
            bizdevSettled(item.result.status)) ||
          (item.kind === "client_record_action" &&
            item.result !== "unavailable" &&
            clientRecordSettled(item.result.status)) ||
          (item.kind === "legiwatch_action" &&
            item.result !== "unavailable" &&
            legiwatchSettled(item.result.status)) ||
          (item.kind === "research_share" &&
            [
              "succeeded",
              "dismissed",
              "expired",
              "failed_terminal",
              "blocked",
            ].includes(item.proposalStatus)) ||
          (item.kind === "proposal" && settledOwnerOutcome(item))
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
      // Reconcile uncertain domain actions by reading their owner; never resend them.
      if (
        prior &&
        (isBizdevProposal(proposal) ||
          isLegiwatchProposal(proposal) ||
          isClientRecordProposal(proposal) ||
          isMailSendProposal(proposal))
      ) {
        try {
          guard();
        } catch {
          return;
        }
        await refresh();
        return;
      }
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
          (accepted) => {
            guard();
            oneTime.accept(proposal, decision, accepted);
          },
        );
        if (reply.kind === "ok" && intentDecisionSettled(reply.value))
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
      if (
        !attempt &&
        current.current.active &&
        current.current.key === key &&
        current.current.access === access
      )
        onDecisionSettled?.(
          isBizdevProposal(proposal) ||
            isResearchShareProposal(proposal) ||
            isLegiwatchProposal(proposal) ||
            isClientRecordProposal(proposal)
            ? proposal.binding.runId
            : proposal.command.binding.runId,
        );
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
      onDecisionSettled,
      oneTime,
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
    oneTimeResults: oneTime.results,
    dismissOneTime: oneTime.dismiss,
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

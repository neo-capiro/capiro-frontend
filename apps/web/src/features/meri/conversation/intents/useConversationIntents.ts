"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { IntentsDecideRequest } from "@capiro/meri-client/intents";
import type {
  IntentsAccess,
  IntentsReply,
} from "../../../../shared/meri-intents/access";
import {
  intentRows,
  refusalMessage,
  type IntentRow,
  type Viewer,
} from "./intent-view";
import { useIntentList, type ListState } from "./useIntentList";

export type { ListState };
export type Choice = IntentsDecideRequest["decision"];
/** The one decision a person has made for a proposal that may or may not have been recorded. */
export type Attempt =
  | { state: "pending"; decision: Choice }
  | { state: "uncertain"; decision: Choice }
  | { state: "refused"; decision: Choice; message: string };
export type IntentScope = Viewer & Readonly<{ conversationId: string }>;

const markerKey = (conversationId: string) =>
  `meri.intents.uncertain.${conversationId}`;
/** Uncertain decisions survive a reload so the identical request can still be repeated. Per-tab, never shared. */
function readMarkers(conversationId: string): Record<string, Attempt> {
  try {
    const value: unknown = JSON.parse(
      sessionStorage.getItem(markerKey(conversationId)) ?? "{}",
    );
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(
      Object.entries(value)
        .filter(
          (entry): entry is [string, Choice] =>
            entry[1] === "approved" || entry[1] === "rejected",
        )
        .map(([id, decision]) => [id, { state: "uncertain", decision }]),
    );
  } catch {
    return {};
  }
}
function writeMarkers(
  conversationId: string,
  attempts: Readonly<Record<string, Attempt>>,
) {
  const markers = Object.fromEntries(
    Object.entries(attempts)
      .filter(([, a]) => a.state === "uncertain")
      .map(([id, a]) => [id, a.decision]),
  );
  try {
    if (Object.keys(markers).length)
      sessionStorage.setItem(
        markerKey(conversationId),
        JSON.stringify(markers),
      );
    else sessionStorage.removeItem(markerKey(conversationId));
  } catch {
    /* Storage can be blocked; the durable list remains the source of truth. */
  }
}
/** Phases in which the durable list already says what happened to a decision. */
const decided = new Set([
  "approved",
  "rejected",
  "executing",
  "completed",
  "unknown",
  "expired",
]);

/** What one decide exchange established for the person's attempt; null means it is settled by the list. */
function settled(
  reply: IntentsReply<unknown>,
  decision: Choice,
): Attempt | null {
  if (reply.kind === "ok") return null;
  if (reply.kind === "refused")
    return reply.outcome === "UNKNOWN" ||
      reply.outcome === "RESULT_NOT_RELEASED"
      ? { state: "uncertain", decision }
      : { state: "refused", decision, message: refusalMessage(reply.code) };
  return reply.dispatched
    ? { state: "uncertain", decision }
    : {
        state: "refused",
        decision,
        message:
          "Your decision could not be sent. Nothing was executed. (unavailable)",
      };
}

/** A recorded outcome supersedes an uncertain marker: the durable list now says what happened. */
function unsettled(
  raw: Readonly<Record<string, Attempt>>,
  list: ListState,
): Readonly<Record<string, Attempt>> {
  if (list.status !== "ready") return raw;
  const phases = new Map<string, string>();
  for (const item of list.items)
    if (
      item.state === "prepared" &&
      item.kind === "proposal" &&
      !("withheld" in item)
    )
      phases.set(item.proposal.proposalId, item.phase);
  return Object.fromEntries(
    Object.entries(raw).filter(
      ([id, attempt]) =>
        attempt.state !== "uncertain" || !decided.has(phases.get(id) ?? ""),
    ),
  );
}

/** After an uncertain attempt only that same decision may be repeated; another would be a second request. */
const blocked = (prior: Attempt | undefined, decision: Choice) =>
  prior?.state === "pending" ||
  (prior?.state === "uncertain" && prior.decision !== decision);

/**
 * The conversation's prepared actions and the person's decisions. The durable list is the only source
 * of what happened; it is read again after every decision. A decision whose outcome is uncertain is
 * repeated as the identical request, never replaced by another.
 */
export function useConversationIntents(
  access: IntentsAccess,
  scope: IntentScope,
  options: { now?: () => number; refreshKey?: string } = {},
) {
  const now = options.now ?? Date.now;
  const { conversationId, tenantId, actorId } = scope;
  const { list, refresh, retry, loadMore, alive } = useIntentList(
    access,
    conversationId,
    options.refreshKey,
  );
  const [raw, setRaw] = useState<Readonly<Record<string, Attempt>>>(() =>
    readMarkers(conversationId),
  );
  const attempts = useMemo(() => unsettled(raw, list), [raw, list]);
  useEffect(
    () => writeMarkers(conversationId, attempts),
    [attempts, conversationId],
  );

  const decide = useCallback(
    async (row: IntentRow, decision: Choice) => {
      const proposal = row.proposal;
      if (!proposal) return;
      const id = proposal.proposalId;
      if (blocked(attempts[id], decision)) return;
      const request: IntentsDecideRequest = {
        conversationId,
        deliveryId: row.deliveryId,
        proposalId: id,
        commandSha256: proposal.commandSha256,
        decision,
      };
      setRaw((current) => ({
        ...current,
        [id]: { state: "pending", decision },
      }));
      const reply = await access.decide(
        request,
        proposal,
        new AbortController().signal,
      );
      if (!alive.current) return;
      const attempt = settled(reply, decision);
      setRaw((current) => {
        const next = { ...current };
        if (attempt) next[id] = attempt;
        else delete next[id];
        return next;
      });
      await refresh();
    },
    [access, attempts, conversationId, refresh, alive],
  );

  const viewer = useMemo<Viewer>(
    () => ({ tenantId, actorId }),
    [tenantId, actorId],
  );
  const rows = useMemo(
    () =>
      list.status === "ready" ? intentRows(list.items, now(), viewer) : [],
    [list, now, viewer],
  );
  return { list, rows, attempts, refresh, retry, loadMore, decide };
}

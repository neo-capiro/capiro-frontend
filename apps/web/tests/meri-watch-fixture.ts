import { createHash } from "node:crypto";
import type { IntentsItem } from "@capiro/meri-client/intents";
import { canonicalSha256 } from "./meri-action-wire-fixtures";
import { legiwatchFixture } from "./meri-legiwatch-fixture";
export type WatchItem = Extract<
  IntentsItem,
  { kind: "watch_action"; proposal: unknown }
>;
export type WatchResult = Exclude<WatchItem["result"], "unavailable">;
type Request = WatchItem["proposal"]["request"];
type Receipt = NonNullable<WatchResult["receipt"]>;
const targets = {
  legiwatch_keyword: {
    targetKind: "keyword_rule",
    targetKey: "00000000-0000-4000-8000-000000000021",
  },
  business_development_prospect: {
    targetKind: "prospect",
    targetKey: "00000000-0000-4000-8000-000000000022",
  },
  defense_budget_target: { targetKind: "pe", targetKey: "PE0601234A" },
  client_watchlist: {
    targetKind: "client_tracker_watchlist",
    targetKey: "00000000-0000-4000-8000-000000000019",
  },
} satisfies Record<
  Request["family"],
  { targetKind: string; targetKey: string }
>;
export function watchFixture(
  family: Request["family"] = "legiwatch_keyword",
  operation: Request["operation"] = "pause",
): WatchItem {
  const seed = legiwatchFixture(),
    clientId = "00000000-0000-4000-8000-000000000019";
  const request: Request = {
    family,
    clientId,
    ...targets[family],
    operation,
    expectedVersion: 2,
    sourceRevision: family === "legiwatch_keyword" ? "preview-current-2" : null,
    reason:
      family === "defense_budget_target"
        ? "Synthetic client priority 界"
        : null,
    enabled: operation === "set_delivery" ? false : null,
    requestKey: "meri-watch-" + "a".repeat(64),
  };
  const bound: Omit<WatchItem["proposal"], "commandSha256"> = {
    kind: "watch_action",
    operation: "watch_action",
    proposalId: seed.proposal.proposalId,
    binding: seed.proposal.binding,
    scopes: [
      { ...seed.proposal.scopes[0], kind: "client", resourceId: clientId },
    ],
    request,
    context: { ...seed.proposal.context, selectedClientId: clientId },
    createdAt: seed.createdAt,
    expiresAt: seed.proposal.expiresAt,
  };
  const proposal = { ...bound, commandSha256: canonicalSha256(bound) };
  return {
    deliveryId: seed.deliveryId,
    createdAt: seed.createdAt,
    operation: { id: "watch_action", version: "0.2.0" },
    state: "prepared",
    kind: "watch_action",
    proposal,
    result: {
      version: "0.1.0",
      proposalId: proposal.proposalId,
      request,
      context: proposal.context,
      createdAt: proposal.createdAt,
      expiresAt: proposal.expiresAt,
      status: "proposed",
      receipt: null,
    },
  };
}
export function watchResult(
  item: WatchItem,
  status: WatchResult["status"],
  state: Receipt["state"] = "paused",
  deliveryEnabled: Receipt["deliveryEnabled"] = true,
): WatchItem {
  if (item.result === "unavailable")
    throw Error("Synthetic fixture has no owner result");
  const request = item.proposal.request;
  const receipt: Receipt = {
    request,
    owner: request.family,
    binding: createHash("sha256")
      .update(
        JSON.stringify({
          family: request.family,
          clientId: request.clientId,
          targetKind: request.targetKind,
          targetKey: request.targetKey,
          operation: request.operation,
          expectedVersion: request.expectedVersion,
        }),
      )
      .digest("hex"),
    operation: request.operation,
    targetKey: request.targetKey,
    identity:
      request.family === "defense_budget_target"
        ? "synthetic-budget-watch-1"
        : request.targetKey,
    state,
    version: [
      "business_development_prospect",
      "defense_budget_target",
    ].includes(request.family)
      ? null
      : 3,
    deliveryEnabled,
    eventId:
      request.family === "defense_budget_target"
        ? "synthetic-owner-event-1"
        : null,
    alreadyInState: false,
  };
  return {
    ...item,
    result: {
      ...item.result,
      status,
      receipt: status === "succeeded" ? receipt : null,
    },
  };
}
export function watchDecision(
  item: WatchItem,
  decision: "approved" | "rejected" = "approved",
) {
  return {
    conversationId: item.proposal.binding.conversationId,
    deliveryId: item.deliveryId,
    proposalId: item.proposal.proposalId,
    commandSha256: item.proposal.commandSha256,
    decision,
  };
}
export function watchDecisionResponse(item: WatchItem) {
  if (item.result === "unavailable")
    throw Error("Synthetic fixture has no owner result");
  return {
    status: "watch_decided" as const,
    deliveryId: item.deliveryId,
    proposalId: item.proposal.proposalId,
    result: item.result,
  };
}

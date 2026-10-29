import type { IntentsItem } from "@capiro/meri-client/intents";
import { canonicalSha256 } from "./meri-action-wire-fixtures";
import { legiwatchFixture } from "./meri-legiwatch-fixture";

export type LegislativeItem = Extract<
  IntentsItem,
  { kind: "legislative_document_action"; proposal: unknown }
>;
export type LegislativeResult = Exclude<
  LegislativeItem["result"],
  "unavailable"
>;
export function legislativeDocumentFixture(
  status: LegislativeResult["status"] = "proposed",
  briefing = false,
  effect: "complete" | "selection_only" = "complete",
): LegislativeItem {
  const seed = legiwatchFixture();
  const request: LegislativeItem["proposal"]["request"] = briefing
    ? {
        requestKey: "synthetic-briefing-request",
        clientId: null,
        folderId: "00000000-0000-4000-8000-000000000019",
        template: "research_update",
        title: "Synthetic briefing",
        analysis: "Literal <script>source</script> analysis",
        cutoff: "2026-10-27T00:00:00.000Z",
        timezone: "America/New_York",
        sources: [{ kind: "news", id: "source-1", revision: "revision-1" }],
        citations: [
          {
            kind: "news",
            id: "source-1",
            revision: "revision-1",
            locator: "body",
            start: 0,
            end: 4,
            quote: "text",
          },
        ],
      }
    : {
        requestKey: "synthetic-research-request",
        clientId: null,
        folderId: null,
        jurisdiction: "FL",
        sessionKey: "2026-regular",
        title: "Synthetic research",
        analysis: "Exact research analysis",
        allowCrossBill: true,
        rightSessionKey: "2026-special",
        documents: [
          {
            id: "document-1",
            revision: "revision-2",
            sessionKey: "2026-special",
          },
        ],
        citations: [
          {
            documentId: "document-1",
            revision: "revision-2",
            locator: "section-1",
            start: 2,
            end: 6,
            quote: "text",
          },
        ],
      };
  const operation = briefing
    ? "prepare_legiwatch_briefing"
    : "save_legislative_research";
  const bound: Omit<LegislativeItem["proposal"], "commandSha256"> = {
    kind: "legislative_document_action",
    operation,
    proposalId: seed.proposal.proposalId,
    binding: seed.proposal.binding,
    scopes: seed.proposal.scopes,
    request,
    context: seed.proposal.context,
    createdAt: seed.createdAt,
    expiresAt: seed.proposal.expiresAt,
  };
  const proposal = { ...bound, commandSha256: canonicalSha256(bound) };
  return {
    state: "prepared",
    kind: "legislative_document_action",
    operation: { id: operation, version: "0.2.0" },
    deliveryId: seed.deliveryId,
    createdAt: seed.createdAt,
    proposal,
    result: {
      version: "0.1.0",
      proposalId: proposal.proposalId,
      operation,
      request,
      context: proposal.context,
      createdAt: proposal.createdAt,
      expiresAt: proposal.expiresAt,
      status,
      effect:
        status === "succeeded"
          ? effect
          : status === "outcome_unknown"
            ? "unknown"
            : null,
      receipt:
        status === "succeeded"
          ? {
              state: effect,
              selectionId: "selection-1",
              documentId: effect === "complete" ? "draft-1" : null,
              location:
                effect === "complete" ? "/workspace/draft/draft-1" : null,
              reused: false,
              request,
            }
          : null,
    },
  };
}
export function legislativeDecision(
  item: LegislativeItem,
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
export function legislativeDecisionResponse(item: LegislativeItem) {
  if (item.result === "unavailable")
    throw Error("Synthetic fixture has no owner result");
  return {
    status: "legislative_document_decided" as const,
    deliveryId: item.deliveryId,
    proposalId: item.proposal.proposalId,
    result: item.result,
  };
}

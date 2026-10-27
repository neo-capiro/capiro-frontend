import { createHash } from "node:crypto";
import { canonicalSha256 } from "./meri-action-wire-fixtures";
import type {
  IntentsItem,
  IntentsLegiwatchProposal,
} from "@capiro/meri-client/intents";
export const conversationId = "00000000-0000-4000-8000-000000000001";
export const viewer = {
  tenantId: "synthetic-tenant",
  actorId: "synthetic-actor",
};
type Item = Extract<
  IntentsItem,
  { kind: "legiwatch_action"; proposal: unknown }
>;
export type Result = Exclude<Item["result"], "unavailable">;
type SuggestionRequest = Extract<
  IntentsLegiwatchProposal["request"],
  { action: unknown }
>;
type SuggestionReceipt = Extract<
  NonNullable<Result["receipt"]>,
  { payload: { action: unknown } }
>;
type SuggestionItem = Omit<Item, "proposal" | "result"> & {
  proposal: Omit<IntentsLegiwatchProposal, "request"> & {
    request: SuggestionRequest;
  };
  result: Omit<Result, "request" | "receipt"> & {
    request: SuggestionRequest;
    receipt: SuggestionReceipt | null;
  };
};
export function legiwatchFixture(
  status: Result["status"] = "proposed",
  outcome: SuggestionReceipt["outcome"] = "added",
): SuggestionItem {
  const createdAt = new Date(Date.now() - 1000).toISOString();
  const bound: Omit<SuggestionItem["proposal"], "commandSha256"> = {
    kind: "legiwatch_action",
    operation: "apply_legiwatch_suggestion",
    proposalId: "00000000-0000-4000-8000-000000000002",
    binding: {
      ...viewer,
      conversationId,
      runId: "00000000-0000-4000-8000-000000000003",
      attemptId: "00000000-0000-4000-8000-000000000004",
      workerId: "00000000-0000-4000-8000-000000000005",
      writerFence: 1,
    },
    scopes: [
      {
        tenantId: viewer.tenantId,
        kind: "private-user",
        resourceId: viewer.actorId,
        policyRevision: "p1",
      },
    ],
    request: {
      clientId: null,
      folderId: "00000000-0000-4000-8000-000000000006",
      jurisdiction: "US",
      sessionKey: "119",
      suggestionId: "00000000-0000-4000-8000-000000000007",
      expectedVersion: 2,
      action: "add",
      requestKey: "meri-legiwatch-" + "a".repeat(64),
    },
    context: {
      conversationId,
      selectedClientId: null,
      identityRevision: "a".repeat(64),
      membershipRevision: "b".repeat(64),
      contextRevision: "c".repeat(64),
    },
    createdAt,
    expiresAt: new Date(Date.now() + 60000).toISOString(),
  };
  const proposal = { ...bound, commandSha256: canonicalSha256(bound) };
  return {
    deliveryId: `sdk:${"1".repeat(64)}`,
    createdAt,
    operation: { id: bound.operation, version: "0.2.0" },
    state: "prepared",
    kind: "legiwatch_action",
    proposal,
    result: {
      version: "0.1.0",
      proposalId: proposal.proposalId,
      request: proposal.request,
      context: proposal.context,
      createdAt,
      expiresAt: proposal.expiresAt,
      status,
      receipt:
        status === "succeeded"
          ? {
              request: proposal.request,
              outcome,
              payload: {
                binding: createHash("sha256")
                  .update(
                    JSON.stringify({
                      id: proposal.request.suggestionId,
                      expected: proposal.request.expectedVersion,
                      action: proposal.request.action,
                    }),
                  )
                  .digest("hex"),
                suggestionId: proposal.request.suggestionId,
                decisionId: null,
                version: 3,
                action: proposal.request.action,
              },
            }
          : null,
    },
  };
}

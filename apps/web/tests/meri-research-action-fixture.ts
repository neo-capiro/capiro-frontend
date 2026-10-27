import type {
  IntentsItem,
  IntentsResearchActionProposal,
} from "@capiro/meri-client/intents";
import { canonicalSha256 } from "./meri-action-wire-fixtures";
import { conversationId, viewer } from "./meri-legiwatch-fixture";
export type ResearchActionItem = Extract<
  IntentsItem,
  { kind: "research_action"; proposal: unknown }
>;
export type ResearchActionDecided = Exclude<
  ResearchActionItem["result"],
  "unavailable"
>;
const KEY = "meri-rp-" + "a".repeat(64);
const clientId = "00000000-0000-4000-8000-000000000019";
const requests = {
  create_research_portfolio_snapshot: {
    conversationId,
    name: "Q1 review 界",
    expectedRevision: 3,
    operationKey: KEY,
  },
  manage_research_portfolio: {
    conversationId,
    action: "portfolio_archive",
    parameters: { expectedRevision: 3, idempotencyKey: KEY },
    confirmed: true,
  },
  save_research_portfolio_output_to_client: {
    conversationId,
    outputId: "00000000-0000-4000-8000-000000000031",
    clientId,
    operationKey: KEY,
  },
  prepare_research_portfolio_meeting: {
    conversationId,
    confirmed: true,
    selectedReviewIds: ["00000000-0000-4000-8000-000000000041"],
    operationKey: KEY,
  },
} as const;
type Operation = keyof typeof requests;
export function researchActionFixture(
  operation: Operation = "create_research_portfolio_snapshot",
  { selected = operation === "save_research_portfolio_output_to_client" } = {},
): ResearchActionItem {
  const createdAt = new Date(Date.now() - 1000).toISOString();
  const bound: Omit<IntentsResearchActionProposal, "commandSha256"> = {
    kind: "research_action",
    operation,
    proposalId: "00000000-0000-4000-8000-000000000012",
    binding: {
      ...viewer,
      conversationId,
      runId: "00000000-0000-4000-8000-000000000003",
      attemptId: "00000000-0000-4000-8000-000000000004",
      workerId: "00000000-0000-4000-8000-000000000005",
      writerFence: 1,
    },
    scopes: [
      selected
        ? {
            tenantId: viewer.tenantId,
            kind: "client",
            resourceId: clientId,
            policyRevision: "p1",
          }
        : {
            tenantId: viewer.tenantId,
            kind: "private-user",
            resourceId: viewer.actorId,
            policyRevision: "p1",
          },
    ],
    request: requests[operation],
    preview: {
      label: "Create a Research Portfolio snapshot",
      portfolioId: "00000000-0000-4000-8000-000000000021",
      ...(selected ? { clientName: "Synthetic client" } : {}),
    },
    createdAt,
    expiresAt: new Date(Date.now() + 600_000).toISOString(),
  };
  const proposal = { ...bound, commandSha256: canonicalSha256(bound) };
  return {
    deliveryId: "sdk:" + "b".repeat(64),
    createdAt,
    operation: { id: operation, version: "0.2.0" },
    state: "prepared",
    kind: "research_action",
    proposal,
    result: { proposalStatus: "proposed" },
  };
}
export function researchActionResult(
  item: ResearchActionItem,
  proposalStatus: ResearchActionDecided["proposalStatus"],
  resultSummary?: ResearchActionDecided["resultSummary"],
): ResearchActionItem {
  return {
    ...item,
    result: {
      proposalStatus,
      ...(resultSummary === undefined ? {} : { resultSummary }),
    },
  };
}

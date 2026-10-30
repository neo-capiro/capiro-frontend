import type { IntentsItem } from "@capiro/meri-client/intents";

export type BrowserItem = Extract<
  IntentsItem,
  { kind: "browser_action"; proposal: unknown }
>;

export const browserConversationId = "00000000-0000-4000-8000-000000000001";
const run = {
  tenantId: "tenant",
  actorId: "actor",
  conversationId: browserConversationId,
  runId: "00000000-0000-4000-8000-000000000003",
  attemptId: "00000000-0000-4000-8000-000000000004",
  workerId: "00000000-0000-4000-8000-000000000005",
  writerFence: 1,
};

/** A retained browser preparation as the public list hands it to the conversation UI. */
export function browserFixture(expiresInMs = 600_000): BrowserItem {
  const createdAt = new Date().toISOString();
  return {
    deliveryId: "browser:" + "e".repeat(64),
    createdAt,
    operation: { id: "browser_approval_preparation", version: "0.2.0" },
    state: "prepared",
    kind: "browser_action",
    proposal: {
      kind: "browser_action",
      proposalId: "00000000-0000-4000-8000-000000000002",
      subjectSha256: "a".repeat(64),
      operation: { id: "browser_action", version: "0.2.0" },
      binding: run,
      display: {
        tool: "browser_click",
        pageOrigin: "https://app.capiro.example",
        server: "capiov2-browser",
        inputSha256: "b".repeat(64),
        policySha256: "c".repeat(64),
      },
      requiredApprover: { tenantId: "tenant", actorId: "actor" },
      scopes: [
        {
          tenantId: "tenant",
          kind: "private-user",
          resourceId: "actor",
          policyRevision: "p1",
        },
      ],
      requestedAtMs: Date.now(),
      expiresAtMs: Date.now() + expiresInMs,
      createdAt,
    },
    decision: null,
    execution: null,
    phase: "awaiting_approval",
  } as unknown as BrowserItem;
}

/** The durable Core record the owner writes for the human's choice. */
export function browserDecided(
  item: BrowserItem,
  decision: "approved" | "rejected",
): BrowserItem {
  return {
    ...item,
    decision: {
      proposalId: item.proposal.proposalId,
      subjectSha256: item.proposal.subjectSha256,
      decision,
      decidedAt: new Date().toISOString(),
      approver: { ...item.proposal.requiredApprover },
      policyRevision: "p1",
    },
    phase: decision === "rejected" ? "rejected" : "approved",
  } as unknown as BrowserItem;
}

/** A later actual browser observation, read back with the status. */
export function browserExecuted(item: BrowserItem, outcome: "ok" | "error"): BrowserItem {
  return {
    ...item,
    execution: {
      state: "completed",
      outcome,
      reference: outcome === "ok" ? "downloads/r-1" : null,
    },
  } as unknown as BrowserItem;
}

export function browserDecisionResponse(item: BrowserItem) {
  if (!item.decision || item.decision === "unavailable")
    throw Error("Synthetic fixture has no recorded decision");
  return {
    status:
      item.decision.decision === "rejected"
        ? ("browser_rejected" as const)
        : ("browser_decision_recorded" as const),
    deliveryId: item.deliveryId,
    proposalId: item.proposal.proposalId,
    decision: item.decision,
  };
}

/** The exact decide body this browser proposal must produce. */
export function browserDecision(item: BrowserItem, decision = "approved") {
  return {
    conversationId: browserConversationId,
    deliveryId: item.deliveryId,
    proposalId: item.proposal.proposalId,
    subjectSha256: item.proposal.subjectSha256,
    decision,
  };
}

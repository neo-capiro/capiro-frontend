import { draft as prospectDraft } from "./prospect-resources-fixtures";
export const sessionId = "80000000-0000-4000-8000-000000000001";
export const versionId = "90000000-0000-4000-8000-000000000001";
export const draft = {
  ...prospectDraft,
  prospectId: null,
  product: "Newsletter",
  docTitle: "Current working title",
};
export const revision = {
  draftId: draft.id,
  versionId,
  authorId: "test-user",
  authorKind: "human",
  savedAt: "2026-10-12T12:00:00.000Z",
  snapshotHash: "a".repeat(64),
  hashFormat: "workspace-snapshot-canonical-json-v1" as const,
  clientId: null as string | null,
  snapshot: { docTitle: "Saved subject", config: {}, documents: [] },
  contentSkeleton: {
    subject: "Saved subject",
    body: "Saved revision plaintext. Synthetic test content.",
    slots: [] as never[],
  },
};
export const version = {
  id: versionId,
  draftId: draft.id,
  label: "Saved policy revision",
  authorId: revision.authorId,
  authorKind: revision.authorKind,
  createdAt: revision.savedAt,
};
export const session = {
  session: {
    id: sessionId,
    title: "Synthetic template campaign",
    status: "active",
    currentStateVersion: 3,
    createdAt: "2026-10-08T12:00:00Z",
    updatedAt: "2026-10-08T12:00:00Z",
    archivedAt: null,
  },
  currentStateVersion: 3,
  specHash: "abc",
  pendingProposalCount: 0,
  spec: {
    goal: {
      goal: "Test goal",
      objective: "Test objective",
      topic: "Test campaign topic",
      desiredOutcome: null,
      ask: { mode: "none", text: null },
      whyNow: null,
    },
    sponsor: { kind: "firm", label: "Test Firm", clientRefs: [] },
    strategy: {
      campaignAngle: null,
      tone: "Professional",
      length: "short",
      customLengthInstruction: null,
    },
    delivery: { pattern: "uniform_separate", personalization: "none" },
    targeting: { selectedTargetRefs: [] },
  },
  readiness: {
    goalReady: true,
    sponsorResolved: true,
    targetCriteriaReady: false,
    targetsReady: false,
    deliveryReady: true,
    contextReady: false,
    contextEvidenceReady: false,
    strategyReady: false,
    sampleGenerationEligible: false,
    fullGenerationEligible: false,
    sendReviewEligible: false,
    blockers: ["TARGETS_MISSING", "CONTEXT_NOT_REVIEWED"],
  },
};
export function receipt(
  body: {
    requestId: string;
    draftId: string;
    versionId: string;
    snapshotHash: string;
    expectedStateVersion: number;
  },
  replayed = false,
) {
  const { snapshot: _snapshot, contentSkeleton: _content, ...saved } = revision;
  void _snapshot;
  void _content;
  return {
    status: "applied" as const,
    batchId: body.requestId,
    stateVersion: body.expectedStateVersion + 1,
    specHash: "b".repeat(64),
    changed: true,
    commandCount: 1 as const,
    replayed,
    receiptId: "a0000000-0000-4000-8000-000000000001",
    staged: {
      ...saved,
      ...body,
      kind: "workspace_saved_newsletter_v1" as const,
      requestHash: "c".repeat(64),
      commandHash: "d".repeat(64),
    },
  };
}

import { draft as prospectDraft } from "./prospect-resources-fixtures";
import type { StagingIntent } from "../src/features/modules/workspace/newsletter/staging-model";
export const sessionId = "80000000-0000-4000-8000-000000000001";
export const versionId = "90000000-0000-4000-8000-000000000001";
export const draft = {
  ...prospectDraft,
  prospectId: null,
  clientId: null,
  product: "Newsletter",
  docTitle: "Current working title",
};
export const revision = {
  draftId: draft.id,
  versionId,
  authorId: "test-user",
  authorKind: "human",
  savedAt: "2026-10-12T12:00:00.000Z",
  snapshotHash:
    "d4d4651f36bd65cc2883b55bf27a9c0feae6f396609652f0f3924891bbaa1a41",
  hashFormat: "workspace-snapshot-canonical-json-v1" as const,
  clientId: null as string | null,
  projectionVersion: "workspace-newsletter-plaintext-v2" as const,
  // Core144's committed non-ASCII producer fixture, not a frontend-computed hash.
  projectionHash:
    "18fecd93ba5bf68d1e79bb02f08cb722a7e47b70f69238879a215cc62001fd42",
  snapshot: {
    docTitle: "Document label",
    config: { product: "Newsletter" },
    documents: [
      {
        body: {
          newsletter: {
            subject: "  Résumé — 日本語  ",
            preview: "preview",
            firmName: "Synthetic",
            mailingAddress: "Synthetic address",
            blocks: [
              {
                id: "paragraph",
                kind: "paragraph",
                text: "Hello café\r\n日本語  ",
              },
            ],
          },
          blocks: [{ content: "Historical generic body" }],
        },
      },
    ],
  },
  contentSkeleton: {
    subject: "Résumé — 日本語",
    body: "Hello café\n日本語",
    slots: [] as never[],
  },
};
// Captured from the same installed public producer as the non-ASCII fixture.
export const emptyRevision = {
  ...revision,
  snapshotHash:
    "f84787ea01aecc764e4ea3a719dd29b0619b85b8afc2924d0d659bdba44d2593",
  projectionHash:
    "4a3dd8c876ba8c47e5d16f8e5091fea39dc5a84ae30df32f6dab0e9a1c1700d4",
  snapshot: {
    ...revision.snapshot,
    documents: [
      {
        body: {
          ...revision.snapshot.documents[0]!.body,
          newsletter: {
            ...revision.snapshot.documents[0]!.body.newsletter,
            subject: "",
          },
        },
      },
    ],
  },
  contentSkeleton: { ...revision.contentSkeleton, subject: "" },
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
export function receipt(body: StagingIntent["body"], replayed = false) {
  const {
    snapshot: _snapshot,
    contentSkeleton: _content,
    projectionVersion: _projectionVersion,
    projectionHash: _projectionHash,
    ...saved
  } = revision;
  void _snapshot;
  void _content;
  void _projectionVersion;
  void _projectionHash;
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

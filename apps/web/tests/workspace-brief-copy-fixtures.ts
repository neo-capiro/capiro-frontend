import type {
  BriefCopySource,
  BriefCopyState,
  BriefCopyDetail,
  BriefCopyResult,
} from "../src/shared/capiro/operations/workspace-brief-copy";
import type { CopyIntent } from "../src/features/modules/workspace/brief-copy/intent";
import { testIdentity } from "../test/browser/fixtures";
export const copyIds = {
  prospect: "30000000-0000-4000-8000-000000000001",
  brief: "30000000-0000-4000-8000-000000000002",
  version: "30000000-0000-4000-8000-000000000003",
  draft: "30000000-0000-4000-8000-000000000004",
  document: "30000000-0000-4000-8000-000000000005",
  request: "30000000-0000-4000-8000-000000000006",
  other: "30000000-0000-4000-8000-000000000007",
};
export const copySource: BriefCopySource = {
  kind: "core_prospect_brief_version",
  prospectId: copyIds.prospect,
  briefId: copyIds.brief,
  versionId: copyIds.version,
  versionNumber: 2,
  sectionsHash: "a".repeat(64),
  snapshotHash: "b".repeat(64),
};
export const copyScope = {
  actor: {
    tenantId: testIdentity.tenant.id,
    userId: testIdentity.user.id,
    ownerId: testIdentity.user.clerkUserId,
  },
  draftId: copyIds.draft,
  prospectId: copyIds.prospect,
  clientId: null,
};
export const copyState: BriefCopyState = {
  schemaVersion: 1,
  tenantId: testIdentity.tenant.id,
  draftId: copyIds.draft,
  prospectId: copyIds.prospect,
  clientId: null,
  stateHash: "c".repeat(64),
  hashFormat: "workspace-prospect-draft-state-v1",
  documents: [
    {
      id: copyIds.document,
      name: "Core brief copy — version 2",
      sourceBriefVersion: copySource,
    },
  ],
};
export const copyBody = {
  blocks: [
    {
      id: "section-a",
      type: "section" as const,
      title: "Original Core section",
      content: "Original text",
      marks: [{ from: 0, to: 8, mark: "reviewed" }],
    },
    {
      id: "table-a",
      type: "table" as const,
      cells: [[{ text: "Retained cell", span: 2 }]],
      widths: [100, 200],
    },
    {
      id: "photo-a",
      type: "photo" as const,
      image: { url: "https://example.test/private.png", alt: "Saved diagram" },
    },
  ],
  ordering: { flow: "exact" },
  newsletter: { arbitraryRichField: true },
};
export const copyDetail: BriefCopyDetail = {
  ...copyState,
  document: {
    id: copyIds.document,
    name: "Core brief copy — version 2",
    ordinal: 1,
    body: copyBody,
    sourceBriefVersion: copySource,
    createdAt: "2026-10-13T00:00:00Z",
    updatedAt: "2026-10-13T00:00:00Z",
  },
  sourceEvidence: {
    sections: Object.fromEntries(
      [
        "companyAndFirmImplication",
        "verifiedEvidence",
        "judgment",
        "practicalAction",
        "missingInformation",
      ].map((key) => [
        key,
        { text: `Saved ${key}`, provenance: "edited", citationIndexes: [] },
      ]),
    ),
    citations: [],
    sourceSnapshot: {
      generatedAt: "2026-10-13T00:00:00Z",
      identityBasis: "Synthetic",
      canonicalEntityId: null,
      canonicalName: null,
      evidence: [],
    },
  },
};
export const copyIntent: CopyIntent = {
  source: copySource,
  command: {
    kind: "copy",
    body: {
      requestId: copyIds.request,
      expectedStateHash: copyState.stateHash,
      expectedClientId: null,
      source: copySource,
    },
  },
};
export const saveIntent: CopyIntent = {
  source: copySource,
  command: {
    kind: "save",
    documentId: copyIds.document,
    body: {
      requestId: copyIds.request,
      expectedStateHash: copyState.stateHash,
      expectedClientId: null,
      body: copyBody,
      name: "Copied tab edited",
    },
  },
};
export function copyResult(
  operation: "copy_core_brief" | "save_brief_copy" = "copy_core_brief",
): BriefCopyResult {
  return {
    schemaVersion: 1,
    replayed: false,
    receipt: {
      tenantId: copyScope.actor.tenantId,
      draftId: copyIds.draft,
      prospectId: copyIds.prospect,
      operation,
      requestId: copyIds.request,
      requestHash: "d".repeat(64),
      actorId: copyScope.actor.ownerId,
      documentId: copyIds.document,
      clientId: null,
      source: copySource,
      stateHash: "e".repeat(64),
      versionId: copyIds.request,
      snapshotHash: "f".repeat(64),
      hashFormat: "workspace-snapshot-canonical-json-v1",
    },
  };
}

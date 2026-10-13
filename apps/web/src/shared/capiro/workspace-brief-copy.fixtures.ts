// Synthetic examples bound to capirov2@e0446e3f865899b03d654657db903cea54dfaf0a.
// No private backend code, canonical hashing or authorization algorithm is copied.
export const ids = {
  tenant: "a1000000-0000-4000-8000-000000000001",
  draft: "a1000000-0000-4000-8000-000000000002",
  prospect: "a1000000-0000-4000-8000-000000000003",
  brief: "a1000000-0000-4000-8000-000000000004",
  version: "a1000000-0000-4000-8000-000000000005",
  document: "a1000000-0000-4000-8000-000000000006",
  request: "a1000000-0000-4000-8000-000000000007",
  client: "a1000000-0000-4000-8000-000000000008",
};
export const source = {
  kind: "core_prospect_brief_version",
  prospectId: ids.prospect,
  briefId: ids.brief,
  versionId: ids.version,
  versionNumber: 7,
  sectionsHash: "a".repeat(64),
  snapshotHash: "b".repeat(64),
};
export const richBody = {
  blocks: [
    {
      id: "section-1",
      type: "section",
      title: "Synthetic source",
      content: "<p>Text</p>",
      marks: [{ type: "bold", range: [0, 4] }],
      attrs: { align: "left" },
    },
    {
      id: "table-1",
      type: "table",
      rows: [[{ text: "Preserve", marks: ["italic"], width: 120 }]],
      header: true,
    },
    {
      id: "photo-1",
      type: "photo",
      image: {
        src: "https://synthetic.example.test/image.png",
        alt: "Synthetic image",
      },
      crop: [0, 0, 1, 1],
    },
    {
      id: "logo-1",
      type: "logo",
      asset: { key: "synthetic-logo", scale: 0.75 },
    },
  ],
  theme: { family: "Synthetic", spacing: [0, 4, 8], showHeader: false },
  futureRichField: { exact: null, nested: [{ preserve: "all JSON" }] },
};
export const createBody = {
  requestId: ids.request,
  expectedStateHash: "c".repeat(64),
  expectedClientId: null,
  source,
};
export const saveBody = {
  requestId: ids.request,
  expectedStateHash: "c".repeat(64),
  expectedClientId: null,
  body: richBody,
  name: "Synthetic pinned copy",
  ordinal: 0,
  docTitle: "Synthetic Workspace draft",
  label: "Synthetic saved version",
};
const common = {
  schemaVersion: 1,
  tenantId: ids.tenant,
  draftId: ids.draft,
  prospectId: ids.prospect,
  clientId: null,
  stateHash: "c".repeat(64),
  hashFormat: "workspace-prospect-draft-state-v1",
};
export const state = {
  ...common,
  documents: [
    {
      id: ids.document,
      name: "Synthetic pinned copy",
      sourceBriefVersion: source,
    },
    {
      id: ids.version,
      name: "Synthetic ordinary tab",
      sourceBriefVersion: null,
    },
  ],
};
export const legacyDocument = {
  id: ids.document,
  draftId: ids.draft,
  name: "Synthetic pinned copy",
  ordinal: 0,
  body: richBody,
  sourceBriefVersion: source,
  createdAt: "2026-10-13T00:00:00.000Z",
  updatedAt: "2026-10-13T01:00:00.000Z",
};
export const detail = {
  ...common,
  document: {
    id: ids.document,
    name: legacyDocument.name,
    ordinal: 0,
    body: richBody,
    sourceBriefVersion: source,
    createdAt: legacyDocument.createdAt,
    updatedAt: legacyDocument.updatedAt,
  },
  sourceEvidence: {
    sections: {
      companyAndFirmImplication: {
        text: "Saved original implication",
        provenance: "generated",
        citationIndexes: [0],
      },
      verifiedEvidence: {
        text: "Saved original evidence",
        provenance: "generated",
        citationIndexes: [0],
      },
      judgment: {
        text: "Saved original judgment",
        provenance: "edited",
        citationIndexes: [],
      },
      practicalAction: {
        text: "Saved original action",
        provenance: "generated",
        citationIndexes: [],
      },
      missingInformation: {
        text: "Saved original limitations",
        provenance: "generated",
        citationIndexes: [],
      },
    },
    citations: [
      {
        id: "synthetic-citation",
        label: "Preserve citation",
        nested: { extra: true },
      },
    ],
    sourceSnapshot: {
      originalVersion: 7,
      nested: { complete: [1, "two", null] },
    },
  },
};
export function result(operation: "copy_core_brief" | "save_brief_copy") {
  return {
    schemaVersion: 1,
    replayed: false,
    receipt: {
      tenantId: ids.tenant,
      draftId: ids.draft,
      prospectId: ids.prospect,
      operation,
      requestId: ids.request,
      requestHash: "d".repeat(64),
      actorId: "user_syntheticClerkActor",
      documentId: ids.document,
      clientId: null,
      source,
      stateHash: "e".repeat(64),
      versionId: ids.request,
      snapshotHash: "f".repeat(64),
      hashFormat: "workspace-snapshot-canonical-json-v1",
    },
  };
}
export const cases = [
  {
    key: "workspace.brief-copy.state",
    method: "GET",
    path: `/drafts/${ids.draft}/documents/brief-copy-state`,
    input: { params: { draftId: ids.draft } },
    response: state,
  },
  {
    key: "workspace.brief-copy.detail",
    method: "GET",
    path: `/drafts/${ids.draft}/documents/${ids.document}/brief-copy`,
    input: { params: { draftId: ids.draft, docId: ids.document } },
    response: detail,
  },
  {
    key: "workspace.brief-copy.create",
    method: "POST",
    path: `/drafts/${ids.draft}/documents/core-brief-copy`,
    input: { params: { draftId: ids.draft }, body: createBody },
    response: result("copy_core_brief"),
  },
  {
    key: "workspace.brief-copy.save",
    method: "POST",
    path: `/drafts/${ids.draft}/documents/${ids.document}/brief-copy-save`,
    input: {
      params: { draftId: ids.draft, docId: ids.document },
      body: saveBody,
    },
    response: result("save_brief_copy"),
  },
] as const;

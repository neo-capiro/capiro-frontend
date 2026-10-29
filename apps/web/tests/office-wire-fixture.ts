import type { OfficeSnapshot } from "@capiro/meri-contracts/office-application";
export const officeIds = {
  versionId: "11111111-1111-4111-8111-111111111111",
  draftId: "22222222-2222-4222-8222-222222222222",
  editorId: "33333333-3333-4333-8333-333333333333",
  conversationId: "44444444-4444-4444-8444-444444444444",
};
export const officeCredential = `action_session_${"a".repeat(43)}`;
export const officeWireSnapshot = (): OfficeSnapshot => ({
  schema: "meri.office-application/1",
  draft: {
    draftId: officeIds.draftId,
    conversationId: officeIds.conversationId,
    artifactId: "55555555-5555-4555-8555-555555555555",
    baseVersionId: officeIds.versionId,
    baseSha256: "a".repeat(64),
    format: "docx",
    filename: "Draft.docx",
    sequence: 0,
    sha256: null,
    byteLength: 0,
    state: "draft",
    publishIntent: null,
    publishedVersionId: null,
    savedAt: "2026-10-29T00:00:00.000Z",
    expiresAt: "2026-11-05T00:00:00.000Z",
  },
  editor: { editorId: null, epoch: 0, expiresAt: null },
  launch: null,
});

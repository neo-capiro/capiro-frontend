export const prospectId = "30000000-0000-4000-8000-000000000001";
export const actor = {
  tenantId: "20000000-0000-4000-8000-000000000001",
  userId: "10000000-0000-4000-8000-000000000001",
};
export const requestId = "40000000-0000-4000-8000-000000000001";
export const otherId = "90000000-0000-4000-8000-000000000001";
export const checksum =
  "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824";
export const attachment = {
  id: "50000000-0000-4000-8000-000000000001",
  tenantId: actor.tenantId,
  prospectId,
  clientId: null,
  meetingId: null,
  mailMessageId: null,
  fileName: "test.txt",
  contentType: "text/plain",
  byteSize: 5,
  source: "manual",
  folder: null,
  viewerMode: "all",
  viewerUserIds: [],
  uploadedByUserId: actor.userId,
  createdAt: "2026-10-12T12:00:00Z",
  lifecycleStatus: "quarantined",
  scanStatus: "pending",
  extractionStatus: "pending",
  indexedAt: null,
  s3Key: "tenants/synthetic/engagement/test.txt",
  checksumSha256: checksum,
  calculatedSha256: checksum,
};
export const draft = {
  id: "60000000-0000-4000-8000-000000000001",
  tenantId: actor.tenantId,
  prospectId,
  ownerId: "test-user",
  docTitle: "Synthetic prospect document",
  client: null,
  product: null,
  industry: null,
  status: "draft" as const,
  updatedAt: "2026-10-12T12:00:00Z",
  createdAt: "2026-10-12T12:00:00Z",
  config: {
    sections: [] as string[],
    sectionContent: {} as Record<string, string>,
  },
  documents: [
    {
      id: "70000000-0000-4000-8000-000000000001",
      draftId: "60000000-0000-4000-8000-000000000001",
      name: "Main document",
      ordinal: 0,
      body: { blocks: [] },
      createdAt: "2026-10-12T12:00:00Z",
      updatedAt: "2026-10-12T12:00:00Z",
    },
  ],
};

import type { MemoryRetentionPolicyRead } from "../src/shared/capiro/operations/memory-retention-policy";
export const policyRead: MemoryRetentionPolicyRead = {
  schemaVersion: 1,
  owner: {
    tenantId: "10000000-0000-4000-8000-000000000001",
    userId: "20000000-0000-4000-8000-000000000001",
  },
  observedAt: "2026-10-29T06:00:00.000Z",
  policy: {
    version: 1,
    personalAfterOffboardingHours: 720,
    clientAfterClosureHours: 2160,
    draftAfterCreationHours: 720,
    ownerClosureSuppressesImmediately: true,
    firmSurvivesAuthorDeparture: true,
    accessWithdrawal: "revoke_access_only",
    heldContent: "retain_held_and_required_lineage",
    receipts: "retain_content_free_identity",
    payloadStores: [
      "memory_candidate",
      "memory_items",
      "clio_memory",
      "context_embeddings",
    ],
    outsideScope: [
      "conversations",
      "uploads",
      "office_drafts",
      "filed_records",
    ],
  },
  requests: { export: "unavailable", deletion: "unavailable" },
};

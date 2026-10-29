import { z } from "zod";
import { defineOperation } from "../contracts";

export const memoryRetentionPolicyRead = z
  .object({
    schemaVersion: z.literal(1),
    owner: z.object({ tenantId: z.uuid(), userId: z.uuid() }).strict(),
    observedAt: z.iso.datetime(),
    policy: z
      .object({
        version: z.literal(1),
        personalAfterOffboardingHours: z.literal(720),
        clientAfterClosureHours: z.literal(2160),
        draftAfterCreationHours: z.literal(720),
        ownerClosureSuppressesImmediately: z.literal(true),
        firmSurvivesAuthorDeparture: z.literal(true),
        accessWithdrawal: z.literal("revoke_access_only"),
        heldContent: z.literal("retain_held_and_required_lineage"),
        receipts: z.literal("retain_content_free_identity"),
        payloadStores: z.tuple([
          z.literal("memory_candidate"),
          z.literal("memory_items"),
          z.literal("clio_memory"),
          z.literal("context_embeddings"),
        ]),
        outsideScope: z.tuple([
          z.literal("conversations"),
          z.literal("uploads"),
          z.literal("office_drafts"),
          z.literal("filed_records"),
        ]),
      })
      .strict(),
    requests: z
      .object({
        export: z.literal("unavailable"),
        deletion: z.literal("unavailable"),
      })
      .strict(),
  })
  .strict();
export type MemoryRetentionPolicyRead = z.infer<
  typeof memoryRetentionPolicyRead
>;
export const memoryCleanupRestrictionRead = z
  .object({
    schemaVersion: z.literal(1),
    owner: z.object({ tenantId: z.uuid(), userId: z.uuid() }).strict(),
    observedAt: z.iso.datetime(),
    check: z.literal("submission_receipt_disposition"),
    restriction: z.enum([
      "none",
      "legacy_receipt_disposition_required",
      "unavailable",
    ]),
  })
  .strict();
export type MemoryCleanupRestrictionRead = z.infer<
  typeof memoryCleanupRestrictionRead
>;
export const memoryRetentionPolicyOperations = {
  "memory.retentionPolicy.cleanupRestriction": defineOperation({
    service: "core",
    method: "GET",
    path: "/memory/retention-policy/cleanup-restriction",
    request: z.object({}).strict(),
    response: memoryCleanupRestrictionRead,
    source:
      "neo-capiro/capiro-backend@58274e76354ab020cc951b88499bbb5d87bcb61a apps/api/src/memory/memory-retention-policy.controller.ts; read-only canonical receipt disposition prerequisite",
  }),
  "memory.retentionPolicy.read": defineOperation({
    service: "core",
    method: "GET",
    path: "/memory/retention-policy",
    request: z.object({}).strict(),
    response: memoryRetentionPolicyRead,
    source:
      "neo-capiro/capiro-backend@3013f3d624688c2207d51ec1ee426c0fd005d2f2 apps/api/src/memory/memory-retention-policy.controller.ts; installed policy v1 projection",
  }),
} as const;

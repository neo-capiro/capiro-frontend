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
export const memoryRetentionPolicyOperations = {
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

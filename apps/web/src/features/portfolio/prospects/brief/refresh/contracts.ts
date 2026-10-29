import { z } from "zod";
import type {
  PrepareBriefRefreshInput,
  RetainedBriefRefreshIdentity,
} from "@capiro/shared/prospect-brief-refresh";
import {
  refreshSchema,
  citationSchema,
  versionSchema,
  sectionKeys,
} from "../contracts";
import type { RecoveryContract } from "@/shared/session/recovery/journal";
export const prepareSchema = z
  .object({
    proposalId: z.uuid(),
    expectedVersionNumber: z.number().int().min(1).max(100),
    keepUserEdits: z.boolean(),
  })
  .strict() satisfies z.ZodType<PrepareBriefRefreshInput>;
const identitySchema = prepareSchema.extend({
  tenantId: z.uuid(),
  prospectId: z.uuid(),
  briefId: z.uuid(),
  baseVersionId: z.uuid(),
  createdByUserId: z.uuid(),
  proposalHash: z.string().regex(/^[a-f0-9]{64}$/),
  sourceHash: z.string().regex(/^[a-f0-9]{64}$/),
  createdAt: z.iso.datetime(),
}) satisfies z.ZodType<RetainedBriefRefreshIdentity>;
export const retainedSchema = refreshSchema
  .and(identitySchema)
  .and(
    z.object({
      citations: z.array(citationSchema).max(12),
    }),
  )
  .refine(
    (p) =>
      p.baseVersionNumber === p.expectedVersionNumber &&
      sectionKeys.every(
        (k) =>
          p.proposed[k].citationIndexes.every((i) => i < p.citations.length) &&
          p.diff.find((d) => d.section === k)?.proposedText ===
            p.proposed[k].text,
      ),
    "The retained comparison does not match its proposed content",
  );
export type RetainedRefresh = z.infer<typeof retainedSchema>;
export const refreshResultSchema = z.object({
  proposal: retainedSchema,
  acceptedVersion: versionSchema.nullable(),
});
export const attemptSchema = z
  .object({
    request: prepareSchema,
    acceptHash: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .nullable(),
    refused: z.boolean(),
  })
  .strict();
export type RefreshAttempt = z.infer<typeof attemptSchema>;
export const refreshRecoveryContract: RecoveryContract<RefreshAttempt> = {
  schema: attemptSchema,
  requestId: (r) => r.request.proposalId,
  validateUpdate: (a, b) => {
    if (
      JSON.stringify(a.request) !== JSON.stringify(b.request) ||
      (a.acceptHash && a.acceptHash !== b.acceptHash)
    )
      throw Error("The retained refresh request cannot be replaced.");
  },
};

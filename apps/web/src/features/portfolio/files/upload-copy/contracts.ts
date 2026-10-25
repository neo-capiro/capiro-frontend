import { z } from "zod";
import type { RecoveryContract } from "@/shared/session/recovery/journal";

// Core fa6dd3b4: engagement/attachments/prospect-file-copy.input.ts and receipt.
const id = z
  .string()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  );
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const timestamp = z
  .string()
  .refine(
    (value) =>
      Number.isFinite(Date.parse(value)) &&
      new Date(value).toISOString() === value,
  );
export const prospectFileCopyCommandSchema = z.strictObject({
  schemaVersion: z.literal(1),
  requestId: id,
  prospectId: id,
  clientId: id,
  expectedProspectUpdatedAt: timestamp,
  sourceId: id,
  expectedRevision: z.number().int().min(0).max(2_147_483_646),
  checksumSha256: hash,
  contentLength: z
    .number()
    .int()
    .min(1)
    .max(25 * 1024 * 1024),
  folder: z
    .string()
    .trim()
    .max(120)
    .nullable()
    .transform((value) => value || null),
});
export type ProspectFileCopyCommand = z.infer<
  typeof prospectFileCopyCommandSchema
>;
export const prospectFileCopyReceiptSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    operation: z.literal("copy_prospect_upload"),
    tenantId: id,
    actorUserId: id,
    requestId: id,
    prospectId: id,
    clientId: id,
    payloadDigest: hash,
    status: z.enum(["pending", "completed"]),
    sourceId: id,
    expectedRevision: z.number().int().min(0).max(2_147_483_646),
    destinationId: id,
    createdAt: timestamp,
    completedAt: timestamp.nullable(),
    available: z.boolean(),
    result: z
      .strictObject({
        id,
        fileName: z.string().min(1),
        folder: z.string().nullable(),
        revision: z.number().int().min(0),
        lifecycleStatus: z.string().min(1),
        scanStatus: z.string().nullable(),
      })
      .nullable(),
  })
  .refine(
    (value) =>
      value.status === "pending"
        ? value.result === null &&
          value.completedAt === null &&
          !value.available
        : value.result?.id === value.destinationId &&
          value.completedAt !== null,
    "The copy receipt has inconsistent completion fields.",
  );
export type ProspectFileCopyReceipt = z.infer<
  typeof prospectFileCopyReceiptSchema
>;
export const prospectFileCopyAttemptSchema = z.strictObject({
  tenantId: id,
  userId: id,
  command: prospectFileCopyCommandSchema,
  payloadDigest: hash,
  clientName: z.string().min(1),
  fileName: z.string().min(1),
});
export type ProspectFileCopyAttempt = z.infer<
  typeof prospectFileCopyAttemptSchema
>;
export const prospectFileCopyRecoveryContract: RecoveryContract<ProspectFileCopyAttempt> =
  {
    schema: prospectFileCopyAttemptSchema,
    requestId: (value) => value.command.requestId,
  };

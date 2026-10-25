import { z } from "zod";
import type { ClientWriter } from "@/shared/portfolio/auth/client-writer";
import type { RecoveryContract } from "@/shared/session/recovery/journal";
// Core 53cfd2b167545d5728e2cfe5b1b819d684e19b26 engagement/attachments/client-file-delete:
// route identity is LAST in the canonical command.
const id = z
  .string()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  );
const revision = z.number().int().min(0).max(2_147_483_646);
export const fileDeletionBodySchema = z.strictObject({
  schemaVersion: z.literal(1),
  requestId: id,
  clientId: id,
  expectedRevision: revision,
});
export const fileDeletionCommandSchema = fileDeletionBodySchema.extend({
  attachmentId: id,
});
export type FileDeletionCommand = z.infer<typeof fileDeletionCommandSchema>;
export const fileDeletionReceiptSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    operation: z.literal("delete_client_file"),
    tenantId: id,
    actorUserId: id,
    requestId: id,
    clientId: id,
    attachmentId: id,
    expectedRevision: revision,
    payloadDigest: z.string().regex(/^[a-f0-9]{64}$/),
    status: z.enum(["pending", "completed"]),
    createdAt: z.iso.datetime({ offset: true }),
    completedAt: z.iso.datetime({ offset: true }).nullable(),
    result: z
      .strictObject({
        attachmentId: id,
        objectAbsent: z.literal(true),
        indexedChunksAbsent: z.literal(true),
      })
      .nullable(),
  })
  .refine(
    (value) =>
      value.status === "pending"
        ? value.result === null && value.completedAt === null
        : value.result?.attachmentId === value.attachmentId &&
          value.completedAt !== null,
    "Inconsistent deletion receipt.",
  );
export type FileDeletionReceipt = z.infer<typeof fileDeletionReceiptSchema>;
export const fileDeletionAttemptSchema = z.strictObject({
  tenantId: id,
  userId: id,
  command: fileDeletionCommandSchema,
  payloadDigest: z.string().regex(/^[a-f0-9]{64}$/),
  fileName: z.string().min(1),
});
export type FileDeletionAttempt = z.infer<typeof fileDeletionAttemptSchema>;
export const fileDeletionRecoveryContract: RecoveryContract<FileDeletionAttempt> =
  {
    schema: fileDeletionAttemptSchema,
    requestId: (value) => value.command.requestId,
  };
export const fileDeletionScope = (actor: ClientWriter, clientId: string) =>
  JSON.stringify([
    "client-file-delete",
    actor.tenantId,
    actor.userId,
    clientId,
  ]);
export async function fileDeletionDigest(
  actor: ClientWriter,
  command: FileDeletionCommand,
) {
  const canonical = fileDeletionCommandSchema.parse(command);
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(
      JSON.stringify([
        "client-file-delete",
        1,
        actor.tenantId,
        actor.userId,
        canonical,
      ]),
    ),
  );
  return Array.from(new Uint8Array(bytes), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

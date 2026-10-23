import { z } from "zod";
import type { Attachment } from "./contracts";
// Core producer: capiro-backend@0e29bad78bc749f6c80aecf1a9d74e1435b84790
// apps/api/src/clients/client-file-batch.types.ts and client-file-batch.service.ts.
export const batchRecoverySchema = z
  .object({
    version: z.literal(1),
    clientId: z.uuid(),
    requestId: z.uuid(),
    payloadDigest: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();
export type BatchRecovery = z.infer<typeof batchRecoverySchema>;
export type BatchCommand = {
  schemaVersion: 1;
  requestId: string;
  clientId: string;
  folder: string | null;
  files: { id: string; expectedRevision: number }[];
};
export const batchReceiptSchema = z.object({
  schemaVersion: z.literal(1),
  requestId: z.uuid(),
  clientId: z.uuid(),
  payloadDigest: z.string().regex(/^[a-f0-9]{64}$/),
  outcome: z.literal("moved"),
  committedAt: z.iso.datetime({ offset: true }),
  files: z
    .array(
      z.object({
        id: z.uuid(),
        previousRevision: z.number().int().nonnegative(),
        revision: z.number().int().nonnegative(),
        folder: z.string().max(120).nullable(),
      }),
    )
    .min(1)
    .max(100),
});
export function captureBatchMove(
  clientId: string,
  files: Attachment[],
  folder: string,
): BatchCommand {
  if (
    !files.length ||
    files.length > 100 ||
    new Set(files.map((file) => file.id)).size !== files.length ||
    files.some(
      (file) =>
        file.clientId !== clientId ||
        file.metadataRevision === undefined ||
        file.sourceEntityType === "hearing_record_brief",
    )
  )
    throw new Error(
      "This selection is unavailable for batch moves. Refresh and review its files.",
    );
  const normalized = folder.trim() || null;
  if (normalized && normalized.length > 120)
    throw new Error("Folder names have at most 120 characters.");
  return {
    schemaVersion: 1,
    requestId: crypto.randomUUID(),
    clientId,
    folder: normalized,
    files: files
      .map((file) => ({
        id: file.id,
        expectedRevision: file.metadataRevision!,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  };
}
export async function batchPayloadDigest(command: BatchCommand) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(command)),
  );
  return Array.from(new Uint8Array(bytes), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
export async function requireBatchReceipt(
  recovery: BatchRecovery,
  value: unknown,
) {
  const receipt = batchReceiptSchema.parse(value);
  if (
    receipt.clientId !== recovery.clientId ||
    receipt.requestId !== recovery.requestId ||
    receipt.payloadDigest !== recovery.payloadDigest ||
    new Set(receipt.files.map((file) => file.id)).size !==
      receipt.files.length ||
    receipt.files.some(
      (file) =>
        file.revision < file.previousRevision ||
        file.revision > file.previousRevision + 1 ||
        file.folder !== receipt.files[0]!.folder,
    )
  )
    throw new Error(
      "The response did not confirm the complete reviewed batch.",
    );
  const command: BatchCommand = {
    schemaVersion: 1,
    requestId: receipt.requestId,
    clientId: receipt.clientId,
    folder: receipt.files[0]!.folder,
    files: receipt.files
      .map((file) => ({ id: file.id, expectedRevision: file.previousRevision }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  };
  if ((await batchPayloadDigest(command)) !== recovery.payloadDigest)
    throw new Error(
      "The response did not confirm the reviewed destination and file revisions.",
    );
  return receipt;
}

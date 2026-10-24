import { z } from "zod";
import { ApiError } from "@/shared/portfolio/api/http";
import type { ClientWriter } from "@/shared/portfolio/auth/client-writer";
import type { Attachment } from "./contracts";
// Existing Core FileBatchMoveCommand/Receipt, clients/client-file-batch.types.ts.
const id = z
  .string()
  .uuid()
  .refine((value) => value === value.toLowerCase());
const revision = z.number().int().min(0).max(2_147_483_647);
export const commandSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    requestId: id,
    clientId: id,
    folder: z.string().trim().min(1).max(120).nullable(),
    files: z
      .array(
        z.strictObject({ id, expectedRevision: revision.max(2_147_483_646) }),
      )
      .min(1)
      .max(100),
  })
  .refine(
    (value) =>
      new Set(value.files.map((file) => file.id)).size === value.files.length,
  );
export type BatchMoveCommand = z.infer<typeof commandSchema>;
export type BatchMoveAttempt = {
  readonly command: BatchMoveCommand;
  readonly digest: string;
  readonly status: "pending" | "unknown";
  readonly receipt?: unknown;
};
export const batchMoveKey = (clientId: string, actor?: ClientWriter) =>
  [
    "file-batch-move",
    actor?.tenantId ?? "",
    actor?.userId ?? "",
    clientId,
  ] as const;
export function batchMoveCommand(
  clientId: string,
  files: readonly Attachment[],
  folder: string | null,
): BatchMoveCommand {
  return commandSchema.parse({
    schemaVersion: 1,
    requestId: crypto.randomUUID(),
    clientId,
    folder: folder?.trim() || null,
    files: files
      .map((file) => {
        if (file.clientId !== clientId)
          throw new ApiError(
            409,
            "Reopen the move from the current client files.",
          );
        return { id: file.id, expectedRevision: file.metadataRevision };
      })
      .sort((a, b) => a.id.localeCompare(b.id)),
  });
}
export async function batchMoveDigest(command: BatchMoveCommand) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(command)),
  );
  return Array.from(new Uint8Array(bytes), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
export const batchMoveReceiptSchema = (
  attempt: Pick<BatchMoveAttempt, "command" | "digest">,
) =>
  z
    .strictObject({
      schemaVersion: z.literal(1),
      requestId: id,
      clientId: id,
      payloadDigest: z.string().regex(/^[a-f0-9]{64}$/),
      outcome: z.literal("moved"),
      committedAt: z.iso.datetime({ offset: true }),
      files: z
        .array(
          z.strictObject({
            id,
            previousRevision: revision,
            revision,
            folder: z.string().nullable(),
          }),
        )
        .min(1)
        .max(100),
    })
    .refine((receipt) => {
      const { command } = attempt;
      return (
        receipt.requestId === command.requestId &&
        receipt.clientId === command.clientId &&
        receipt.payloadDigest === attempt.digest &&
        receipt.files.length === command.files.length &&
        receipt.files.every(
          (file, index) =>
            file.id === command.files[index]?.id &&
            file.previousRevision === command.files[index]?.expectedRevision &&
            file.revision >= file.previousRevision &&
            file.revision <= file.previousRevision + 1 &&
            file.folder === command.folder,
        )
      );
    }, "The batch receipt does not confirm this entire move.");

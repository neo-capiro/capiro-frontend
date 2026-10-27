import { z } from "zod";
import { type ApiClient, queryString } from "@/shared/portfolio/api/http";
import { attachmentSchema } from "@/features/portfolio/files/public";

// Core d0d105ffa7: selected-message manifest/import and existing attachment receipt owner.
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const originalSchema = z.object({
  threadId: z.uuid(),
  messageId: z.uuid(),
  updatedAt: z.iso.datetime({ offset: true }),
  connectionId: z.uuid(),
});
export type IncomingOriginal = z.infer<typeof originalSchema> & {
  clientId?: string;
};
const fileSchema = z
  .object({
    fileKey: hash,
    name: z.string().min(1).max(255),
    contentType: z.string().min(1).max(255),
    bytes: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    status: z.enum(["importable", "mailbox_handoff"]),
    reason: z.string().max(100).nullable(),
  })
  .refine((file) =>
    file.status === "importable"
      ? file.reason === null && file.bytes <= 3 * 1024 * 1024
      : Boolean(file.reason),
  );
export type IncomingFile = z.infer<typeof fileSchema>;
const handoffSchema = z.object({
  state: z.literal("mailbox_handoff"),
  reason: z.string().min(1).max(100),
  notice: z.string().max(1000),
  original: originalSchema
    .omit({ connectionId: true })
    .extend({ clientId: z.uuid().optional() }),
});
const manifestSchema = z.object({
  state: z.literal("manifest"),
  original: originalSchema,
  manifestSha256: hash,
  files: z
    .array(fileSchema)
    .max(50)
    .refine(
      (files) =>
        new Set(files.map((file) => file.fileKey)).size === files.length,
    ),
  notice: z.string().max(1000),
});
const importedSchema = z.object({
  state: z.literal("imported"),
  original: originalSchema,
  manifestSha256: hash,
  fileKey: hash,
  provenanceSha256: hash,
  attachment: z.object({
    id: z.uuid(),
    fileName: z.string().min(1).max(255),
    contentType: z.string().min(1).max(255),
    bytes: z
      .number()
      .int()
      .min(0)
      .max(3 * 1024 * 1024),
    sha256: hash,
    lifecycleStatus: z.enum([
      "ready",
      "legacy_ready",
      "quarantined",
      "blocked",
    ]),
    scanStatus: z.string().max(100).nullable(),
  }),
  reused: z.boolean(),
  notice: z.string().max(1000),
});
export type IncomingReceipt = z.infer<typeof importedSchema>;
export type IncomingManifest = z.infer<typeof manifestSchema>;
const sameOriginal = (
  got: {
    threadId: string;
    messageId: string;
    updatedAt: string;
    connectionId?: string;
  },
  expected: IncomingOriginal,
) =>
  got.threadId === expected.threadId &&
  got.messageId === expected.messageId &&
  got.updatedAt === expected.updatedAt &&
  (got.connectionId === undefined ||
    got.connectionId === expected.connectionId);
const path = (original: IncomingOriginal) => {
  originalSchema.parse(original);
  if (original.clientId) z.uuid().parse(original.clientId);
  return `engagement/mail/threads/${original.threadId}/messages/${original.messageId}/files`;
};
export function readIncomingFiles(
  api: ApiClient,
  original: IncomingOriginal,
  signal?: AbortSignal,
) {
  return api.request(
    "core",
    `${path(original)}?${queryString({ updatedAt: original.updatedAt, clientId: original.clientId })}`,
    z
      .union([manifestSchema, handoffSchema])
      .refine((result) => sameOriginal(result.original, original)),
    { signal },
  );
}
export function importIncomingFile(
  api: ApiClient,
  original: IncomingOriginal,
  manifest: IncomingManifest,
  file: IncomingFile,
  signal?: AbortSignal,
) {
  manifestSchema.parse(manifest);
  fileSchema.parse(file);
  if (
    !sameOriginal(manifest.original, original) ||
    file.status !== "importable" ||
    !manifest.files.some((row) => JSON.stringify(row) === JSON.stringify(file))
  )
    throw new Error("Refresh this original's file list before importing.");
  return api.request(
    "core",
    `${path(original)}/import`,
    z
      .union([importedSchema, handoffSchema])
      .refine(
        (result) =>
          sameOriginal(result.original, original) &&
          (result.state !== "imported" ||
            (result.fileKey === file.fileKey &&
              result.manifestSha256 === manifest.manifestSha256 &&
              result.attachment.fileName === file.name &&
              result.attachment.contentType === file.contentType &&
              result.attachment.bytes === file.bytes)),
      ),
    {
      method: "POST",
      body: {
        updatedAt: original.updatedAt,
        clientId: original.clientId,
        fileKey: file.fileKey,
        manifestSha256: manifest.manifestSha256,
      },
      signal,
    },
  );
}
const storedSchema = attachmentSchema.extend({
  mailMessageId: z.string().nullable().optional(),
  sourceEntityType: z.string().nullable().optional(),
  sourceEntityId: z.string().nullable().optional(),
  sourceContentHash: z.string().nullable().optional(),
  calculatedSha256: z.string().nullable().optional(),
});
export async function readImportedFile(
  api: ApiClient,
  original: IncomingOriginal,
  receipt: IncomingReceipt,
  signal?: AbortSignal,
) {
  importedSchema.parse(receipt);
  if (!sameOriginal(receipt.original, original))
    throw new Error("The imported file belongs to another original.");
  const rows = await api.request(
    "core",
    `engagement/attachments?${queryString({ mailMessageId: original.messageId })}`,
    z
      .array(storedSchema)
      .max(1000)
      .refine(
        (rows) => new Set(rows.map((row) => row.id)).size === rows.length,
      ),
    { signal },
  );
  const row = rows.find((row) => row.id === receipt.attachment.id);
  if (
    !row ||
    row.mailMessageId !== original.messageId ||
    row.source !== "incoming_mail" ||
    row.sourceEntityType !== "incoming_mail_file" ||
    row.sourceEntityId !==
      `${original.messageId}:${receipt.provenanceSha256}` ||
    row.sourceContentHash !== receipt.attachment.sha256 ||
    row.calculatedSha256 !== receipt.attachment.sha256 ||
    row.byteSize !== receipt.attachment.bytes ||
    row.fileName !== receipt.attachment.fileName ||
    row.contentType !== receipt.attachment.contentType
  )
    throw new Error(
      "The stored file no longer matches this original's import receipt.",
    );
  return row;
}

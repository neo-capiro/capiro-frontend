import { z } from "zod";
import type { ClientWriter } from "@/shared/portfolio/auth/client-writer";
import type { Attachment } from "./contracts";
// Existing Core clients/client-file-access-input.ts and immutable access receipt.
const id = z.uuid().refine((value) => value === value.toLowerCase());
const revision = z.number().int().min(0).max(2_147_483_647);
export const fileAccessCommandSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    requestId: id,
    clientId: id,
    operation: z.enum(["file-access", "folder-access"]),
    folder: z.string().trim().min(1).max(120).nullable(),
    files: z
      .array(
        z.strictObject({ id, expectedRevision: revision.max(2_147_483_646) }),
      )
      .min(1)
      .max(100),
    viewerMode: z.enum(["all", "restricted"]),
    viewerUserIds: z.array(id).max(100),
  })
  .refine(
    (command) =>
      new Set(command.files.map((file) => file.id)).size ===
        command.files.length &&
      new Set(command.viewerUserIds).size === command.viewerUserIds.length &&
      (command.operation !== "file-access" || command.files.length === 1) &&
      (command.viewerMode !== "all" || command.viewerUserIds.length === 0),
  );
export type FileAccessCommand = z.infer<typeof fileAccessCommandSchema>;
export function fileAccessCommand(
  clientId: string,
  operation: FileAccessCommand["operation"],
  folder: string | null,
  files: readonly Attachment[],
  viewerMode: FileAccessCommand["viewerMode"],
  viewerUserIds: readonly string[],
): FileAccessCommand {
  if (
    files.some((file) => file.clientId !== clientId || file.folder !== folder)
  )
    throw new Error("Reopen the current folder and review its files.");
  return fileAccessCommandSchema.parse({
    schemaVersion: 1,
    requestId: crypto.randomUUID(),
    clientId,
    operation,
    folder: folder?.trim() || null,
    files: files
      .map((file) => ({ id: file.id, expectedRevision: file.metadataRevision }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    viewerMode,
    viewerUserIds: viewerMode === "all" ? [] : [...viewerUserIds].sort(),
  });
}
export async function fileAccessDigest(
  command: FileAccessCommand,
  actor: ClientWriter,
) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(
      JSON.stringify(["file-access", 1, actor.tenantId, actor.userId, command]),
    ),
  );
  return Array.from(new Uint8Array(bytes), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
export type FileAccessAttempt = {
  readonly command: FileAccessCommand;
  readonly digest: string;
  readonly status: "pending" | "unknown";
  readonly outcome?: FileAccessOutcome;
};
const outcome = z.strictObject({
  schemaVersion: z.literal(1),
  tenantId: z.string().min(1),
  actorUserId: z.string().min(1),
  requestId: id,
  clientId: id,
  payloadDigest: z.string().regex(/^[a-f0-9]{64}$/),
  operation: z.enum(["file-access", "folder-access"]),
  status: z.enum(["completed", "refused"]),
  result: z
    .strictObject({
      files: z
        .array(z.strictObject({ id, previousRevision: revision, revision }))
        .min(1)
        .max(100),
    })
    .nullable(),
  refusal: z
    .strictObject({
      code: z.literal("FILE_ACCESS_REFUSED"),
      message: z.string().min(1).max(500),
    })
    .nullable(),
  createdAt: z.iso.datetime({ offset: true }),
});
export type FileAccessOutcome = z.infer<typeof outcome>;
export function fileAccessOutcomeSchema(
  attempt: Pick<FileAccessAttempt, "command" | "digest">,
  actor: ClientWriter,
) {
  return outcome.refine((value) => {
    const { command, digest } = attempt;
    return (
      value.tenantId === actor.tenantId &&
      value.actorUserId === actor.userId &&
      value.requestId === command.requestId &&
      value.clientId === command.clientId &&
      value.payloadDigest === digest &&
      value.operation === command.operation &&
      (value.status === "refused"
        ? value.result === null && value.refusal !== null
        : value.refusal === null &&
          value.result?.files.length === command.files.length &&
          value.result.files.every(
            (file, i) =>
              file.id === command.files[i]?.id &&
              file.previousRevision === command.files[i]?.expectedRevision &&
              file.revision >= file.previousRevision &&
              file.revision <= file.previousRevision + 1,
          ))
    );
  }, "The access outcome does not confirm this entire reviewed command.");
}
export const fileAccessKey = (clientId: string, actor?: ClientWriter) =>
  [
    "file-access-command",
    actor?.tenantId ?? "",
    actor?.userId ?? "",
    clientId,
  ] as const;

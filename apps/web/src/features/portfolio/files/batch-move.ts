import { z } from "zod";
import type { QueryClient } from "@tanstack/react-query";
import { ApiError, type ApiClient } from "@/shared/portfolio/api/http";
import {
  ambiguousClientWrite,
  type ClientWriter,
} from "@/shared/portfolio/auth/client-writer";
import type { Attachment } from "./contracts";
import { currentFilesKey } from "./file-reader";
import type { FileExecution } from "./file-scope";

// Existing Core FileBatchMoveCommand/Receipt, clients/client-file-batch.types.ts.
const id = z
  .string()
  .uuid()
  .refine((value) => value === value.toLowerCase());
const revision = z.number().int().min(0).max(2_147_483_647);
const commandSchema = z
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
async function digest(command: BatchMoveCommand) {
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

function currentSelection(
  cache: QueryClient,
  command: BatchMoveCommand,
  execution: FileExecution,
  fresh: boolean,
) {
  execution.guard();
  const files = cache.getQueryData<Attachment[]>(
    currentFilesKey(cache, command.clientId),
  );
  if (
    command.files.some(
      (expected) =>
        !files?.some(
          (file) =>
            file.id === expected.id &&
            file.clientId === command.clientId &&
            (!fresh || file.metadataRevision === expected.expectedRevision),
        ),
    )
  )
    throw new ApiError(
      409,
      "The selected files changed. Reopen and review the entire move.",
    );
}

/** Same QueryClient lifetime as existing file metadata recovery; no automatic dispatch. */
export async function moveFileBatch(
  api: ApiClient,
  cache: QueryClient,
  clientId: string,
  execution: FileExecution,
  input: { command: BatchMoveCommand } | { recover: "receipt" | "retry" },
) {
  const key = batchMoveKey(clientId, execution.actor);
  const previous = cache.getQueryData<BatchMoveAttempt | null>(key);
  if (previous?.status === "pending" || ("command" in input && previous))
    throw new ApiError(
      409,
      "Resolve the pending move before starting another.",
    );
  if (!("command" in input) && !previous)
    throw new ApiError(409, "There is no pending move in this view.");
  const command = commandSchema.parse(
    "command" in input ? input.command : previous!.command,
  );
  if (command.clientId !== clientId)
    throw new ApiError(409, "This move belongs to another client.");
  currentSelection(cache, command, execution, "command" in input);
  const token = command.requestId;
  const attempt: BatchMoveAttempt = Object.freeze({
    command: Object.freeze({
      ...command,
      files: Object.freeze(command.files.map((file) => Object.freeze(file))),
    }) as BatchMoveCommand,
    digest: previous?.digest ?? "",
    status: "pending",
  });
  cache.setQueryDefaults(key, { gcTime: Infinity });
  cache.setQueryData(key, attempt);
  let sent = false;
  let received = false;
  const receiptOnly = "recover" in input && input.recover === "receipt";
  try {
    const bound = {
      ...attempt,
      digest: previous?.digest ?? (await digest(command)),
    };
    currentSelection(cache, command, execution, "command" in input);
    cache.setQueryData(key, bound);
    sent = true;
    const receipt = await api.request(
      "core",
      `clients/${clientId}/files/batch-moves${receiptOnly ? `/${token}` : ""}`,
      batchMoveReceiptSchema(bound),
      {
        method: receiptOnly ? "GET" : "POST",
        body: receiptOnly ? undefined : command,
        signal: execution.signal,
      },
    );
    received = true;
    execution.guard();
    cache.setQueryData(key, null);
    return receipt;
  } catch (error) {
    const held = cache.getQueryData<BatchMoveAttempt | null>(key);
    if (held?.command.requestId === token)
      cache.setQueryData(
        key,
        previous ||
          received ||
          (sent && (execution.signal.aborted || ambiguousClientWrite(error)))
          ? { ...held, status: "unknown" }
          : null,
      );
    throw error;
  }
}

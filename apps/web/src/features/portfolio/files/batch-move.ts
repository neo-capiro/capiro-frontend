import type { QueryClient } from "@tanstack/react-query";
import { ApiError, type ApiClient } from "@/shared/portfolio/api/http";
import type { Attachment } from "./contracts";
import { currentFilesKey } from "./file-reader";
import type { FileExecution } from "./file-scope";
import {
  batchMoveKey,
  commandSchema,
  batchMoveDigest,
  batchMoveReceiptSchema,
  type BatchMoveAttempt,
  type BatchMoveCommand,
} from "./batch-move-contract";
import { batchMoveRecovery } from "./batch-move-recovery";
export {
  batchMoveKey,
  batchMoveCommand,
  batchMoveReceiptSchema,
  type BatchMoveAttempt,
  type BatchMoveCommand,
} from "./batch-move-contract";

function currentSelection(
  cache: QueryClient,
  command: BatchMoveCommand,
  execution: FileExecution,
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
            file.metadataRevision === expected.expectedRevision,
        ),
    )
  )
    throw new ApiError(
      409,
      "The selected files changed. Reopen and review the entire move.",
    );
}

/** Every dispatch is explicit, serialized, and retained in the existing encrypted journal. */
export async function moveFileBatch(
  api: ApiClient,
  cache: QueryClient,
  clientId: string,
  execution: FileExecution,
  input: { command: BatchMoveCommand } | { recover: "receipt" | "retry" },
) {
  const key = batchMoveKey(clientId, execution.actor);
  const cached = cache.getQueryData<BatchMoveAttempt | null>(key);
  if (cached?.status === "pending" || ("command" in input && cached))
    throw new ApiError(
      409,
      "Resolve the pending move before starting another.",
    );
  // Hold this view before asynchronous storage/hash work; the journal lock owns other tabs.
  if ("command" in input)
    cache.setQueryData(key, {
      command: input.command,
      digest: "",
      status: "pending",
    });
  else if (cached) cache.setQueryData(key, { ...cached, status: "pending" });
  const recovery = batchMoveRecovery(
    clientId,
    execution.actor,
    execution.guard,
  );
  let retained: BatchMoveAttempt | null = null;
  try {
    return await recovery.lock(async () => {
      retained = await recovery.load();
      execution.guard();
      if ("command" in input && retained)
        throw new ApiError(
          409,
          "Resolve the saved move before starting another.",
        );
      if (!("command" in input) && !retained)
        throw new ApiError(409, "There is no saved move to recover.");
      const command = commandSchema.parse(
        "command" in input ? input.command : retained!.command,
      );
      if (command.clientId !== clientId)
        throw new ApiError(409, "This move belongs to another client.");
      if ("command" in input) {
        currentSelection(cache, command, execution);
        const digest = await batchMoveDigest(command);
        currentSelection(cache, command, execution);
        retained = await recovery.reserve({
          command,
          digest,
          status: "unknown",
        });
        if (retained.command.requestId !== command.requestId)
          throw new ApiError(
            409,
            "Another saved move must be recovered first.",
          );
      }
      execution.guard();
      cache.setQueryData(key, { ...retained!, status: "pending" });
      const receiptOnly = "recover" in input && input.recover === "receipt";
      const receipt = await api.request(
        "core",
        `clients/${clientId}/files/batch-moves${receiptOnly ? `/${command.requestId}` : ""}`,
        batchMoveReceiptSchema(retained!),
        {
          method: receiptOnly ? "GET" : "POST",
          body: receiptOnly ? undefined : command,
          signal: execution.signal,
        },
      );
      // Validation already binds every file, revision, destination and digest to this original dispatch.
      // Persist its late response only to that immutable journal; never adopt it into a replacement UI scope.
      retained = { ...retained!, receipt, status: "unknown" };
      await recovery.received(retained);
      execution.guard();
      await recovery.acknowledge(command.requestId);
      execution.guard();
      cache.setQueryData(key, null);
      return receipt;
    });
  } catch (error) {
    // Untyped 4xx cannot disprove an earlier commit. Retain until a validated complete receipt.
    cache.setQueryData(key, retained ?? cached ?? null);
    throw error;
  }
}

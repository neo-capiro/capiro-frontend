import type { QueryClient } from "@tanstack/react-query";
import { ApiError, type ApiClient } from "@/shared/portfolio/api/http";
import { verifyCoreWriter } from "@/shared/portfolio/auth/verify-writer";
import { clientFilesSchema, type Attachment } from "./contracts";
import { currentFilesKey } from "./file-reader";
import type { FileExecution } from "./file-scope";
import {
  fileAccessKey,
  fileAccessCommandSchema,
  fileAccessDigest,
  fileAccessOutcomeSchema,
  type FileAccessAttempt,
  type FileAccessCommand,
} from "./file-access-command";
import { fileAccessRecovery } from "./file-access-recovery";
export type FileAccessInput =
  | { command: FileAccessCommand }
  | { recover: "receipt" | "retry" | "retire" };
function selection(
  cache: QueryClient,
  command: FileAccessCommand,
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
            file.folder === command.folder &&
            file.metadataRevision === expected.expectedRevision,
        ),
    )
  )
    throw new ApiError(
      409,
      "The reviewed files changed. Reopen access and review the current manifest.",
    );
}
/** Exact file or folder manifest in the existing actor-bound command journal. */
export async function saveFileAccess(
  api: ApiClient,
  cache: QueryClient,
  clientId: string,
  execution: FileExecution,
  input: FileAccessInput,
) {
  const key = fileAccessKey(clientId, execution.actor);
  const cached = cache.getQueryData<FileAccessAttempt | null>(key);
  if (cached?.status === "pending" || ("command" in input && cached))
    throw new ApiError(409, "Recover the saved access change first.");
  if ("command" in input)
    cache.setQueryData(key, {
      command: input.command,
      digest: "",
      status: "pending",
    });
  else if (cached) cache.setQueryData(key, { ...cached, status: "pending" });
  const recovery = fileAccessRecovery(
    clientId,
    execution.actor,
    execution.guard,
  );
  let retained: FileAccessAttempt | null = null;
  try {
    return await recovery.lock(async () => {
      retained = await recovery.load();
      if ("command" in input && retained)
        throw new ApiError(409, "Recover the saved access change first.");
      if (!("command" in input) && !retained)
        throw new ApiError(409, "No saved access change is available.");
      if (
        !("command" in input) &&
        cached &&
        (cached.digest !== retained!.digest ||
          JSON.stringify(cached.command) !== JSON.stringify(retained!.command))
      )
        throw new ApiError(
          409,
          "The saved access command changed in another view. Review it before continuing.",
        );
      const command = fileAccessCommandSchema.parse(
        "command" in input ? input.command : retained!.command,
      );
      if (command.clientId !== clientId)
        throw new ApiError(409, "Access command belongs to another client.");
      if ("command" in input) {
        selection(cache, command, execution);
        const digest = await fileAccessDigest(command, execution.actor);
        selection(cache, command, execution);
        retained = await recovery.reserve({
          command,
          digest,
          status: "unknown",
        });
      }
      if ("recover" in input && input.recover === "retire") {
        const outcome = fileAccessOutcomeSchema(
          retained!,
          execution.actor,
        ).parse(retained!.outcome);
        if (outcome.status !== "refused")
          throw new ApiError(409, "Only a confirmed refusal can be cleared.");
        await verifyCoreWriter(
          api,
          execution.actor,
          execution.signal,
          execution.guard,
        );
        const files = await api.request(
          "core",
          `engagement/attachments?${new URLSearchParams({ clientId })}`,
          clientFilesSchema(clientId),
          { signal: execution.signal },
        );
        execution.guard();
        await recovery.retire(retained!);
        execution.guard();
        cache.setQueryData(currentFilesKey(cache, clientId), files);
        cache.setQueryData(key, null);
        return outcome;
      }
      if (retained!.outcome?.status === "refused")
        throw new ApiError(
          409,
          "Core refused this access change. Review fresh files and clear it before another change.",
        );
      cache.setQueryData(key, { ...retained!, status: "pending" });
      // A known late completion is re-read under current authority before acknowledgment.
      const read =
        Boolean(retained!.outcome) ||
        ("recover" in input && input.recover === "receipt");
      const path = `clients/${clientId}/files/${read ? `access/commands/${command.requestId}` : command.operation === "folder-access" ? "access/folder" : `${command.files[0]!.id}/access`}`;
      const outcome = await api.request(
        "core",
        path,
        fileAccessOutcomeSchema(retained!, execution.actor),
        {
          method: read ? "GET" : "PATCH",
          body: read ? undefined : command,
          signal: execution.signal,
        },
      );
      retained = { ...retained!, outcome, status: "unknown" };
      await recovery.received(retained);
      execution.guard();
      if (outcome.status === "completed") {
        await recovery.acknowledge(command.requestId);
        execution.guard();
        cache.setQueryData(key, null);
      } else cache.setQueryData(key, retained);
      return outcome;
    });
  } catch (error) {
    const unresolved = retained ?? cached ?? null;
    const settled = unresolved
      ? await recovery.settled(unresolved.command.requestId).catch(() => false)
      : false;
    cache.setQueryData(key, settled ? null : unresolved);
    throw error;
  }
}

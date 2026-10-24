import { ApiError, type ApiClient } from "@/shared/portfolio/api/http";
import {
  acknowledgeRecovery,
  readRecovery,
  reserveRecovery,
  withRecoveryCommandLock,
} from "@/shared/session/recovery/journal";
import type { ClientWriter } from "./authority";
import {
  readUndoStatus,
  undoStatusSchema,
  undoAttemptSchema,
  undoRecoveryContract,
  undoRecoveryScope,
  undoPath,
  type UndoAttempt,
} from "./command-undo";

export async function undoDigest(attempt: UndoAttempt) {
  const { snapshot: row, input } = undoAttemptSchema.parse(attempt);
  const bytes = new TextEncoder().encode(
    JSON.stringify([
      "activity-command-undo",
      1,
      row.tenantId,
      row.actorUserId,
      row.clientId,
      row.commandId,
      row.creationRequestId,
      input.requestId,
      input.activityId,
      input.expectedRevision,
    ]),
  );
  return Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
    (value) => value.toString(16).padStart(2, "0"),
  ).join("");
}
async function checkedResult(
  attempt: UndoAttempt,
  result: Awaited<ReturnType<typeof readUndoStatus>>,
) {
  if (
    result.status === "removed" &&
    (result.undo.requestId !== attempt.input.requestId ||
      result.undo.payloadDigest !== (await undoDigest(attempt)))
  )
    throw new ApiError(
      409,
      "The saved Undo belongs to a different attempt. This attempt remains retained.",
    );
  return result;
}
export async function undoQuickLog(
  api: ApiClient,
  attempt: UndoAttempt,
  actor: ClientWriter,
  guard: () => void,
  signal: AbortSignal,
) {
  const retained = undoAttemptSchema.parse(attempt);
  const schema = undoStatusSchema(retained.snapshot, actor);
  guard();
  signal.throwIfAborted();
  const result = await api.request(
    "core",
    undoPath(retained.snapshot),
    schema,
    { method: "POST", body: retained.input, signal },
  );
  guard();
  signal.throwIfAborted();
  if (result.status !== "removed")
    throw new ApiError(502, "Undo completion was not confirmed.");
  return checkedResult(retained, result);
}

/** One scoped retained attempt, using the existing storage and execution locks.
 * Read and acknowledgment never POST; an explicit retry keeps the original body. */
export async function runQuickLogUndo(
  api: ApiClient,
  actor: ClientWriter,
  clientId: string,
  operation: "read" | "send" | "acknowledge",
  signal: AbortSignal,
  guard: () => void,
  snapshot?: UndoAttempt["snapshot"],
) {
  const scope = undoRecoveryScope(actor, clientId);
  return withRecoveryCommandLock(scope, guard, async () => {
    let attempt = await readRecovery(scope, undoRecoveryContract, guard);
    let result: Awaited<ReturnType<typeof readUndoStatus>> | undefined;
    if (!attempt && operation === "send" && snapshot) {
      if (snapshot.clientId !== clientId)
        throw new ApiError(409, "Undo client changed.");
      const current = await readUndoStatus(api, snapshot, actor, signal, guard);
      if (
        current.status !== "available" ||
        current.revision !== snapshot.revision
      )
        throw new ApiError(
          409,
          "This activity changed or is unavailable. Review the timeline.",
        );
      const input = {
        schemaVersion: 1 as const,
        requestId: crypto.randomUUID(),
        activityId: snapshot.id,
        expectedRevision: snapshot.revision,
      };
      attempt = await reserveRecovery(
        scope,
        input.requestId,
        { snapshot, input },
        undoRecoveryContract,
        guard,
      );
      result = current;
    }
    if (!attempt) return { attempt: null };
    if (attempt.snapshot.clientId !== clientId)
      throw new ApiError(409, "Retained Undo client changed.");
    result = await checkedResult(
      attempt,
      result ??
        (await readUndoStatus(api, attempt.snapshot, actor, signal, guard)),
    );
    if (operation === "send" && result.status !== "removed")
      result = await undoQuickLog(api, attempt, actor, guard, signal);
    if (operation === "acknowledge") {
      if (result.status !== "removed")
        throw new ApiError(
          409,
          "Undo remains unconfirmed; the original attempt is retained.",
        );
      await acknowledgeRecovery(scope, attempt.input.requestId, guard);
      return { attempt: null };
    }
    return { attempt, result };
  });
}

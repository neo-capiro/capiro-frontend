import { ApiError, type ApiClient } from "@/shared/portfolio/api/http";
import type { ClientWriter } from "@/shared/portfolio/auth/client-writer";
import {
  readRecovery,
  reserveRecovery,
  acknowledgeRecovery,
  withRecoveryCommandLock,
} from "@/shared/session/recovery/journal";
import {
  fileDeletionAttemptSchema,
  fileDeletionReceiptSchema,
  fileDeletionRecoveryContract,
  fileDeletionScope,
  fileDeletionDigest,
  type FileDeletionAttempt,
} from "./deletion-contract";
import {
  verifyFileDeletionAccess,
  reviewFileDeletion,
  type FileDeletionReview,
} from "./deletion-review";

export type FileDeletionAction =
  | { kind: "submit"; review: FileDeletionReview }
  | { kind: "check" | "retry" | "acknowledge"; expected: FileDeletionAttempt };
export async function requestFileDeletion(
  api: ApiClient,
  actor: ClientWriter,
  value: FileDeletionAttempt,
  send: boolean,
  signal: AbortSignal,
  guard: () => void,
) {
  guard();
  signal.throwIfAborted();
  const saved = fileDeletionAttemptSchema.parse(value),
    { command } = saved;
  if (
    saved.tenantId !== actor.tenantId ||
    saved.userId !== actor.userId ||
    saved.payloadDigest !== (await fileDeletionDigest(actor, command))
  )
    throw new Error(
      "The saved deletion does not match this account or original command.",
    );
  guard();
  signal.throwIfAborted();
  const { attachmentId, ...body } = command;
  const receipt = await api.request(
    "core",
    send
      ? `engagement/attachments/${attachmentId}`
      : `engagement/attachments/deletions/${command.requestId}`,
    fileDeletionReceiptSchema,
    { method: send ? "DELETE" : "GET", ...(send ? { body } : {}), signal },
  );
  guard();
  signal.throwIfAborted();
  if (
    receipt.tenantId !== saved.tenantId ||
    receipt.actorUserId !== saved.userId ||
    receipt.requestId !== command.requestId ||
    receipt.clientId !== command.clientId ||
    receipt.attachmentId !== attachmentId ||
    receipt.expectedRevision !== command.expectedRevision ||
    receipt.payloadDigest !== saved.payloadDigest
  )
    throw new ApiError(
      502,
      "The deletion receipt does not match the reviewed command. Keep it for recovery.",
    );
  return receipt;
}
export async function deleteClientFile(
  api: ApiClient,
  actor: ClientWriter,
  clientId: string,
  input: FileDeletionAction,
  signal: AbortSignal,
  guard: () => void,
  observe: (saved: FileDeletionAttempt | null) => void,
) {
  const action = structuredClone(input),
    scope = fileDeletionScope(actor, clientId);
  const authorize = () =>
    verifyFileDeletionAccess(api, actor, clientId, signal, guard);
  return withRecoveryCommandLock(scope, guard, async () => {
    await authorize();
    let saved = await readRecovery(scope, fileDeletionRecoveryContract, guard);
    await authorize();
    observe(saved);
    if (action.kind === "submit") {
      if (saved)
        throw new Error(
          "A saved file deletion needs recovery. No new deletion was sent.",
        );
      const command = await reviewFileDeletion(
        api,
        actor,
        clientId,
        action.review,
        signal,
        guard,
      );
      await authorize();
      const prepared = fileDeletionAttemptSchema.parse({
        tenantId: actor.tenantId,
        userId: actor.userId,
        command,
        payloadDigest: await fileDeletionDigest(actor, command),
        fileName: action.review.fileName,
      });
      guard();
      signal.throwIfAborted();
      saved = await reserveRecovery(
        scope,
        command.requestId,
        prepared,
        fileDeletionRecoveryContract,
        guard,
      );
      observe(saved);
      if (saved.command.requestId !== command.requestId)
        throw new Error("Another tab retained a deletion. Recover it first.");
    } else if (
      !saved ||
      JSON.stringify(saved) !== JSON.stringify(action.expected)
    )
      throw new Error(
        "The retained deletion changed. Review its original command again.",
      );
    if (saved.command.clientId !== clientId)
      throw new Error("Restore the original client to recover this deletion.");
    const attempt = saved;
    const request = (send: boolean) =>
      requestFileDeletion(api, actor, attempt, send, signal, guard);
    let receipt;
    if (action.kind === "submit") receipt = await request(true);
    else {
      receipt = await request(false).catch((error: unknown) => {
        if (
          action.kind === "retry" &&
          error instanceof ApiError &&
          error.status === 404
        )
          return null;
        throw error;
      });
      if (
        action.kind === "retry" &&
        (!receipt || receipt.status === "pending")
      ) {
        await authorize();
        receipt = await request(true);
      }
    }
    await authorize();
    if (!receipt)
      throw new Error(
        "Deletion is not confirmed. Its original command remains saved.",
      );
    if (action.kind === "acknowledge") {
      if (receipt.status !== "completed")
        throw new Error(
          "Deletion is still pending. Keep its original command for recovery.",
        );
      await acknowledgeRecovery(scope, saved.command.requestId, guard);
      observe(null);
    }
    return receipt;
  });
}

import { ApiError, type ApiClient } from "@/shared/portfolio/api/http";
import type { ClientWriter } from "@/shared/portfolio/auth/client-writer";
import {
  acknowledgeRecovery,
  readRecovery,
  reserveRecovery,
  withRecoveryCommandLock,
} from "@/shared/session/recovery/journal";
import {
  prospectFileCopyScope,
  prepareProspectFileCopy,
  requestProspectFileCopy,
} from "./command";
import {
  prospectFileCopyRecoveryContract,
  type ProspectFileCopyAttempt,
} from "./contracts";
import {
  assertProspectFileCopyReview,
  readProspectFileCopyReview,
  verifyProspectFileCopyAccess,
  type ProspectFileCopyReview,
} from "./review";

export type ProspectFileCopyAction =
  | { kind: "submit"; review: ProspectFileCopyReview; folder: string | null }
  | {
      kind: "check" | "retry" | "acknowledge";
      expected: ProspectFileCopyAttempt;
    };
export async function runProspectFileCopy(
  api: ApiClient,
  actor: ClientWriter,
  prospectId: string,
  clientId: string,
  input: ProspectFileCopyAction,
  guard: () => void,
  signal: AbortSignal,
  observe: (value: ProspectFileCopyAttempt | null) => void,
) {
  const action = structuredClone(input),
    scope = prospectFileCopyScope(actor, prospectId);
  const authorize = () =>
    verifyProspectFileCopyAccess(
      api,
      actor,
      prospectId,
      clientId,
      signal,
      guard,
    );
  return withRecoveryCommandLock(scope, guard, async () => {
    await authorize();
    let saved = await readRecovery(
      scope,
      prospectFileCopyRecoveryContract,
      guard,
    );
    await authorize();
    observe(saved);
    if (action.kind === "submit") {
      if (saved)
        throw new Error(
          "An earlier upload copy needs recovery. No new copy was sent.",
        );
      if (
        action.review.prospect.id !== prospectId ||
        action.review.client.id !== clientId
      )
        throw new Error("The reviewed destination changed.");
      const current = await readProspectFileCopyReview(
        api,
        actor,
        prospectId,
        clientId,
        action.review.selection,
        signal,
        guard,
      );
      assertProspectFileCopyReview(action.review, current);
      const prepared = await prepareProspectFileCopy(
        actor,
        action.review,
        action.folder,
      );
      guard();
      signal.throwIfAborted();
      saved = await reserveRecovery(
        scope,
        prepared.command.requestId,
        prepared,
        prospectFileCopyRecoveryContract,
        guard,
      );
      observe(saved);
      if (saved.command.requestId !== prepared.command.requestId)
        throw new Error(
          "Another tab has a pending upload copy. Recover it first.",
        );
    } else if (
      !saved ||
      JSON.stringify(saved) !== JSON.stringify(action.expected)
    ) {
      throw new Error(
        "The saved copy changed in another tab. Review the original command again.",
      );
    }
    if (
      saved.command.prospectId !== prospectId ||
      saved.command.clientId !== clientId
    )
      throw new Error(
        "Restore the original prospect and linked client to recover this copy.",
      );
    const attempt = saved;
    const request = (send: boolean) =>
      requestProspectFileCopy(api, actor, attempt, send, signal, guard);
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
      // Only the user's explicit retry can resume the same frozen request. Missing/unfinished is never success.
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
        "The original copy is not confirmed. Its command remains saved.",
      );
    if (action.kind === "acknowledge") {
      if (receipt.status !== "completed")
        throw new Error(
          "The copy is still pending. Keep its original command for recovery.",
        );
      await acknowledgeRecovery(scope, saved.command.requestId, guard);
      observe(null);
    }
    return receipt;
  });
}

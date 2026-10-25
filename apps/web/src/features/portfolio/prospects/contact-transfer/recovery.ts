import type { ApiClient } from "@/shared/portfolio/api/http";
import type { ClientWriter } from "@/shared/portfolio/auth/client-writer";
import { verifyCoreWriter } from "@/shared/portfolio/auth/verify-writer";
import {
  acknowledgeRecovery,
  readRecovery,
  reserveRecovery,
  retireProspectContactTransferRefusalRecovery,
  withRecoveryCommandLock,
} from "@/shared/session/recovery/journal";
import {
  contactTransferRequest,
  prepareContactTransfer,
  transferScope,
} from "./command";
import { transferRecoveryContract, type TransferAttempt } from "./contracts";
import {
  assertTransferReview,
  readTransferReview,
  restoreTransferChoices,
  type FreshTransferReview,
  type TransferDecision,
  type TransferReview,
} from "./review";

export type TransferAction =
  | { kind: "submit"; review: TransferReview; decisions: TransferDecision[] }
  | {
      kind: "check" | "retry" | "acknowledge" | "retire-refusal";
      expected: TransferAttempt;
    };

export async function runContactTransfer(
  api: ApiClient,
  actor: ClientWriter,
  prospectId: string,
  input: TransferAction,
  guard: () => void,
  signal: AbortSignal,
  observe: (attempt: TransferAttempt | null) => void,
) {
  const action = structuredClone(input);
  const scope = transferScope(actor, prospectId);
  return withRecoveryCommandLock(scope, guard, async () => {
    await verifyCoreWriter(api, actor, signal, guard);
    let attempt = await readRecovery(scope, transferRecoveryContract, guard);
    observe(attempt);
    if (action.kind === "submit") {
      if (attempt)
        throw new Error(
          "An earlier contact transfer needs recovery. No new transfer was sent.",
        );
      if (action.review.prospect.id !== prospectId)
        throw new Error("The reviewed prospect changed.");
      const current = await readTransferReview(
        api,
        prospectId,
        action.review.client.id,
        signal,
        guard,
      );
      assertTransferReview(action.review, current, action.decisions);
      const prepared = await prepareContactTransfer(
        actor,
        action.review,
        action.decisions,
      );
      guard();
      signal.throwIfAborted();
      attempt = await reserveRecovery(
        scope,
        prepared.command.requestId,
        prepared,
        transferRecoveryContract,
        guard,
      );
      observe(attempt);
      if (attempt.command.requestId !== prepared.command.requestId)
        throw new Error(
          "Another tab has a pending contact transfer. Recover it first.",
        );
    } else if (
      !attempt ||
      JSON.stringify(attempt) !== JSON.stringify(action.expected)
    ) {
      throw new Error(
        "The saved transfer changed in another tab. Review its original command before continuing.",
      );
    }
    if (attempt.command.prospectId !== prospectId)
      throw new Error("The saved transfer belongs to a different prospect.");
    const receipt = await contactTransferRequest(
      api,
      actor,
      attempt,
      action.kind === "submit" || action.kind === "retry",
      signal,
      guard,
    );
    let freshReview: FreshTransferReview | undefined;
    if (action.kind === "acknowledge") {
      if (receipt.status !== "completed")
        throw new Error(
          "This transfer was refused. Review that refusal before continuing.",
        );
      await acknowledgeRecovery(scope, attempt.command.requestId, guard);
      observe(null);
    } else if (action.kind === "retire-refusal") {
      if (receipt.status !== "refused")
        throw new Error(
          "This transfer completed. Acknowledge its result before continuing.",
        );
      // The historical refusal establishes no-write; current reads establish a fresh review is available.
      const current = await readTransferReview(
        api,
        prospectId,
        attempt.command.clientId,
        signal,
        guard,
      );
      freshReview = restoreTransferChoices(attempt, current);
      await retireProspectContactTransferRefusalRecovery(
        scope,
        attempt.command.requestId,
        receipt,
        guard,
      );
      observe(null);
    }
    return { receipt, freshReview };
  });
}

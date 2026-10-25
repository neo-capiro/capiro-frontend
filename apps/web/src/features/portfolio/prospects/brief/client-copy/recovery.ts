import type { ApiClient } from "@/shared/portfolio/api/http";
import type { useCapiro } from "@/shared/capiro/CapiroBoundary";
import { CapiroApiError } from "@/shared/capiro/http";
import type { ProspectWriter } from "@/features/modules/workspace/prospect-actions-public";
import {
  acknowledgeRecovery,
  readRecovery,
  reserveRecovery,
  withRecoveryCommandLock,
} from "@/shared/session/recovery/journal";
import {
  clientBriefCopyScope,
  clientBriefCopyRequest,
  prepareClientBriefCopy,
} from "./command";
import {
  clientBriefCopyRecoveryContract,
  type ClientBriefCopyAttempt,
} from "./contracts";
import {
  assertClientBriefReview,
  readClientBriefReview,
  type ClientBriefReview,
} from "./review";
import { verifyClientBriefAccess } from "./authority";

export type ClientBriefCopyAction =
  | { kind: "submit"; review: ClientBriefReview; docTitle: string }
  | {
      kind: "check" | "retry" | "acknowledge";
      expected: ClientBriefCopyAttempt;
    };
export async function runClientBriefCopy(
  api: ApiClient,
  workspace: ReturnType<typeof useCapiro>,
  actor: ProspectWriter,
  prospectId: string,
  clientId: string,
  input: ClientBriefCopyAction,
  guard: () => void,
  signal: AbortSignal,
  observe: (value: ClientBriefCopyAttempt | null) => void,
) {
  const action = structuredClone(input);
  const scope = clientBriefCopyScope(actor, prospectId);
  return withRecoveryCommandLock(scope, guard, async () => {
    guard();
    signal.throwIfAborted();
    await verifyClientBriefAccess(
      api,
      workspace,
      actor,
      prospectId,
      clientId,
      signal,
      guard,
    );
    guard();
    signal.throwIfAborted();
    let saved = await readRecovery(
      scope,
      clientBriefCopyRecoveryContract,
      guard,
    );
    observe(saved);
    if (action.kind === "submit") {
      if (saved)
        throw new Error(
          "An earlier brief copy needs recovery. No new copy was sent.",
        );
      if (
        action.review.prospect.id !== prospectId ||
        action.review.client.id !== clientId
      )
        throw new Error("The reviewed destination changed.");
      const current = await readClientBriefReview(
        api,
        { tenantId: actor.tenantId, prospectId },
        clientId,
        action.review.selection,
        signal,
        guard,
      );
      assertClientBriefReview(action.review, current);
      const prepared = await prepareClientBriefCopy(
        actor,
        action.review,
        action.docTitle,
      );
      guard();
      signal.throwIfAborted();
      saved = await reserveRecovery(
        scope,
        prepared.command.requestId,
        prepared,
        clientBriefCopyRecoveryContract,
        guard,
      );
      observe(saved);
      if (saved.command.requestId !== prepared.command.requestId)
        throw new Error(
          "Another tab has a pending brief copy. Recover it first.",
        );
    } else if (
      !saved ||
      JSON.stringify(saved) !== JSON.stringify(action.expected)
    ) {
      throw new Error(
        "The saved copy changed in another tab. Review its original command before continuing.",
      );
    }
    if (
      saved.command.prospectId !== prospectId ||
      saved.command.clientId !== clientId
    )
      throw new Error(
        "Restore the original prospect and linked client before recovering this copy.",
      );
    const attempt = saved;
    const request = (send: boolean) =>
      clientBriefCopyRequest(workspace, actor, attempt, send, signal, guard);
    // Every explicit retry reconciles the original command first. A 404 permits only the same retained POST, never a fresh command.
    const receipt =
      action.kind === "submit"
        ? await request(true)
        : await request(false).catch(async (error: unknown) => {
            if (
              action.kind !== "retry" ||
              !(error instanceof CapiroApiError) ||
              error.status !== 404
            )
              throw error;
            guard();
            signal.throwIfAborted();
            return request(true);
          });
    if (action.kind === "acknowledge") {
      await acknowledgeRecovery(scope, saved.command.requestId, guard);
      observe(null);
    }
    return receipt;
  });
}

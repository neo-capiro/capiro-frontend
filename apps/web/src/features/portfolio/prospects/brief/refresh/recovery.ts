import { ApiError, type ApiClient } from "@/shared/portfolio/api/http";
import {
  acknowledgeRecovery,
  readRecovery,
  reserveRecovery,
  updateRecovery,
  withRecoveryCommandLock,
} from "@/shared/session/recovery/journal";
import {
  refreshRecoveryContract,
  type RefreshAttempt,
  type RetainedRefresh,
} from "./contracts";
import {
  acceptRefresh,
  prepareRefresh,
  readRefreshResult,
  type RefreshScope,
} from "./api";
export const refreshJournalScope = (s: RefreshScope) =>
  JSON.stringify(["brief-refresh-v1", s.tenantId, s.userId, s.prospectId]);
export type RefreshAction =
  | { kind: "prepare"; expectedVersionNumber: number; keepUserEdits: boolean }
  | { kind: "check" | "retry" | "clear"; expected: RefreshAttempt }
  | { kind: "accept"; expected: RefreshAttempt; review: RetainedRefresh };
type Context = {
  api: ApiClient;
  scope: RefreshScope;
  key: string;
  guard: () => void;
  signal: AbortSignal;
  observe: (a: RefreshAttempt | null) => void;
};
async function reservePreparation(
  c: Context,
  intent: Extract<RefreshAction, { kind: "prepare" }>,
) {
  const attempt: RefreshAttempt = {
    request: {
      proposalId: crypto.randomUUID(),
      expectedVersionNumber: intent.expectedVersionNumber,
      keepUserEdits: intent.keepUserEdits,
    },
    acceptHash: null,
    refused: false,
  };
  const saved = await reserveRecovery(
    c.key,
    attempt.request.proposalId,
    attempt,
    refreshRecoveryContract,
    c.guard,
  );
  c.observe(saved);
  if (saved.request.proposalId !== attempt.request.proposalId)
    throw Error("Another tab has a pending refresh. Recover it first.");
  return prepareRefresh(c.api, c.scope, saved.request, c.signal);
}
async function resolveOriginal(
  c: Context,
  attempt: RefreshAttempt,
  retry: boolean,
) {
  try {
    return await readRefreshResult(c.api, c.scope, attempt.request, c.signal);
  } catch (error) {
    if (
      retry &&
      !attempt.acceptHash &&
      error instanceof ApiError &&
      error.status === 404
    )
      return prepareRefresh(c.api, c.scope, attempt.request, c.signal);
    throw error;
  }
}
async function persist(c: Context, saved: RefreshAttempt) {
  await updateRecovery(
    c.key,
    saved.request.proposalId,
    saved,
    refreshRecoveryContract,
    c.guard,
  );
  c.observe(saved);
}
async function sendAcceptance(
  c: Context,
  saved: RefreshAttempt,
  p: RetainedRefresh,
) {
  if (saved.acceptHash !== p.proposalHash)
    throw Error("The original acceptance identity changed.");
  try {
    return await acceptRefresh(c.api, c.scope, p, c.signal);
  } catch (error) {
    if (error instanceof ApiError && error.status === 409)
      await persist(c, { ...saved, refused: true });
    throw error;
  }
}
export async function runRefresh(
  api: ApiClient,
  scope: RefreshScope,
  action: RefreshAction,
  guard: () => void,
  signal: AbortSignal,
  observe: Context["observe"],
) {
  const intent = structuredClone(action),
    c: Context = {
      api,
      scope,
      key: refreshJournalScope(scope),
      guard,
      signal,
      observe,
    };
  return withRecoveryCommandLock(c.key, guard, async () => {
    let saved = await readRecovery(c.key, refreshRecoveryContract, guard);
    observe(saved);
    if (intent.kind === "prepare") {
      if (saved)
        throw Error("Recover the earlier refresh before preparing another.");
      return reservePreparation(c, intent);
    }
    if (!saved || JSON.stringify(saved) !== JSON.stringify(intent.expected))
      throw Error(
        "The retained refresh changed in another tab. Check its status.",
      );
    const result = await resolveOriginal(c, saved, intent.kind === "retry");
    guard();
    if (intent.kind === "clear") {
      if (saved.acceptHash && !saved.refused && !result.acceptedVersion)
        throw Error(
          "Acceptance is unresolved. Check or retry the original acceptance first.",
        );
      await acknowledgeRecovery(c.key, saved.request.proposalId, guard);
      observe(null);
      return null;
    }
    if (result.acceptedVersion || intent.kind === "check") return result;
    if (intent.kind === "accept") {
      if (
        intent.review.proposalId !== result.proposal.proposalId ||
        intent.review.proposalHash !== result.proposal.proposalHash
      )
        throw Error(
          "The reviewed proposal changed. Review its exact saved content again.",
        );
      saved = {
        ...saved,
        acceptHash: result.proposal.proposalHash,
        refused: false,
      };
      await persist(c, saved);
    }
    return saved.acceptHash
      ? sendAcceptance(c, saved, result.proposal)
      : result;
  });
}

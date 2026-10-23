import type { ClientWriter } from "@/shared/portfolio/auth/client-writer";
import {
  acknowledgeRecovery,
  readRecovery,
  reserveRecovery,
  retireAssociationRefusalRecovery,
  updateRecovery,
  withRecoveryCommandLock,
} from "@/shared/session/recovery/journal";
import { CapiroApiError, type CapiroApi } from "@/shared/capiro/http";
import {
  objectiveOperationalOperations,
  operationalFailureSchema,
  requireOperationalAssociationReceipt,
} from "@/shared/capiro/operations/objective-operational";
import { canonicalOperationalJSON } from "@/shared/capiro/operations/objective-operational-semantics";
import {
  requireRetainedAssociation,
  retainedAssociationSchema,
  type RetainedAssociation,
} from "./association-command";

function validateRetainedUpdate(
  previous: RetainedAssociation,
  next: RetainedAssociation,
) {
  for (const key of [
    "command",
    "payloadDigest",
    "source",
    "linkedRevision",
  ] as const)
    if (
      canonicalOperationalJSON(previous[key] ?? null) !==
      canonicalOperationalJSON(next[key] ?? null)
    )
      throw new Error("The retained association review changed.");
  for (const key of ["receipt", "refusal"] as const)
    if (
      previous[key] &&
      canonicalOperationalJSON(previous[key]) !==
        canonicalOperationalJSON(next[key] ?? null)
    )
      throw new Error("The association outcome changed.");
}

export function createAssociationRecovery(
  actor: ClientWriter,
  target: { clientId: string; id: string },
  guard: () => void,
) {
  const scope = JSON.stringify([
    "objective-association-v1",
    actor.tenantId,
    actor.userId,
    target.clientId,
    target.id,
  ]);
  const checked = (value: unknown) =>
    requireRetainedAssociation(value, target.clientId, target.id);
  const contract = {
    schema: retainedAssociationSchema,
    requestId: (value: RetainedAssociation) => value.command.requestId,
    validateUpdate: validateRetainedUpdate,
  };
  return {
    guard,
    async load() {
      const value = await readRecovery(scope, contract, guard);
      return value ? checked(value) : null;
    },
    async reserve(value: RetainedAssociation) {
      await checked(value);
      guard();
      return checked(
        await reserveRecovery(
          scope,
          value.command.requestId,
          value,
          contract,
          guard,
        ),
      );
    },
    async save(value: RetainedAssociation) {
      await checked(value);
      guard();
      await updateRecovery(
        scope,
        value.command.requestId,
        value,
        contract,
        guard,
      );
      return value;
    },
    lock: <T>(action: () => Promise<T>) =>
      withRecoveryCommandLock(scope, guard, action),
    acknowledge: (value: RetainedAssociation) =>
      acknowledgeRecovery(scope, value.command.requestId, guard),
    retire: (value: RetainedAssociation) => {
      if (!value.refusal)
        throw new Error("A definitive rejection is required.");
      return retireAssociationRefusalRecovery(
        scope,
        value.command.requestId,
        value.refusal,
        guard,
      );
    },
  };
}
export type AssociationRecovery = ReturnType<typeof createAssociationRecovery>;
export type AssociationApi = Pick<
  CapiroApi<
    Pick<
      typeof objectiveOperationalOperations,
      "objectives.operational.link" | "objectives.operational.receipt"
    >
  >,
  "request"
>;

/** A second click/tab only receives the retained attempt; it never resends it. */
export function dispatchAssociation(
  recovery: AssociationRecovery,
  api: AssociationApi,
  review: RetainedAssociation,
  signal: AbortSignal,
  preflight: () => Promise<void>,
) {
  return recovery.lock(async () => {
    const previous = await recovery.load();
    if (previous) return previous;
    await preflight();
    recovery.guard();
    signal.throwIfAborted();
    const pending = await recovery.reserve(review);
    if (pending.command.requestId !== review.command.requestId) return pending;
    try {
      recovery.guard();
      signal.throwIfAborted();
      const value = await api.request(
        "objectives.operational.link",
        {
          params: { clientId: pending.command.clientId },
          body: pending.command,
        },
        { signal },
      );
      recovery.guard();
      signal.throwIfAborted();
      const receipt = await requireOperationalAssociationReceipt(
        value,
        pending,
        pending.linkedRevision,
      );
      return await recovery.save({ ...pending, receipt });
    } catch (error) {
      recovery.guard();
      signal.throwIfAborted();
      const parsed = operationalFailureSchema.safeParse(
        error instanceof CapiroApiError ? error.associationFailure : undefined,
      );
      if (
        parsed.success &&
        parsed.data.outcome === "rejected" &&
        parsed.data.requestId === pending.command.requestId
      )
        return recovery.save({ ...pending, refusal: parsed.data });
      throw error;
    }
  });
}

/** Historical recovery depends on current Objective access, not surviving source work. */
export function reconcileAssociation(
  recovery: AssociationRecovery,
  api: AssociationApi,
  signal: AbortSignal,
) {
  return recovery.lock(async () => {
    const pending = await recovery.load();
    if (!pending || pending.refusal) return pending;
    const value = await api.request(
      "objectives.operational.receipt",
      {
        params: {
          clientId: pending.command.clientId,
          requestId: pending.command.requestId,
        },
        query: { schemaVersion: 1, objectiveId: pending.command.objectiveId },
      },
      { signal },
    );
    recovery.guard();
    signal.throwIfAborted();
    const receipt = await requireOperationalAssociationReceipt(
      value,
      pending,
      pending.linkedRevision,
    );
    return recovery.save({ ...pending, receipt });
  });
}

/** Explicit user acknowledgement/review. Failed refresh keeps the old fence. */
export function finishAssociationReview(
  recovery: AssociationRecovery,
  refresh: () => Promise<void>,
) {
  return recovery.lock(async () => {
    const pending = await recovery.load();
    if (!pending || (!pending.receipt && !pending.refusal))
      throw new Error(
        "The original outcome is still uncertain. Check its receipt.",
      );
    await refresh();
    recovery.guard();
    if (pending.receipt) await recovery.acknowledge(pending);
    else await recovery.retire(pending);
  });
}

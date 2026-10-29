// WS-22 scoped intake recovery leaf. Purpose-specific and deliberately pure so
// the exact-request equality, the request identity and the unknown-outcome rule
// are testable in this repository's node test environment; the canonical browser
// journal (`shared/session/recovery/journal`) remains the storage owner and this
// leaf only decides what may be keyed, resumed, replayed or retired.
//
// Three rules, all enforced here rather than in a panel:
//   * the idempotency key is derived from the acting identity and the exact
//     canonical request, so reloading the same intake keeps the same key and a
//     changed payload can never reuse it;
//   * an attempt whose request was never confirmed keeps the identity it already
//     has and is only ever re-sent as that SAME request - the endpoint replays a
//     repeated key and cannot start a second run from it;
//   * a retained attempt for a different payload is retired, never reused.
//
// The record's `fence` is the canonical journal's correlation id for one
// attempt. It is not authority and not an identity of the server's: the Core
// intake id, the run id and the `Idempotency-Key` are separate things, and only
// the endpoint decides what a key means.
import { z } from "zod";
import { intakeBody } from "../../../../shared/capiro/operations/workspace-generation-schemas";
import type { IntakeBody } from "../../../../shared/capiro/operations/workspace-generation-schemas";
import type { RecoveryContract } from "../../../../shared/session/recovery/journal";

export type IntakeActor = {
  tenantId: string;
  userId: string;
  clerkUserId: string;
};

export type IntakeReceipt = {
  draftId: string;
  runId: string;
  agentRevision: number;
};

/** What the journal holds for one acting identity's intake attempt. */
export type IntakeRecoveryRecord = {
  /** The journal's correlation id for this attempt (a UUID); never authority. */
  fence: string;
  /** The `Idempotency-Key` this exact request is sent with. */
  key: string;
  digest: string;
  /** The exact request body the attempt was built from. */
  body: IntakeBody;
  /** Present only once the authoritative response named a draft and a run. */
  receipt?: IntakeReceipt;
};

export type IntakeRecoveryDecision =
  | { kind: "send"; key: string; digest: string; body: IntakeBody }
  | { kind: "check"; record: IntakeRecoveryRecord; reason: string }
  | { kind: "replay"; record: IntakeRecoveryRecord }
  | { kind: "retire"; record: IntakeRecoveryRecord; reason: string };

/**
 * Storage scope for one acting identity. It is intentionally not draft-scoped:
 * an intake is what creates the draft, so the identity that may recover it is
 * the acting Workspace identity, and nothing is keyed by data the caller chose.
 */
export function intakeRecoveryScope(actor: IntakeActor): string {
  return JSON.stringify([
    "workspace-generation-intake",
    actor.tenantId.toLowerCase(),
    actor.userId.toLowerCase(),
    actor.clerkUserId,
  ]);
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
    return `{${entries
      .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

/**
 * Stable client-side digest of an intake body, used only to detect a replayed
 * idempotency key whose payload changed. It is deliberately not a security hash.
 */
export function intakeDigest(body: IntakeBody): string {
  const text = canonical(body);
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `fnv1a:${hash.toString(16).padStart(8, "0")}:${text.length}`;
}

/**
 * The key sent as `Idempotency-Key`. Deterministic in the acting scope and the
 * exact request, so a reload replays instead of creating a second draft, and
 * shaped to the shared `requestIdentity` contract (opaque, bounded, no
 * whitespace or comma). It carries no identity of its own.
 */
export function intakeIdempotencyKey(
  actor: IntakeActor,
  digest: string,
): string {
  const scope = intakeRecoveryScope(actor);
  let hash = 0x811c9dc5;
  for (const text of [scope, digest])
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
  return `ws22-intake-${hash.toString(16).padStart(8, "0")}-${digest.slice(-8)}`;
}

export const intakeReceiptSchema = z.strictObject({
  draftId: z.string().min(1).max(200),
  runId: z.string().min(1).max(200),
  agentRevision: z.number().int().min(0).max(2147483647),
});

/** The journal record, closed: an unreadable or drifted record is not a record. */
export const intakeRetainedSchema = z.strictObject({
  fence: z.uuid(),
  key: z.string().min(8).max(128),
  digest: z.string().min(1).max(200),
  body: intakeBody,
  receipt: intakeReceiptSchema.optional(),
});

/**
 * The canonical journal contract for one attempt: the request and the confirmed
 * receipt are immutable once written, so an attempt can never quietly become a
 * different request, and a confirmed receipt is never replaced by another.
 */
export const intakeRecoveryContract: RecoveryContract<IntakeRecoveryRecord> = {
  schema: intakeRetainedSchema,
  requestId: (value) => value.fence,
  validateUpdate(previous, next) {
    if (
      previous.fence !== next.fence ||
      previous.key !== next.key ||
      previous.digest !== next.digest ||
      canonical(previous.body) !== canonical(next.body) ||
      (previous.receipt !== undefined &&
        canonical(previous.receipt) !== canonical(next.receipt))
    )
      throw new Error(
        "A retained intake attempt cannot change its request or its confirmed receipt.",
      );
  },
};

/** Two attempts are the same request only if key, digest and body all agree. */
export function sameIntakeRequest(
  left: Pick<IntakeRecoveryRecord, "key" | "digest" | "body">,
  right: Pick<IntakeRecoveryRecord, "key" | "digest" | "body">,
): boolean {
  return (
    left.key === right.key &&
    left.digest === right.digest &&
    canonical(left.body) === canonical(right.body)
  );
}

/** The entry a panel retains only after it has read the authoritative receipt. */
export function intakeRetainedRecord(
  record: IntakeRecoveryRecord,
  receipt: IntakeReceipt,
): IntakeRecoveryRecord {
  return { ...record, receipt };
}

/** Why an attempt with no confirmed receipt is not re-sent as a new request. */
export const intakeUnconfirmedReason =
  "An earlier submit of this exact request has no confirmed receipt. Checking it repeats that same request, which the endpoint replays by its key; it cannot start a second run.";

/**
 * Why changed input cannot ride on an unresolved attempt's identity, when that
 * attempt has a confirmed receipt: its run exists and can be read and settled.
 */
export const intakeChangedReason =
  "A different intake for this identity is still unresolved. Read its run, then dismiss it before submitting changed input.";

/**
 * The same refusal for an attempt that was never confirmed. It has no receipt,
 * so there is no run to read and nothing to dismiss yet: the only thing that may
 * happen to it is the explicit check of its own exact request, which is what
 * this reason sends the operator to.
 */
export const intakeChangedUnconfirmedReason =
  "A different intake for this identity has no confirmed receipt yet. Check the interrupted submit first: that repeats the retained exact request, which the endpoint replays by its key, and only then can changed input be submitted.";

export function reviewIntakeRecovery(
  retained: IntakeRecoveryRecord | null | undefined,
  next: { body: IntakeBody; actor: IntakeActor },
): IntakeRecoveryDecision {
  const parsed = intakeBody.safeParse(next.body);
  if (!parsed.success)
    throw new Error("An intake plan cannot be built from an invalid body.");
  const digest = intakeDigest(parsed.data);
  const key = intakeIdempotencyKey(next.actor, digest);
  const current = { key, digest, body: parsed.data };
  if (!retained) return { kind: "send", ...current };
  if (!sameIntakeRequest(retained, current))
    return {
      kind: "retire",
      record: retained,
      reason: retained.receipt
        ? intakeChangedReason
        : intakeChangedUnconfirmedReason,
    };
  if (!retained.receipt)
    return { kind: "check", record: retained, reason: intakeUnconfirmedReason };
  return { kind: "replay", record: retained };
}

// WS-22 scoped intake recovery leaf. Purpose-specific and deliberately pure so
// the exact-request equality, the request identity and the unknown-outcome rule
// are testable in this repository's node test environment; the browser journal
// (`@/shared/session/recovery/journal`) remains the storage owner and this leaf
// only decides what may be keyed, replayed or sent.
//
// Three rules, all enforced here rather than in a panel:
//   * the idempotency key is derived from the acting identity and the exact
//     canonical request, so reloading the same intake keeps the same key and a
//     changed payload can never reuse it;
//   * a retained request with no confirmed receipt is UNKNOWN and must be
//     reconciled against the authoritative run read before another attempt;
//   * a retained request for a different payload is retired, never reused.
import { intakeBody } from "../../../../shared/capiro/operations/workspace-generation-schemas";
import type { IntakeBody } from "../../../../shared/capiro/operations/workspace-generation-schemas";

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
  key: string;
  digest: string;
  receipt?: IntakeReceipt;
};

export type IntakeRecoveryDecision =
  | { kind: "send"; key: string; digest: string }
  | { kind: "replay"; record: IntakeRecoveryRecord }
  | {
      kind: "reconcile";
      record: IntakeRecoveryRecord;
      reason: string;
    }
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

/** The entry a panel retains only after it has read the authoritative receipt. */
export function intakeRetainedRecord(
  record: IntakeRecoveryRecord | null | undefined,
  receipt: IntakeReceipt,
): IntakeRecoveryRecord {
  if (!record) throw new Error("A retained intake record is required.");
  return { key: record.key, digest: record.digest, receipt };
}

export function reviewIntakeRecovery(
  retained: IntakeRecoveryRecord | null | undefined,
  next: { body: IntakeBody; actor: IntakeActor },
): IntakeRecoveryDecision {
  const parsed = intakeBody.safeParse(next.body);
  if (!parsed.success)
    throw new Error("An intake plan cannot be built from an invalid body.");
  const digest = intakeDigest(parsed.data);
  const key = intakeIdempotencyKey(next.actor, digest);
  if (!retained) return { kind: "send", key, digest };
  if (retained.digest !== digest)
    return {
      kind: "retire",
      record: retained,
      reason:
        "A different intake for this identity is still unresolved. Read its run before submitting changed input.",
    };
  if (!retained.receipt)
    return {
      kind: "reconcile",
      record: retained,
      reason:
        "An earlier attempt for this exact request has no confirmed receipt. Read the authoritative run status before submitting again.",
    };
  return { kind: "replay", record: retained };
}

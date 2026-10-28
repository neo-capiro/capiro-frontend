// WS-22 durable intake planning for the Workspace two-step draft owner
// (`quick-draft/two-step-draft.controller.ts`: POST /document-agent/intakes).
//
// The endpoint is idempotent on its `Idempotency-Key` header, so the key is
// derived (never invented ad hoc) by the scoped recovery leaf from the acting
// identity and the exact canonical request, and the same leaf decides whether
// an attempt may be sent, replayed, or must first be reconciled against the
// authoritative run read.
//
// The action itself is unactivated: the run this endpoint queues is drafted by
// the legacy provider path (see `owner-map.ts`), so this planner refuses to
// build a request for it and the panel renders that reason instead of a button.
import { intakeBody } from "../../../../shared/capiro/operations/workspace-generation-schemas";
import type { IntakeBody } from "../../../../shared/capiro/operations/workspace-generation-schemas";
import { invalid, refusal, withheld, type GenerationPlan } from "./controller";
import {
  reviewIntakeRecovery,
  type IntakeActor,
  type IntakeRecoveryRecord,
} from "./intake-recovery";
import {
  intakeGenerationWithheld,
  isMountedGenerationOperation,
} from "./owner-map";

export { intakeDigest } from "./intake-recovery";
export type { IntakeActor, IntakeRecoveryRecord } from "./intake-recovery";

/** Whether the durable-intake submit action is activated for this consumer. */
export function intakeSubmitActivated(): boolean {
  return isMountedGenerationOperation("workspace.generation.intake");
}

export function planIntake(args: {
  /** From `intakeSubmitActivated()`; the dispatch guard checks it again. */
  activated: boolean;
  capability: { enabled: boolean };
  body: IntakeBody;
  actor: IntakeActor;
  retained?: IntakeRecoveryRecord | null;
}): GenerationPlan {
  if (!args.activated) return withheld(intakeGenerationWithheld);
  if (!args.capability.enabled)
    return refusal("Two-step drafting is not enabled for this workspace.");
  if (
    args.body.factualAttachmentIds.length === 0 &&
    args.body.sampleAttachmentIds.length === 0 &&
    args.body.priorWorkspaceDraftIds.length === 0 &&
    !args.body.pastedContext &&
    !args.body.pastedSample
  )
    return refusal("Supply at least one source before submitting an intake.");
  const parsed = intakeBody.safeParse(args.body);
  if (!parsed.success) return refusal(invalid(parsed));
  const decision = reviewIntakeRecovery(args.retained ?? null, {
    body: parsed.data,
    actor: args.actor,
  });
  if (decision.kind === "replay")
    return { kind: "replay", entry: decision.record };
  if (decision.kind === "reconcile" || decision.kind === "retire")
    return refusal(decision.reason);
  return {
    kind: "request",
    operation: "workspace.generation.intake",
    input: { body: parsed.data, idempotencyKey: decision.key },
  };
}

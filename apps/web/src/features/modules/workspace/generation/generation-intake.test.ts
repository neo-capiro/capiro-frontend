import { expect, it } from "vitest";
import {
  intakeDigest,
  intakeIdempotencyKey,
  intakeRecoveryScope,
  reviewIntakeRecovery,
} from "./intake-recovery";
import { intakeSubmitActivated, planIntake } from "./intake";
import { intakeGenerationWithheld } from "./owner-map";

const actor = {
  tenantId: "00000000-0000-4000-8000-0000000000aa",
  userId: "00000000-0000-4000-8000-0000000000bb",
  clerkUserId: "user_clerk_1",
};

const intake = (over: Record<string, unknown> = {}) => ({
  goal: "Defend the 2027 program",
  blueprintVersionId: "bp-1",
  factualAttachmentIds: ["att-1"],
  sampleAttachmentIds: [],
  priorWorkspaceDraftIds: [],
  ...over,
});

it("is not activated: the planner refuses a request and names the legacy generation behind it", () => {
  expect(intakeSubmitActivated()).toBe(false);
  const plan = planIntake({
    activated: intakeSubmitActivated(),
    capability: { enabled: true },
    body: intake(),
    actor,
  });
  expect(plan).toEqual({ kind: "withheld", reason: intakeGenerationWithheld });
  // The recorded evidence, not a generic "unavailable".
  expect(intakeGenerationWithheld).toContain("GenerationService");
  expect(intakeGenerationWithheld).toContain("drafting stage");
});

it("would send the exact request with its derived key once the owner is bridged", () => {
  const plan = planIntake({
    activated: true,
    capability: { enabled: true },
    body: intake(),
    actor,
  });
  if (plan.kind !== "request")
    throw new Error(`expected a request, got ${plan.kind}`);
  expect(plan.operation).toBe("workspace.generation.intake");
  expect(plan.input.params).toBeUndefined();
  expect(plan.input.body).toMatchObject({ goal: "Defend the 2027 program" });
  expect(plan.input.idempotencyKey).toBe(
    intakeIdempotencyKey(actor, intakeDigest(intake())),
  );
  expect(plan.input.idempotencyKey).toMatch(/^[A-Za-z0-9._:-]{8,128}$/);
});

it("derives a key from the acting identity and the exact request, never from the caller", () => {
  const body = intake();
  const digest = intakeDigest(body);
  expect(intakeIdempotencyKey(actor, digest)).toBe(
    intakeIdempotencyKey(actor, intakeDigest({ ...body })),
  );
  expect(intakeIdempotencyKey(actor, digest)).not.toBe(
    intakeIdempotencyKey({ ...actor, clerkUserId: "user_clerk_2" }, digest),
  );
  expect(intakeIdempotencyKey(actor, digest)).not.toBe(
    intakeIdempotencyKey(actor, intakeDigest(intake({ goal: "Another goal" }))),
  );
  const scope = intakeRecoveryScope(actor);
  expect(scope).toContain(actor.clerkUserId);
  expect(scope).not.toContain(body.goal);
});

it("digests the same payload identically regardless of key order", () => {
  const ordered = intake();
  const reordered = {
    priorWorkspaceDraftIds: ordered.priorWorkspaceDraftIds,
    sampleAttachmentIds: ordered.sampleAttachmentIds,
    factualAttachmentIds: ordered.factualAttachmentIds,
    blueprintVersionId: ordered.blueprintVersionId,
    goal: ordered.goal,
  };
  expect(intakeDigest(reordered)).toBe(intakeDigest(ordered));
  expect(intakeDigest(intake({ tone: "formal" }))).not.toBe(
    intakeDigest(ordered),
  );
});

it("replays a confirmed receipt, reconciles an unknown outcome and retires changed input", () => {
  const digest = intakeDigest(intake());
  const key = intakeIdempotencyKey(actor, digest);
  const receipt = { draftId: "draft-1", runId: "run-1", agentRevision: 3 };
  expect(
    reviewIntakeRecovery({ key, digest, receipt }, { body: intake(), actor }),
  ).toEqual({ kind: "replay", record: { key, digest, receipt } });
  expect(reviewIntakeRecovery(null, { body: intake(), actor })).toEqual({
    kind: "send",
    key,
    digest,
  });
  const unknown = reviewIntakeRecovery(
    { key, digest },
    { body: intake(), actor },
  );
  expect(unknown.kind).toBe("reconcile");
  if (unknown.kind !== "reconcile") throw new Error("unreachable");
  expect(unknown.reason).toContain("authoritative run status");
  const changed = reviewIntakeRecovery(
    { key, digest, receipt },
    { body: intake({ goal: "Another goal" }), actor },
  );
  expect(changed.kind).toBe("retire");
  if (changed.kind !== "retire") throw new Error("unreachable");
  expect(changed.reason).toContain("unresolved");
});

it("keeps an unconfirmed attempt and changed input from being resubmitted", () => {
  const digest = intakeDigest(intake());
  const retained = { key: intakeIdempotencyKey(actor, digest), digest };
  expect(
    planIntake({
      activated: true,
      capability: { enabled: true },
      body: intake(),
      actor,
      retained,
    }).kind,
  ).toBe("refusal");
  expect(
    planIntake({
      activated: true,
      capability: { enabled: true },
      body: intake({ goal: "Another goal" }),
      actor,
      retained,
    }).kind,
  ).toBe("refusal");
  expect(
    planIntake({
      activated: true,
      capability: { enabled: true },
      body: intake(),
      actor,
      retained: {
        ...retained,
        receipt: { draftId: "draft-1", runId: "run-1", agentRevision: 1 },
      },
    }).kind,
  ).toBe("replay");
});

it("still refuses an intake body that drifts from the delivered contract, or has no source", () => {
  const base = { activated: true, capability: { enabled: true }, actor };
  expect(
    planIntake({ ...base, body: intake({ inventedField: true }) }).kind,
  ).toBe("refusal");
  expect(planIntake({ ...base, body: intake({ goal: "ab" }) }).kind).toBe(
    "refusal",
  );
  expect(
    planIntake({ ...base, capability: { enabled: false }, body: intake() })
      .kind,
  ).toBe("refusal");
  expect(
    planIntake({
      ...base,
      body: intake({
        factualAttachmentIds: [],
        sampleAttachmentIds: [],
        priorWorkspaceDraftIds: [],
      }),
    }).kind,
  ).toBe("refusal");
  expect(
    planIntake({
      ...base,
      body: intake({
        factualAttachmentIds: [],
        pastedContext: "Some pasted evidence",
      }),
    }).kind,
  ).toBe("request");
});

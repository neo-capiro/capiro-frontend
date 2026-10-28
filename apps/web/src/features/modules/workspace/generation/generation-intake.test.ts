import { expect, it } from "vitest";
import {
  intakeBody,
  type GenerationRunStatus,
} from "../../../../shared/capiro/operations/workspace-generation-schemas";
import {
  intakeDigest,
  intakeIdempotencyKey,
  intakeRecoveryContract,
  intakeRecoveryScope,
  intakeRetainedRecord,
  intakeRetainedSchema,
  reviewIntakeRecovery,
  sameIntakeRequest,
  type IntakeRecoveryRecord,
} from "./intake-recovery";
import { authorizeGenerationDispatch } from "./controller";
import {
  intakeCheckOffered,
  intakeDismissable,
  intakeRetainedCheck,
  intakeRetainedFor,
  intakeRunNotice,
  intakeRunResolved,
  intakeRunView,
  intakeScopeOf,
  intakeSubmitActivated,
  planIntake,
} from "./intake";

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

/** One attempt as the canonical journal holds it, before any receipt. */
const attempt = (
  over: Partial<IntakeRecoveryRecord> = {},
): IntakeRecoveryRecord => ({
  fence: "00000000-0000-4000-8000-0000000000cc",
  key: intakeIdempotencyKey(actor, intakeDigest(intake())),
  digest: intakeDigest(intake()),
  body: intakeBody.parse(intake()),
  ...over,
});

it("is activated: the planner builds the request and only withholds an unactivated action", () => {
  expect(intakeSubmitActivated()).toBe(true);
  const plan = planIntake({
    activated: intakeSubmitActivated(),
    capability: { enabled: true },
    body: intake(),
    actor,
  });
  expect(plan.kind).toBe("request");
  // The action is mounted, so the only way it can still be withheld is that it
  // is not activated for this consumer at all - and the reason says exactly
  // that, rather than naming a legacy owner that no longer drafts the run.
  const withdrawn = planIntake({
    activated: false,
    capability: { enabled: true },
    body: intake(),
    actor,
  });
  expect(withdrawn.kind).toBe("withheld");
  if (withdrawn.kind !== "withheld") throw new Error("unreachable");
  expect(withdrawn.reason).toContain("not activated");
  expect(withdrawn.reason).not.toContain("GenerationService");
});

it("sends the exact request with its derived key and hands back what to retain", () => {
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
  // The caller is handed the identity of the attempt it is about to send, so an
  // unconfirmed outcome is reconciled against this same request.
  expect(plan.retain).toEqual({
    key: intakeIdempotencyKey(actor, intakeDigest(intake())),
    digest: intakeDigest(intake()),
  });
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

it("replays a confirmed receipt, checks an unconfirmed one and retires changed input", () => {
  const digest = intakeDigest(intake());
  const key = intakeIdempotencyKey(actor, digest);
  const receipt = { draftId: "draft-1", runId: "run-1", agentRevision: 3 };
  const confirmed = attempt({ receipt });
  expect(reviewIntakeRecovery(confirmed, { body: intake(), actor })).toEqual({
    kind: "replay",
    record: confirmed,
  });
  expect(reviewIntakeRecovery(null, { body: intake(), actor })).toEqual({
    kind: "send",
    key,
    digest,
    body: intake(),
  });
  // No confirmed receipt: the attempt keeps its identity, and the only thing
  // that may happen to it is a repeat of that same request.
  const unknown = reviewIntakeRecovery(attempt(), { body: intake(), actor });
  expect(unknown.kind).toBe("check");
  if (unknown.kind !== "check") throw new Error("unreachable");
  expect(unknown.reason).toContain("no confirmed receipt");
  expect(unknown.record.key).toBe(key);
  const changed = reviewIntakeRecovery(attempt({ receipt }), {
    body: intake({ goal: "Another goal" }),
    actor,
  });
  expect(changed.kind).toBe("retire");
  if (changed.kind !== "retire") throw new Error("unreachable");
  expect(changed.reason).toContain("unresolved");
});

it("keeps an unconfirmed attempt on its own exact request and refuses changed input", () => {
  const retained = attempt();
  const planned = (body: ReturnType<typeof intake>) =>
    planIntake({
      activated: true,
      capability: { enabled: true },
      body,
      actor,
      retained,
    });
  // An unconfirmed attempt is a real request again - the SAME one: the retained
  // exact body and the key it was already sent with, so the endpoint replays it
  // instead of starting a second run.
  const resumed = planned(intake());
  expect(resumed.kind).toBe("request");
  if (resumed.kind !== "request") throw new Error("unreachable");
  expect(resumed.input.body).toEqual(retained.body);
  expect(resumed.input.idempotencyKey).toBe(retained.key);
  expect(resumed.retain).toEqual({ key: retained.key, digest: retained.digest });
  // Changed input never rides on that identity.
  expect(planned(intake({ goal: "Another goal" })).kind).toBe("refusal");
  // A confirmed receipt is replayed, never re-sent.
  expect(planned(intake()).kind).toBe("request");
  const replay = planIntake({
    activated: true,
    capability: { enabled: true },
    body: intake(),
    actor,
    retained: attempt({
      receipt: { draftId: "draft-1", runId: "run-1", agentRevision: 1 },
    }),
  });
  expect(replay.kind).toBe("replay");
  expect(
    planIntake({
      activated: true,
      capability: { enabled: true },
      body: intake({ goal: "Another goal" }),
      actor,
      retained: attempt({
        receipt: { draftId: "draft-1", runId: "run-1", agentRevision: 1 },
      }),
    }).kind,
  ).toBe("refusal");
});

it("holds the attempt as one closed, immutable journal record", () => {
  const record = attempt();
  expect(intakeRetainedSchema.safeParse(record).success).toBe(true);
  expect(intakeRecoveryContract.requestId(record)).toBe(record.fence);
  // A drifted or widened record is not a record this consumer may act on.
  expect(intakeRetainedSchema.safeParse({ ...record, fence: "not-a-uuid" }).success).toBe(false);
  expect(intakeRetainedSchema.safeParse({ ...record, extra: true }).success).toBe(false);
  expect(intakeRetainedSchema.safeParse({ ...record, body: undefined }).success).toBe(false);
  expect(intakeRetainedSchema.safeParse({ ...record, key: "short" }).success).toBe(false);
  const update = intakeRecoveryContract.validateUpdate;
  if (!update) throw new Error("the contract must validate its own updates");
  const receipt = { draftId: "draft-1", runId: "run-1", agentRevision: 2 };
  expect(() => update(record, intakeRetainedRecord(record, receipt))).not.toThrow();
  expect(() => update(record, attempt({ key: "ws22-intake-00000000-00000000" }))).toThrow();
  expect(() => update(record, attempt({ digest: "another" }))).toThrow();
  expect(() => update(record, attempt({ body: intakeBody.parse(intake({ goal: "Other goal" })) }))).toThrow();
  expect(() =>
    update(record, {
      ...record,
      fence: "00000000-0000-4000-8000-0000000000dd",
    }),
  ).toThrow();
  const confirmed = intakeRetainedRecord(record, receipt);
  expect(() =>
    update(confirmed, intakeRetainedRecord(confirmed, { ...receipt, runId: "run-2" })),
  ).toThrow();
  // Equality is over the whole request, not just the digest.
  expect(sameIntakeRequest(confirmed, record)).toBe(true);
  expect(
    sameIntakeRequest(confirmed, { ...record, key: "ws22-intake-00000000-00000000" }),
  ).toBe(false);
});

it("settles an attempt only through its own run once that run has resolved", () => {
  const receipt = { draftId: "draft-1", runId: "run-1", agentRevision: 2 };
  const run = (status: string, runId = "run-1") =>
    intakeRunView({ runId, status, stage: "drafting", stages: [], sectionStates: {} });
  expect(intakeDismissable(null, run("complete"))).toBe(false);
  // An unconfirmed attempt has nothing to settle: it stays until it is checked.
  expect(intakeDismissable(attempt(), run("complete"))).toBe(false);
  expect(intakeDismissable(attempt({ receipt }), undefined)).toBe(false);
  expect(intakeDismissable(attempt({ receipt }), run("active"))).toBe(false);
  expect(intakeDismissable(attempt({ receipt }), run("complete", "run-2"))).toBe(false);
  for (const status of ["complete", "partial", "failed", "cancelled"])
    expect(intakeDismissable(attempt({ receipt }), run(status)), status).toBe(true);
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

it("reports a run's current status explicitly and ignores a record from another scope", () => {
  const scope = intakeScopeOf(actor);
  const record = attempt({
    receipt: { draftId: "draft-1", runId: "run-1", agentRevision: 1 },
  });
  // A record retained under another identity is not this caller's: it neither
  // suppresses nor replays this caller's submit.
  expect(intakeRetainedFor(scope, { scope: "another", record })).toBeNull();
  expect(intakeRetainedFor(scope, { scope, record })).toEqual(record);
  expect(intakeRetainedFor(scope, null)).toBeNull();

  for (const status of ["complete", "partial", "failed", "cancelled"])
    expect(intakeRunResolved(status), status).toBe(true);
  for (const status of ["queued", "active"])
    expect(intakeRunResolved(status), status).toBe(false);

  const run = (over: Partial<GenerationRunStatus> = {}): GenerationRunStatus => ({
    runId: "run-1",
    status: "active",
    stage: "drafting",
    stages: [],
    sectionStates: {},
    ...over,
  });
  expect(intakeRunView(undefined)).toBeUndefined();
  expect(intakeRunView(run())?.stages).toEqual([]);
  expect(intakeRunView(run())?.sections).toEqual([]);
  expect(intakeRunNotice(intakeRunView(run()))).toContain("stage drafting");
  expect(intakeRunNotice(intakeRunView(run({ status: "cancelled" })))).toContain(
    "cancelled",
  );
  const failed = intakeRunNotice(
    intakeRunView(run({ status: "failed", errorMessage: "owner unavailable" })),
  );
  expect(failed).toContain("failed");
  expect(failed).toContain("owner unavailable");
  const complete = intakeRunNotice(
    intakeRunView(
      run({ status: "complete", sectionStates: { Executive: { status: "approved" } } }),
    ),
  );
  expect(complete).toContain("complete");
  expect(complete).toContain("1 section");
  // A section that failed carries its own reason into the reading.
  expect(
    intakeRunView(
      run({ sectionStates: { Executive: { status: "failed", error: "bad" } } }),
    )?.sections,
  ).toEqual([{ name: "Executive", status: "failed", error: "bad" }]);
});

it("keeps the retained exact request checkable after the form has been edited", () => {
  const base = { activated: true, capability: { enabled: true }, actor };
  const held = attempt();
  const edited = intake({
    goal: "A different goal",
    blueprintVersionId: "bp-2",
  });
  const current = planIntake({ ...base, body: edited, retained: held });
  // Changed input is refused on the retained attempt's identity, and the refusal
  // words the ACTUAL state: an unconfirmed attempt has no receipt, so there is no
  // run to read and nothing to dismiss yet.
  expect(current.kind).toBe("refusal");
  if (current.kind !== "refusal") throw new Error("unreachable");
  expect(current.reason).toContain("Check the interrupted submit");
  expect(current.reason).not.toContain("Read its run");
  // The check is the retained attempt's own request, planned from the record and
  // never from the edited form.
  const check = intakeRetainedCheck({ ...base, retained: held });
  expect(check?.kind).toBe("request");
  if (check?.kind !== "request") throw new Error("unreachable");
  expect(check.input.body).toEqual(held.body);
  expect(check.input.idempotencyKey).toBe(held.key);
  expect(check.retain).toEqual({ key: held.key, digest: held.digest });
  expect(JSON.stringify(check.input)).not.toContain("A different goal");
  // It is offered beside that refusal, and is not the same request the form now
  // plans - so the edited form can neither hide the check nor alter it.
  expect(intakeCheckOffered(current, check)).toBe(true);
  expect(
    intakeCheckOffered(
      planIntake({ ...base, body: intake(), retained: held }),
      check,
    ),
  ).toBe(false);
  expect(intakeCheckOffered(current, null)).toBe(false);
  expect(
    intakeCheckOffered(
      current,
      intakeRetainedCheck({ ...base, retained: null }),
    ),
  ).toBe(false);
  // The same dispatch guard still applies to the check control.
  expect(authorizeGenerationDispatch(check, "viewer")).toEqual({
    allowed: false,
    reason:
      "Editing this document requires the owner, editor or reviewer role.",
  });
  expect(authorizeGenerationDispatch(check, "owner").allowed).toBe(true);
});

it("words a confirmed attempt's refusal as read-then-dismiss, and never checks it", () => {
  const base = { activated: true, capability: { enabled: true }, actor };
  const confirmed = attempt({
    receipt: { draftId: "draft-1", runId: "run-1", agentRevision: 2 },
  });
  const current = planIntake({
    ...base,
    body: intake({ goal: "A different goal" }),
    retained: confirmed,
  });
  expect(current.kind).toBe("refusal");
  if (current.kind !== "refusal") throw new Error("unreachable");
  expect(current.reason).toContain("Read its run, then dismiss");
  // A confirmed attempt is a replay reading, not a check: it is never re-sent.
  const check = intakeRetainedCheck({ ...base, retained: confirmed });
  expect(check?.kind).toBe("replay");
  expect(intakeCheckOffered(current, check)).toBe(false);
});

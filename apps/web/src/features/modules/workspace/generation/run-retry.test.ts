// The durable run-continuation leaf, driven directly: what may be offered for a
// run, which run it may name, and what the route's own answer is allowed to mean.
//
// The producer facts these cases pin are read from the worker itself
// (`quick-draft/generation-run-worker.service.ts`): its atomic claim accepts only
// a `queued` run or an `active` run whose lease expired, a durable-intake run
// without a current credential answers `awaiting-current-access`, and the reply
// carries the run's own current status and NOTHING about whether the
// reconciliation took the retained request up - the worker awaits
// `reconcileRetainedNativeRequest` and discards its boolean, which is itself false
// for a run with nothing retained, for a current-access refusal and for a lease
// another worker still holds. A status alone therefore proves no effect in either
// direction, which is what the wording cases below pin.
import { expect, it } from "vitest";
import { workspaceGenerationOperations } from "../../../../shared/capiro/operations/workspace-generation";
import { intakeBody } from "../../../../shared/capiro/operations/workspace-generation-schemas";
import { authorizeGenerationDispatch } from "./controller";
import { intakeDigest, intakeIdempotencyKey } from "./intake-recovery";
import type { IntakeActor, IntakeRecoveryRecord } from "./intake-recovery";
import type { IntakeRunView } from "./intake";
import { planRunRetry, runRetryNotice, runRetryOutcome } from "./run-retry";

const actor: IntakeActor = {
  tenantId: "00000000-0000-4000-8000-0000000000aa",
  userId: "00000000-0000-4000-8000-0000000000bb",
  clerkUserId: "user_clerk_1",
};

const runId = "00000000-0000-4000-8000-0000000000e1";
const otherRunId = "00000000-0000-4000-8000-0000000000e2";

/** One retained attempt with the receipt its own submit confirmed. */
const retained = (receiptRunId: string = runId): IntakeRecoveryRecord => {
  const body = intakeBody.parse({
    goal: "Defend the 2027 program",
    blueprintVersionId: "bp-1",
    factualAttachmentIds: ["att-1"],
    sampleAttachmentIds: [],
    priorWorkspaceDraftIds: [],
  });
  const digest = intakeDigest(body);
  return {
    fence: "00000000-0000-4000-8000-0000000000cc",
    key: intakeIdempotencyKey(actor, digest),
    digest,
    body,
    receipt: {
      draftId: "00000000-0000-4000-8000-0000000000d1",
      runId: receiptRunId,
      agentRevision: 2,
    },
  };
};

/** The run status this surface read for that receipt's run. */
const run = (over: Partial<IntakeRunView> = {}): IntakeRunView => ({
  runId,
  status: "active",
  stage: "drafting",
  stages: [],
  sections: [],
  ...over,
});

const base = { activated: true, capability: { enabled: true } };

it("offers the continuation of the receipt's own run while it is still live", () => {
  for (const status of ["queued", "active"]) {
    const plan = planRunRetry({
      ...base,
      record: retained(),
      run: run({ status }),
    });
    if (plan.kind !== "request")
      throw new Error(`expected a continuation plan for a ${status} run`);
    // Exactly the one run the receipt named, and no request identity or retained
    // key - nothing here mints an identity. The body is the route's closed
    // native-only marker, and this leaf builds no other workflow.
    expect(plan.operation).toBe("workspace.generation.run.retryFailed");
    expect(plan.input).toEqual({
      params: { runId },
      body: { workflow: "native-retained" },
    });
    // The plan's own request satisfies the operation's closed request schema: the
    // marker this leaf sends is the declared one, and the schema rejects every
    // other shape.
    expect(
      workspaceGenerationOperations[
        "workspace.generation.run.retryFailed"
      ].request.safeParse(plan.input).success,
    ).toBe(true);
    expect(
      workspaceGenerationOperations[
        "workspace.generation.run.retryFailed"
      ].request.safeParse({
        params: { runId },
        body: { workflow: "legacy" },
      }).success,
    ).toBe(false);
    expect(plan.retain).toBeUndefined();
    expect(JSON.stringify(plan.input)).not.toContain(otherRunId);
    // The dispatch guard admits it for an editing role and refuses a read-only
    // one with the same reason the service's canEdit would give.
    expect(authorizeGenerationDispatch(plan, "editor").allowed).toBe(true);
    const readOnly = authorizeGenerationDispatch(plan, "viewer");
    expect(readOnly.allowed).toBe(false);
    if (!readOnly.allowed)
      expect(readOnly.reason).toContain(
        "requires the owner, editor or reviewer role",
      );
  }
});

it("refuses to continue a run the worker has already resolved", () => {
  for (const status of ["complete", "partial", "failed", "cancelled"]) {
    const plan = planRunRetry({
      ...base,
      record: retained(),
      run: run({ status }),
    });
    if (plan.kind !== "refusal")
      throw new Error(`expected ${status} to be reported, not promised`);
    // The refusal names the real state and says what it means: a resolved run
    // does not generate at all through this route.
    expect(plan.reason).toContain(runId);
    expect(plan.reason).toContain(status);
    expect(plan.reason).toContain("does not generate");
    expect(plan.reason).not.toContain("resumed");
  }
});

it("never builds a continuation for a run this surface did not submit", () => {
  // A run read for another run is not this attempt's run, whatever it reports.
  const other = planRunRetry({
    ...base,
    record: retained(),
    run: run({ runId: otherRunId }),
  });
  expect(other.kind).toBe("refusal");
  if (other.kind === "refusal")
    expect(other.reason).toContain("has not been read");

  // No receipt at all: there is no run of this surface's to continue.
  const none = planRunRetry({ ...base, record: null, run: run() });
  expect(none.kind).toBe("refusal");
  if (none.kind === "refusal") expect(none.reason).toContain("no receipt");

  // A run that has not been read yet is read first, never continued blind.
  const unread = planRunRetry({ ...base, record: retained(), run: undefined });
  expect(unread.kind).toBe("refusal");

  // An unactivated owner and a disabled capability are reported, not attempted.
  const off = planRunRetry({
    activated: false,
    capability: { enabled: true },
    record: retained(),
    run: run(),
  });
  expect(off.kind).toBe("withheld");
  const disabled = planRunRetry({
    ...base,
    capability: { enabled: false },
    record: retained(),
    run: run(),
  });
  expect(disabled.kind).toBe("refusal");
});

it("correlates the reply with the run that was asked about", () => {
  // A live status is reported as the run's own status and nothing more: the
  // route answers with the run's current status, so this case is `pending`.
  expect(runRetryOutcome({ runId, status: "active" }, runId)).toEqual({
    kind: "pending",
    runId,
    status: "active",
  });
  expect(runRetryOutcome({ runId, status: "queued" }, runId)).toEqual({
    kind: "pending",
    runId,
    status: "queued",
  });
  // A reply for another run is never applied to this one.
  expect(
    runRetryOutcome({ runId: otherRunId, status: "active" }, runId),
  ).toEqual({
    kind: "other-run",
    expected: runId,
    reported: otherRunId,
  });
  // A durable-intake run without a current credential was not continued at all:
  // that is the route's own explicit report, and it stays exact.
  expect(
    runRetryOutcome({ runId, status: "awaiting-current-access" }, runId),
  ).toEqual({ kind: "awaiting-current-access", runId });
  // A terminal status is reported as the status the route returned. It is not
  // read as evidence that no work happened: a real resume can end terminal too.
  expect(runRetryOutcome({ runId, status: "failed" }, runId)).toEqual({
    kind: "resolved",
    runId,
    status: "failed",
  });
  expect(runRetryOutcome({ runId, status: "complete" }, runId)).toEqual({
    kind: "resolved",
    runId,
    status: "complete",
  });
  // A drifted or absent reply confirms nothing.
  for (const reply of [
    undefined,
    {},
    { runId, status: "succeeded" },
    { runId, status: "active", extra: true },
    { status: "active" },
  ])
    expect(runRetryOutcome(reply, runId).kind, JSON.stringify(reply)).toBe(
      "unconfirmed",
    );
});

it("reports each outcome in the terms the producer actually reported", () => {
  // `queued`/`active` cannot claim a resume: the same status is returned when the
  // reconciliation did nothing (no retained request, a live lease, or a refusal).
  for (const status of ["queued", "active"]) {
    const pending = runRetryNotice({ kind: "pending", runId, status });
    expect(pending).toContain(runId);
    expect(pending).toContain(status);
    expect(pending).toContain("pending");
    expect(pending).not.toContain("resumed");
    expect(pending).not.toContain("no new turn");
    expect(pending).not.toContain("was continued");
    expect(pending).not.toContain("succeeded");
  }

  // A terminal status cannot claim that nothing was done: a real resume may end
  // terminal, so only the reported status is stated.
  for (const status of ["complete", "partial", "failed", "cancelled"]) {
    const resolved = runRetryNotice({ kind: "resolved", runId, status });
    expect(resolved).toContain(runId);
    expect(resolved).toContain(status);
    expect(resolved).not.toContain("nothing was continued");
    expect(resolved).not.toContain("resumed");
    expect(resolved).not.toContain("no work");
  }

  // The credential refusal stays exact: the route reports it, and the retained
  // request is unchanged.
  const awaiting = runRetryNotice({ kind: "awaiting-current-access", runId });
  expect(awaiting).toContain(runId);
  expect(awaiting).toContain("awaiting-current-access");
  expect(awaiting).toContain("no current session credential");
  expect(awaiting).toContain("unchanged");
  expect(awaiting).not.toContain("resumed");

  const wrongRun = runRetryNotice({
    kind: "other-run",
    expected: runId,
    reported: otherRunId,
  });
  expect(wrongRun).toContain(otherRunId);
  expect(wrongRun).toContain("nothing was applied to this run");

  // An uncertain answer sends the caller to a read and never to a second send.
  const unconfirmed = runRetryNotice({ kind: "unconfirmed" });
  expect(unconfirmed).toContain("nothing about it is claimed");
  expect(unconfirmed).toContain("Read its current status");
  expect(unconfirmed).toContain("no second request was sent");
});

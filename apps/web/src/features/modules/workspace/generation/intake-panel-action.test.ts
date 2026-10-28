// The intake panel's own action decision, driven directly with the state its
// submit hook returns. The mounted panel renders exactly this decision (see
// `generation-panel-mount.test.ts`), so this is where the edited-form case is
// proven: the form that no longer plans the retained request still gets the
// explicit check of that request, and the check submits the retained body and key
// rather than the edited fields.
import { expect, it } from "vitest";
import { intakeBody } from "../../../../shared/capiro/operations/workspace-generation-schemas";
import {
  intakePanelAction,
  intakeRunFailedUnitsRetryAction,
  intakeRunRetryAction,
} from "./IntakePanel";
import { authorizeGenerationDispatch } from "./controller";
import { intakeCheckOffered, intakeRetainedCheck, planIntake } from "./intake";
import {
  intakeDigest,
  intakeIdempotencyKey,
  type IntakeActor,
  type IntakeRecoveryRecord,
} from "./intake-recovery";
import { planRunRetry } from "./run-retry";
import type { IntakeSubmitState } from "./use-intake-submit";

const actor: IntakeActor = {
  tenantId: "00000000-0000-4000-8000-0000000000aa",
  userId: "00000000-0000-4000-8000-0000000000bb",
  clerkUserId: "user_clerk_1",
};

/** One retained attempt with no confirmed receipt, as a reload would find it. */
const retained = (): IntakeRecoveryRecord => {
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
  };
};

/** The panel's state, as its hook returns it for one situation. */
const panelState = (over: Partial<IntakeSubmitState>): IntakeSubmitState => ({
  ready: true,
  fields: { goal: "", blueprintVersionId: "", pastedContext: "" },
  setField: () => {},
  plan: null,
  retainedCheck: null,
  retainedCheckDecision: null,
  checkOffered: false,
  decision: null,
  runRetry: { kind: "withheld", reason: "not activated for this consumer" },
  runRetryDecision: {
    allowed: false,
    reason: "not activated for this consumer",
  },
  runFailedUnitsRetry: {
    kind: "withheld",
    reason: "not activated for this consumer",
  },
  runFailedUnitsRetryDecision: {
    allowed: false,
    reason: "not activated for this consumer",
  },
  busy: false,
  notice: "",
  failure: "",
  recoveryError: undefined,
  retryRecovery: () => {},
  record: null,
  run: undefined,
  runError: undefined,
  dismissable: false,
  submit: async () => {},
  continueRun: async () => {},
  dismiss: async () => {},
  ...over,
});

it("offers the retained exact request for checking when the edited form no longer plans it", () => {
  const record = retained();
  const edited = intakeBody.parse({
    goal: "A different goal",
    blueprintVersionId: "bp-2",
    factualAttachmentIds: ["att-1"],
    sampleAttachmentIds: [],
    priorWorkspaceDraftIds: [],
  });
  const base = { activated: true, capability: { enabled: true }, actor };
  const current = planIntake({ ...base, body: edited, retained: record });
  const check = intakeRetainedCheck({ ...base, retained: record });
  if (check?.kind !== "request")
    throw new Error("expected the retained attempt to plan its own request");
  const state = (role: "owner" | "viewer") =>
    panelState({
      plan: current,
      record,
      decision: authorizeGenerationDispatch(current, role),
      retainedCheck: check,
      retainedCheckDecision: authorizeGenerationDispatch(check, role),
      checkOffered: intakeCheckOffered(current, check),
    });
  const action = intakePanelAction(state("owner"));
  if (!action) throw new Error("expected the panel to offer an action");
  // The edited form is refused on the retained attempt's identity - it is never
  // submitted - and the refusal sends the operator to the check, not to a run
  // that does not exist yet.
  expect(action.label).toBe("Submit changed input");
  expect(action.allowed).toBe(false);
  expect(action.reason).toContain("Check the interrupted submit");
  expect(action.reason).not.toContain("Read its run");
  // The check control is offered, and the plan it would submit is the retained
  // attempt's own request, so the edited form cannot alter what it sends.
  expect(action.check?.allowed).toBe(true);
  const sent = action.check?.plan;
  if (sent?.kind !== "request")
    throw new Error("expected the check control to submit a request");
  expect(sent.input.body).toEqual(record.body);
  expect(sent.input.idempotencyKey).toBe(record.key);
  expect(sent.retain).toEqual({ key: record.key, digest: record.digest });
  expect(JSON.stringify(sent.input)).not.toContain("A different goal");
  // The same guard applies to the check control for a read-only role.
  const readOnly = intakePanelAction(state("viewer"));
  expect(readOnly?.check?.allowed).toBe(false);
  expect(readOnly?.check?.reason).toContain(
    "requires the owner, editor or reviewer role",
  );
  // A form that still plans the retained request is already that check, and a
  // confirmed attempt is a replay reading: neither offers a second control.
  expect(
    intakeCheckOffered(
      planIntake({ ...base, body: record.body, retained: record }),
      check,
    ),
  ).toBe(false);
  expect(
    intakeCheckOffered(
      current,
      intakeRetainedCheck({
        ...base,
        retained: {
          ...record,
          receipt: { draftId: "draft-1", runId: "run-1", agentRevision: 2 },
        },
      }),
    ),
  ).toBe(false);
});

it("offers the continuation of the run this surface submitted, and only that run", () => {
  const record: IntakeRecoveryRecord = {
    ...retained(),
    receipt: { draftId: "draft-1", runId: "run-1", agentRevision: 2 },
  };
  const live = {
    runId: "run-1",
    status: "active",
    stage: "drafting",
    stages: [],
    sections: [],
  };
  const planned = (run: typeof live) =>
    planRunRetry({
      activated: true,
      capability: { enabled: true },
      record,
      run,
    });
  const plan = planned(live);
  if (plan.kind !== "request")
    throw new Error("expected the live run to plan its continuation");
  const state = (role: "owner" | "viewer") =>
    panelState({
      record,
      run: live,
      runRetry: plan,
      runRetryDecision: authorizeGenerationDispatch(plan, role),
    });
  const action = intakeRunRetryAction(state("owner"));
  if (!action) throw new Error("expected the panel to offer the continuation");
  expect(action.label).toBe("Continue this run");
  expect(action.allowed).toBe(true);
  // The control sends exactly the run the receipt named, marked as the route's
  // closed native-only workflow, with no request identity of its own: only a
  // click sends it, and it can name no other run.
  if (action.plan.kind !== "request")
    throw new Error("expected the continuation to be a request");
  expect(action.plan.input).toEqual({
    params: { runId: "run-1" },
    body: { workflow: "native-retained" },
  });
  expect(action.plan.retain).toBeUndefined();
  expect(JSON.stringify(action.plan.input)).not.toContain("draft-1");

  // A read-only role keeps the control visible and refused, with the same reason
  // the service's canEdit would give.
  const readOnly = intakeRunRetryAction(state("viewer"));
  expect(readOnly?.allowed).toBe(false);
  expect(readOnly?.reason).toContain(
    "requires the owner, editor or reviewer role",
  );

  // A run the worker already resolved is reported as such, never offered as a
  // resume that this route cannot perform.
  const resolvedRun = { ...live, status: "partial" };
  const resolved = intakeRunRetryAction(
    panelState({
      record,
      run: resolvedRun,
      runRetry: planned(resolvedRun),
      runRetryDecision: { allowed: true },
    }),
  );
  expect(resolved?.allowed).toBe(false);
  expect(resolved?.reason).toContain("does not generate");

  // No receipt of this surface's own, and no activated owner: no control at all.
  expect(
    intakeRunRetryAction(panelState({ record: retained(), run: live })),
  ).toBeNull();
  expect(intakeRunRetryAction(panelState({ record, run: live }))).toBeNull();
});

// The deliberate retry is a SEPARATE control from the check, and it is the only one
// that asks the producer for new paid generation: a run the worker already resolved
// is checked nowhere and retried only by this control, which carries the explicit
// acknowledgement, names only the receipt's own run, and is refused for a run that
// has no failed unit to retry.
it("offers the deliberate paid retry of a resolved run's failed units, separately from the check", () => {
  const record: IntakeRecoveryRecord = {
    ...retained(),
    receipt: { draftId: "draft-1", runId: "run-1", agentRevision: 2 },
  };
  const resolved = {
    runId: "run-1",
    status: "partial",
    stage: "drafting",
    stages: [],
    sections: [],
  };
  const planned = (run: typeof resolved, kind?: "retry-failed-units") =>
    planRunRetry({
      activated: true,
      capability: { enabled: true },
      record,
      run,
      ...(kind === undefined ? {} : { kind }),
    });
  const check = planned(resolved);
  const paid = planned(resolved, "retry-failed-units");
  const state = (role: "owner" | "viewer") =>
    panelState({
      record,
      run: resolved,
      runRetry: check,
      runRetryDecision: authorizeGenerationDispatch(check, role),
      runFailedUnitsRetry: paid,
      runFailedUnitsRetryDecision: authorizeGenerationDispatch(paid, role),
    });

  // The check of a run the worker resolved is refused, and says it does not generate.
  const recover = intakeRunRetryAction(state("owner"));
  expect(recover?.allowed).toBe(false);
  expect(recover?.reason).toContain("does not generate");

  // The deliberate retry IS offered, states that it starts new generation, names
  // only the receipt's own run, and its body carries the caller's acknowledgement.
  const retry = intakeRunFailedUnitsRetryAction(state("owner"));
  if (!retry) throw new Error("expected the deliberate retry control");
  expect(retry.allowed).toBe(true);
  expect(retry.label).toContain("starts new generation");
  if (retry.plan.kind !== "request")
    throw new Error("expected the deliberate retry to be a request");
  expect(retry.plan.input).toEqual({
    params: { runId: "run-1" },
    body: { workflow: "native-retained", intent: "retry-failed-units" },
  });
  expect(JSON.stringify(retry.plan.input)).not.toContain("draft-1");
  // The check of the SAME run never carries the acknowledgement.
  expect(JSON.stringify(check)).not.toContain("retry-failed-units");

  // A read-only role keeps the control visible and refused, with the same reason
  // the service's own canEdit would give.
  const readOnly = intakeRunFailedUnitsRetryAction(state("viewer"));
  expect(readOnly?.allowed).toBe(false);
  expect(readOnly?.reason).toContain(
    "requires the owner, editor or reviewer role",
  );

  // A run with no failed unit is refused as such, and no intent is ever composed.
  const liveRun = { ...resolved, status: "active" };
  const livePaid = planned(liveRun, "retry-failed-units");
  const live = intakeRunFailedUnitsRetryAction(
    panelState({
      record,
      run: liveRun,
      runFailedUnitsRetry: livePaid,
      runFailedUnitsRetryDecision: { allowed: true },
    }),
  );
  expect(live?.allowed).toBe(false);
  expect(live?.reason).toContain("no failed unit");
  expect(JSON.stringify(livePaid)).not.toContain("retry-failed-units");

  // No receipt of this surface's own, and no activated owner: no control at all.
  expect(
    intakeRunFailedUnitsRetryAction(
      panelState({ record: retained(), run: resolved, runFailedUnitsRetry: paid }),
    ),
  ).toBeNull();
  // ...and an owner that is not activated withholds the control entirely, even for
  // a run that does have failed units.
  expect(
    intakeRunFailedUnitsRetryAction(
      panelState({
        record,
        run: resolved,
        runFailedUnitsRetry: { kind: "withheld", reason: "not activated" },
      }),
    ),
  ).toBeNull();
});

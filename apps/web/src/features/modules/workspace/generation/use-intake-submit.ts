"use client";

// The WS-22 intake panel's own state: the fields one attempt is composed from,
// the plan for the current fields, the authorization decision for that plan, the
// run a retained receipt named, and the journal-backed attempt behind them
// (`use-intake-attempt.ts` owns the retention and its two commands).
//
// Nothing here builds a request identity, an auth header or a store: the key is
// derived by the scoped recovery leaf, the credential is attached by the
// canonical Capiro client, and the attempt lives in the canonical journal.
import { useEffect, useRef, useState } from "react";
import { type IntakeBody } from "../../../../shared/capiro/operations/workspace-generation-schemas";
import type { ResolvedWorkspaceRole } from "./access";
import { authorizeGenerationDispatch, type GenerationPlan } from "./controller";
import {
  intakeCheckOffered,
  intakeDismissable,
  intakeRetainedCheck,
  intakeSubmitActivated,
  planIntake,
} from "./intake";
import type { IntakeActor, IntakeRecoveryRecord } from "./intake-recovery";
import { planRunRetry, runRetryActivated } from "./run-retry";
import { useIntakeAttempt } from "./use-intake-attempt";
import { useGenerationDispatch } from "./use-generation-panel";

/** The fields one attempt is composed from. */
export type IntakeFields = {
  goal: string;
  blueprintVersionId: string;
  pastedContext: string;
};

export type IntakePanelProps = {
  capability: { enabled: boolean } | undefined;
  actor: IntakeActor | undefined;
  role: ResolvedWorkspaceRole;
  onSettled: () => void;
};

export type IntakeSubmitState = ReturnType<typeof useIntakeSubmit>;

const emptyFields: IntakeFields = {
  goal: "",
  blueprintVersionId: "",
  pastedContext: "",
};

/** The exact body the current fields describe; an empty form is not a request. */
export function intakeBodyOf(fields: IntakeFields): IntakeBody {
  const context = fields.pastedContext.trim();
  return {
    goal: fields.goal.trim(),
    blueprintVersionId: fields.blueprintVersionId.trim(),
    factualAttachmentIds: [],
    sampleAttachmentIds: [],
    priorWorkspaceDraftIds: [],
    ...(context ? { pastedContext: context } : {}),
  };
}

/**
 * The plan for the current fields, or - while the fields are still untouched -
 * for the retained attempt's own request, so a reload reads the attempt it
 * already has instead of composing a new one from an empty form.
 */
function intakePlan(args: {
  props: IntakePanelProps;
  fields: IntakeFields;
  record: IntakeRecoveryRecord | null;
}): GenerationPlan | null {
  if (!args.props.actor) return null;
  const typed =
    args.fields.goal.trim() !== "" ||
    args.fields.blueprintVersionId.trim() !== "" ||
    args.fields.pastedContext.trim() !== "";
  const body =
    args.record && !typed ? args.record.body : intakeBodyOf(args.fields);
  return planIntake({
    activated: intakeSubmitActivated(),
    capability: args.props.capability ?? { enabled: false },
    body,
    actor: args.props.actor,
    retained: args.record,
  });
}

/** Show the retained attempt's own frozen inputs once a reload finds one. */
function useIntakePrefill(
  record: IntakeRecoveryRecord | null,
  setFields: (fields: IntakeFields) => void,
): void {
  const prefilled = useRef("");
  useEffect(() => {
    // The retained attempt's own inputs (goal, pinned blueprint version, pasted
    // context) are what the caller resumes from - never a later form.
    if (!record || prefilled.current === record.fence) return;
    prefilled.current = record.fence;
    setFields({
      goal: record.body.goal,
      blueprintVersionId: record.body.blueprintVersionId,
      pastedContext: record.body.pastedContext ?? "",
    });
  }, [record, setFields]);
}

export function useIntakeSubmit(props: IntakePanelProps) {
  const [fields, setFields] = useState<IntakeFields>(emptyFields);
  const dispatch = useGenerationDispatch(props.role, props.onSettled);
  const attempt = useIntakeAttempt({
    actor: props.actor,
    dispatch: dispatch.dispatch,
    onSettled: props.onSettled,
  });
  const plan = intakePlan({ props, fields, record: attempt.record });
  // The retained attempt's own request, planned from the record rather than from
  // the fields: an edited form must not be able to hide the check of what was
  // actually sent, and this plan is what the check control submits.
  const retainedCheck = props.actor
    ? intakeRetainedCheck({
        activated: intakeSubmitActivated(),
        capability: props.capability ?? { enabled: false },
        actor: props.actor,
        retained: attempt.record,
      })
    : null;
  // The continuation of the run this attempt's own receipt named: planned from
  // that receipt and the run's current status, never from an id the operator
  // supplies, and only while the run is still live.
  const runRetry = planRunRetry({
    activated: runRetryActivated(),
    capability: props.capability ?? { enabled: false },
    record: attempt.record,
    run: attempt.run,
  });
  // The DELIBERATE paid retry of the units this run actually failed: the same
  // receipt, the same read run, and this control's own explicit acknowledgement.
  // It is planned SEPARATELY from the check above so that checking an uncertain run
  // can never start new paid generation, and so a run with no failed unit to retry
  // can never be offered as one.
  const runFailedUnitsRetry = planRunRetry({
    activated: runRetryActivated(),
    capability: props.capability ?? { enabled: false },
    record: attempt.record,
    run: attempt.run,
    kind: "retry-failed-units",
  });
  useIntakePrefill(attempt.record, setFields);
  return {
    ready: attempt.ready,
    fields,
    setField: (name: keyof IntakeFields, value: string) =>
      setFields((current) => ({ ...current, [name]: value })),
    plan,
    retainedCheck,
    retainedCheckDecision: retainedCheck
      ? authorizeGenerationDispatch(retainedCheck, props.role)
      : null,
    checkOffered: intakeCheckOffered(plan, retainedCheck),
    decision: plan ? authorizeGenerationDispatch(plan, props.role) : null,
    runRetry,
    runRetryDecision: authorizeGenerationDispatch(runRetry, props.role),
    runFailedUnitsRetry,
    runFailedUnitsRetryDecision: authorizeGenerationDispatch(
      runFailedUnitsRetry,
      props.role,
    ),
    busy: dispatch.busy || attempt.busy,
    // A command's own correlated report is more precise than the dispatch's
    // generic one, so it is shown first.
    notice: attempt.message || dispatch.notice,
    failure: dispatch.failure || attempt.hold,
    recoveryError: attempt.error,
    retryRecovery: attempt.retry,
    record: attempt.record,
    run: attempt.run,
    runError: attempt.runError,
    dismissable: intakeDismissable(attempt.record, attempt.run),
    submit: attempt.submit,
    continueRun: attempt.continueRun,
    dismiss: attempt.dismiss,
  };
}

"use client";

// WS-22 durable intake surface for the Workspace two-step draft owner.
// The panel composes the exact request, asks `planIntake` for the plan, and
// renders the plan's own reason instead of a button whenever the action is not
// available. The idempotency key is not a caller prop: it is derived by the
// scoped recovery leaf from the acting identity and the exact request, so it is
// stable across a reload and cannot be reused for changed input.
//
// The credential is not a panel concern either: the request goes through the
// canonical Capiro client (`shared/capiro/gateway.ts`), which attaches the
// current session bearer server-side and turns the derived key into the
// `Idempotency-Key` header. The panel never builds an auth header.
//
// The attempt itself is retained by the existing canonical request journal (see
// `use-intake-submit.ts`), for the acting scope only: a reload recovers the same
// request and the same run instead of starting another one, an attempt whose
// answer was lost is only ever re-sent as that same request, and a record from
// another tenant or user is ignored rather than replayed. The scope is that
// acting user identity, not a browser session id.
import {
  ActionButton,
  Field,
  Panel,
  StatusPanel,
  TextArea,
  TextInput,
  UnavailableAction,
} from "../../../../shared/module-ui";
import type { GenerationPlan } from "./controller";
import { intakeRunNotice } from "./intake";
import { intakeUnconfirmedReason } from "./intake-recovery";
import {
  useIntakeSubmit,
  type IntakePanelProps,
  type IntakeSubmitState,
} from "./use-intake-submit";

export function IntakePanel(props: IntakePanelProps) {
  const intake = useIntakeSubmit(props);
  if (!intake.plan)
    return (
      <Panel title="Two-step intake">
        <StatusPanel loading />
      </Panel>
    );
  return (
    <Panel
      title="Two-step intake"
      description={
        props.capability?.enabled
          ? "durable run, idempotent submit"
          : "disabled"
      }
    >
      {!props.capability && <StatusPanel loading />}
      {props.capability && !props.capability.enabled && (
        <p>
          Two-step drafting is not enabled for this workspace, so there is
          nothing to submit.
        </p>
      )}
      {props.capability?.enabled && (
        <>
          <IntakeFields intake={intake} />
          <IntakeAction intake={intake} />
          <IntakeProgress intake={intake} />
        </>
      )}
    </Panel>
  );
}

/** The goal, pinned blueprint version and pasted context for one attempt. */
function IntakeFields({ intake }: { intake: IntakeSubmitState }) {
  return (
    <>
      <Field label="Goal" htmlFor="intake-goal">
        <TextArea
          id="intake-goal"
          value={intake.fields.goal}
          onChange={(event) => intake.setField("goal", event.target.value)}
        />
      </Field>
      <Field label="Blueprint version" htmlFor="intake-blueprint">
        <TextInput
          id="intake-blueprint"
          value={intake.fields.blueprintVersionId}
          onChange={(event) =>
            intake.setField("blueprintVersionId", event.target.value)
          }
        />
      </Field>
      <Field label="Pasted context" htmlFor="intake-context">
        <TextArea
          id="intake-context"
          value={intake.fields.pastedContext}
          onChange={(event) => intake.setField("pastedContext", event.target.value)}
        />
      </Field>
    </>
  );
}

/**
 * The actions the panel offers, decided from the panel's own state: the label
 * and reason of the primary control, and - separately - the explicit check of a
 * retained attempt's EXACT request whenever the current form no longer plans
 * that same request. The check is a plan of the retained record, so an edited
 * form can neither hide it nor change what it would send.
 */
export type IntakePanelAction = {
  label: string;
  reason: string;
  allowed: boolean;
  check: { plan: GenerationPlan; allowed: boolean; reason: string } | null;
};

export function intakePanelAction(
  intake: IntakeSubmitState,
): IntakePanelAction | null {
  const plan = intake.plan;
  if (!plan || plan.kind === "replay") return null;
  // A retained attempt with no confirmed receipt is the only case in which the
  // primary control repeats a request instead of starting one.
  const unsettled =
    plan.kind === "request" && Boolean(intake.record && !intake.record.receipt);
  const check =
    intake.checkOffered && intake.retainedCheck?.kind === "request"
      ? intake.retainedCheck
      : null;
  const checkDecision = intake.retainedCheckDecision;
  return {
    label: unsettled
      ? "Check the interrupted submit"
      : check
        ? "Submit changed input"
        : "Submit intake",
    reason:
      plan.kind === "request"
        ? intake.decision?.allowed
          ? ""
          : (intake.decision?.reason ?? "")
        : plan.reason,
    allowed: plan.kind === "request" && Boolean(intake.decision?.allowed),
    check: check
      ? {
          plan: check,
          allowed: checkDecision?.allowed === true,
          reason:
            checkDecision && !checkDecision.allowed ? checkDecision.reason : "",
        }
      : null,
  };
}

/**
 * The continuation control for the run this surface's own receipt named. It is
 * offered only for that receipt and only while the run is still live; every other
 * state is reported with the reason it is not - a run the worker already resolved
 * cannot be continued at all - and is never replaced by a claim that something
 * was resumed.
 */
export type IntakeRunRetryAction = {
  plan: GenerationPlan;
  label: string;
  allowed: boolean;
  reason: string;
};

export function intakeRunRetryAction(
  intake: IntakeSubmitState,
): IntakeRunRetryAction | null {
  const plan = intake.runRetry;
  // Without a receipt of this surface's own, or without an activated owner,
  // there is no run to continue and no control to offer.
  if (!intake.record?.receipt || plan.kind === "withheld") return null;
  const decision = intake.runRetryDecision;
  if (plan.kind === "request")
    return {
      plan,
      label: "Continue this run",
      allowed: decision?.allowed === true,
      reason: decision && !decision.allowed ? decision.reason : "",
    };
  return {
    plan,
    label: "Continue this run",
    allowed: false,
    reason:
      plan.kind === "refusal"
        ? plan.reason
        : "This run cannot be continued from here.",
  };
}

/**
 * The panel's SECOND run control: the DELIBERATE retry of the units this run
 * actually failed. It is separate from the check above because it is the only
 * control that asks the producer for NEW PAID generation, so an operator checking
 * an uncertain run can never start it, and it is offered only for the definite
 * failure the worker can retry (`failed`/`partial`) of the run the receipt named.
 * Like the check, it dispatches nothing by itself: the click sends exactly this
 * plan through the attempt's own command and the current scope/lifetime guard.
 */
export function intakeRunFailedUnitsRetryAction(
  intake: IntakeSubmitState,
): IntakeRunRetryAction | null {
  const plan = intake.runFailedUnitsRetry;
  if (!intake.record?.receipt || plan.kind === "withheld") return null;
  const decision = intake.runFailedUnitsRetryDecision;
  const label = "Retry the failed units (starts new generation)";
  if (plan.kind === "request")
    return {
      plan,
      label,
      allowed: decision?.allowed === true,
      reason: decision && !decision.allowed ? decision.reason : "",
    };
  return {
    plan,
    label,
    allowed: false,
    reason:
      plan.kind === "refusal"
        ? plan.reason
        : "This run's failed units cannot be retried from here.",
  };
}

/**
 * The controls themselves: a real button for an admitted request - labelled as a
 * check when it would re-send a retained attempt whose answer was lost - the
 * plan's own reason when the action is withheld or refused, the retained check
 * of the attempt's own request beside a refusal, the retained receipt's `replay`
 * reading when this exact request was already submitted, the explicit
 * continuation of the run that receipt named, and the explicit dismissal of an
 * attempt whose run has resolved.
 */
function IntakeAction({ intake }: { intake: IntakeSubmitState }) {
  const plan = intake.plan;
  const attempt = intake.record;
  const hold = "Recovery storage is being checked, so no command is sent yet.";
  const retry = intakeRunRetryAction(intake);
  const retryControl = retry ? (
    retry.allowed && intake.ready ? (
      <ActionButton
        disabled={intake.busy}
        onClick={() => void intake.continueRun(retry.plan)}
      >
        {retry.label}
      </ActionButton>
    ) : (
      <UnavailableAction reason={intake.ready ? retry.reason : hold}>
        {retry.label}
      </UnavailableAction>
    )
  ) : null;
  const retryFailed = intakeRunFailedUnitsRetryAction(intake);
  const retryFailedControl = retryFailed ? (
    retryFailed.allowed && intake.ready ? (
      <ActionButton
        disabled={intake.busy}
        onClick={() => void intake.continueRun(retryFailed.plan)}
      >
        {retryFailed.label}
      </ActionButton>
    ) : (
      <UnavailableAction reason={intake.ready ? retryFailed.reason : hold}>
        {retryFailed.label}
      </UnavailableAction>
    )
  ) : null;
  // The dismissal is the only control that retires a settled attempt, and it is
  // offered by the attempt's own state (a confirmed receipt whose run reads
  // resolved) rather than by the plan. It therefore stays visible on every path
  // that shows such an attempt - including the unchanged prefilled form, whose
  // plan is the receipt's own `replay` reading and carries no action.
  const dismissControl = intake.dismissable ? (
    <ActionButton disabled={intake.busy} onClick={() => void intake.dismiss()}>
      Dismiss this attempt
    </ActionButton>
  ) : null;
  if (plan?.kind === "replay")
    return (
      <>
        <StatusPanel
          empty={`Already submitted: this request started run ${plan.entry.receipt?.runId ?? "unknown"}.`}
        />
        {retryControl}
        {retryFailedControl}
        {dismissControl}
      </>
    );
  const action = intakePanelAction(intake);
  if (!action || !plan)
    return (
      <>
        {retryControl}
        {retryFailedControl}
      </>
    );
  const request = plan.kind === "request" ? plan : null;
  const check = action.check;
  return (
    <>
      {request && action.allowed && intake.ready ? (
        <ActionButton
          primary
          disabled={intake.busy}
          onClick={() => void intake.submit(request)}
        >
          {action.label}
        </ActionButton>
      ) : (
        <UnavailableAction reason={intake.ready ? action.reason : hold}>
          {action.label}
        </UnavailableAction>
      )}
      {check &&
        (check.allowed && intake.ready ? (
          <ActionButton
            disabled={intake.busy}
            onClick={() => void intake.submit(check.plan)}
          >
            Check the interrupted submit
          </ActionButton>
        ) : (
          <UnavailableAction reason={intake.ready ? check.reason : hold}>
            Check the interrupted submit
          </UnavailableAction>
        ))}
      {(Boolean(request && attempt && !attempt.receipt) || Boolean(check)) && (
        <p role="status">{intakeUnconfirmedReason}</p>
      )}
      {retryControl}
      {retryFailedControl}
      {dismissControl}
    </>
  );
}

/** What the submit did, and what the run it named currently reports. */
function IntakeProgress({ intake }: { intake: IntakeSubmitState }) {
  const receipt = intake.record?.receipt;
  return (
    <>
      {intake.recoveryError && (
        <>
          <p role="alert">{intake.recoveryError}</p>
          <ActionButton onClick={intake.retryRecovery}>Retry recovery</ActionButton>
        </>
      )}
      {intake.notice && <p role="status">{intake.notice}</p>}
      {intake.failure && <p role="alert">{intake.failure}</p>}
      {receipt && (
        <p role="status">
          {`Submitted: run ${receipt.runId} on draft ${receipt.draftId}, agent revision ${receipt.agentRevision}.`}
        </p>
      )}
      {intake.runError && (
        <p role="alert">
          {typeof intake.runError === "string"
            ? intake.runError
            : intake.runError.message}
        </p>
      )}
      {intake.run && <p role="status">{intakeRunNotice(intake.run)}</p>}
      {intake.run && intake.run.sections.length > 0 && (
        <ul>
          {intake.run.sections.map((section) => (
            <li key={section.name}>
              {`${section.name}: ${section.status}${
                section.error ? ` (${section.error})` : ""
              }`}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

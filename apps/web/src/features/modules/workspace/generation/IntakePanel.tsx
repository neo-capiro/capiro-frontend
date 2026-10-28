"use client";

// WS-22 durable intake surface for the Workspace two-step draft owner. The
// panel composes the exact request, asks `planIntake` for the plan, and renders
// the plan's own reason rather than a button whenever the action is not
// available. The idempotency key is not a caller prop: it is derived by the
// scoped recovery leaf from the acting identity and the exact request, so it is
// stable across a reload and cannot be reused for changed input.
import { useState } from "react";
import {
  Field,
  Panel,
  StatusPanel,
  TextArea,
  TextInput,
  UnavailableAction,
} from "../../../../shared/module-ui";
import { planIntake, intakeSubmitActivated } from "./intake";
import { intakeGenerationWithheld as withheldReason } from "./owner-map";
import type { IntakeActor } from "./intake-recovery";

export type IntakePanelProps = {
  capability: { enabled: boolean } | undefined;
  actor: IntakeActor | undefined;
};

export function IntakePanel(props: IntakePanelProps) {
  const [goal, setGoal] = useState("");
  const [blueprintVersionId, setBlueprintVersionId] = useState("");
  const [pastedContext, setPastedContext] = useState("");
  const context = pastedContext.trim();
  if (!props.actor)
    return (
      <Panel title="Two-step intake">
        <StatusPanel loading />
      </Panel>
    );
  const plan = planIntake({
    activated: intakeSubmitActivated(),
    capability: props.capability ?? { enabled: false },
    body: {
      goal,
      blueprintVersionId,
      factualAttachmentIds: [],
      sampleAttachmentIds: [],
      priorWorkspaceDraftIds: [],
      ...(context ? { pastedContext: context } : {}),
    },
    actor: props.actor,
  });

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
          <Field label="Goal" htmlFor="intake-goal">
            <TextArea
              id="intake-goal"
              value={goal}
              onChange={(event) => setGoal(event.target.value)}
            />
          </Field>
          <Field label="Blueprint version" htmlFor="intake-blueprint">
            <TextInput
              id="intake-blueprint"
              value={blueprintVersionId}
              onChange={(event) => setBlueprintVersionId(event.target.value)}
            />
          </Field>
          <Field label="Pasted context" htmlFor="intake-context">
            <TextArea
              id="intake-context"
              value={pastedContext}
              onChange={(event) => setPastedContext(event.target.value)}
            />
          </Field>
          {plan.kind === "replay" ? (
            <StatusPanel
              empty={`Already submitted: this request started run ${plan.entry.receipt?.runId ?? "unknown"}.`}
            />
          ) : (
            <UnavailableAction
              reason={plan.kind === "request" ? withheldReason : plan.reason}
            >
              Submit intake
            </UnavailableAction>
          )}
        </>
      )}
    </Panel>
  );
}

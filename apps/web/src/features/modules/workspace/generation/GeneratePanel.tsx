"use client";

// WS-22 generation panel. The panel owns no state-machine logic: every control
// asks `controller.ts` for a plan first, shows the plan's refusal reason when the
// action is not available, and dispatches the planned request through the
// caller-supplied transport. Model-backed actions render the withheld reason
// instead of a button that would reach the legacy provider handler.
import { useState, type ReactNode } from "react";
import {
  ActionButton,
  Badge,
  Field,
  Panel,
  SelectInput,
  StatusPanel,
  TextArea,
  UnavailableAction,
} from "../../../../shared/module-ui";
import type {
  AgentProposal,
  AgentQualityEvaluation,
  AgentRunSummary,
  DocumentAgentState,
} from "../../../../shared/capiro/operations/workspace-generation-schemas";
import { generationMode } from "../../../../shared/capiro/operations/workspace-generation-schemas";
import type { ResolvedWorkspaceRole } from "./access";
import { type GenerationPlan, authorizeGenerationDispatch } from "./controller";
import {
  planNativeBriefSynthesis,
  planNativeContextAnalyze,
  planNativeContextRecommend,
  planNativeGenerationStart,
  planNativeOutlineGeneration,
} from "./native-generation";
import {
  planBriefApprove,
  planBriefEdit,
  planBriefReopen,
  planCancel,
  planContextApprove,
  planContextResolve,
  planModeChange,
  planOutlineApprove,
  planProposalAccept,
  planProposalReject,
  planQualityFix,
  planRetry,
} from "./plans";
import {
  briefApproval,
  contextApproval,
  openConflicts,
  outlineApproval,
  qualityFixableIssues,
  qualityTone,
  runStageProgress,
  unitRetryPlan,
} from "./state";

export type GenerationPanelProps = {
  draftId: string;
  state: DocumentAgentState;
  proposals: readonly AgentProposal[];
  run: AgentRunSummary | undefined;
  quality: AgentQualityEvaluation | undefined;
  role: ResolvedWorkspaceRole;
  busy?: boolean;
  dispatch: (plan: GenerationPlan, label: string) => void;
};

const statusTone = {
  not_started: "neutral",
  editable: "neutral",
  awaiting_approval: "warning",
  blocked_conflicts: "danger",
  approved: "success",
} as const;

function GateRow({
  label,
  stage,
  children,
}: {
  label: string;
  stage: { status: keyof typeof statusTone };
  children?: ReactNode;
}) {
  return (
    <div>
      <p>
        <strong>{label}</strong>{" "}
        <Badge tone={statusTone[stage.status]}>{stage.status}</Badge>
      </p>
      {children}
    </div>
  );
}

function PlannedButton({
  plan,
  label,
  primary,
  busy,
  dispatch,
  role,
}: {
  plan: GenerationPlan;
  label: string;
  primary?: boolean;
  busy?: boolean;
  dispatch: GenerationPanelProps["dispatch"];
  role: ResolvedWorkspaceRole;
}) {
  // The same decision the mounted host makes before it sends anything, applied
  // here so a control the acting Workspace role may not use is shown refused
  // rather than offered and then rejected.
  const decision = authorizeGenerationDispatch(plan, role);
  if (plan.kind === "withheld")
    return <UnavailableAction reason={plan.reason}>{label}</UnavailableAction>;
  if (!decision.allowed)
    return (
      <UnavailableAction reason={decision.reason}>{label}</UnavailableAction>
    );
  if (plan.kind === "replay")
    return <Badge tone="success">already submitted</Badge>;
  if (plan.kind === "refusal")
    return <UnavailableAction reason={plan.reason}>{label}</UnavailableAction>;
  return (
    <ActionButton
      primary={primary}
      disabled={busy}
      onClick={() => dispatch(plan, label)}
    >
      {label}
    </ActionButton>
  );
}

function BriefGate({ props }: { props: GenerationPanelProps }) {
  const [objective, setObjective] = useState(props.state.brief.objective ?? "");
  return (
    <Panel title="Brief" description={`revision ${props.state.revision}`}>
      <GateRow label="Brief" stage={briefApproval(props.state)}>
        <Field label="Objective" htmlFor="generation-brief-objective">
          <TextArea
            id="generation-brief-objective"
            value={objective}
            onChange={(event) => setObjective(event.target.value)}
          />
        </Field>
        {props.state.brief.objective &&
          props.state.brief.objective !== objective && (
            <p>On the document: {props.state.brief.objective}</p>
          )}
        <PlannedButton
          primary
          plan={planNativeBriefSynthesis(props.state, props.draftId)}
          label="Synthesize brief"
          busy={props.busy}
          dispatch={props.dispatch}
          role={props.role}
        />
        <PlannedButton
          plan={planBriefEdit(props.state, props.draftId, { objective })}
          label="Save brief"
          busy={props.busy}
          dispatch={props.dispatch}
          role={props.role}
        />
        <PlannedButton
          primary
          plan={planBriefApprove(props.state, props.draftId)}
          label="Approve brief"
          busy={props.busy}
          dispatch={props.dispatch}
          role={props.role}
        />
        <PlannedButton
          plan={planBriefReopen(props.state, props.draftId)}
          label="Reopen brief"
          busy={props.busy}
          dispatch={props.dispatch}
          role={props.role}
        />
      </GateRow>
    </Panel>
  );
}

function ContextGate({ props }: { props: GenerationPanelProps }) {
  const conflicts = openConflicts(props.state);
  return (
    <Panel
      title="Context"
      description={`${props.state.contextPlan.includedItemIds.length} included`}
    >
      <GateRow label="Context plan" stage={contextApproval(props.state)} />
      <PlannedButton
        plan={planNativeContextRecommend(props.state, props.draftId)}
        label="Recommend context"
        busy={props.busy}
        dispatch={props.dispatch}
        role={props.role}
      />
      <PlannedButton
        plan={planNativeContextAnalyze(props.state, props.draftId)}
        label="Analyze context"
        busy={props.busy}
        dispatch={props.dispatch}
        role={props.role}
      />
      {conflicts.map((conflict) => (
        <div key={conflict.id}>
          <p>{conflict.description}</p>
          <PlannedButton
            plan={planContextResolve(
              props.state,
              props.draftId,
              conflict.id,
              conflict.recommendedResolution,
            )}
            label={`Resolve: ${conflict.recommendedResolution}`}
            busy={props.busy}
            dispatch={props.dispatch}
            role={props.role}
          />
        </div>
      ))}
      <PlannedButton
        primary
        plan={planContextApprove(props.state, props.draftId)}
        label="Approve context"
        busy={props.busy}
        dispatch={props.dispatch}
        role={props.role}
      />
    </Panel>
  );
}

function OutlineGate({ props }: { props: GenerationPanelProps }) {
  return (
    <Panel
      title="Outline"
      description={`v${props.state.outline.version} · ${props.state.outline.sections.length} section(s)`}
    >
      <GateRow label="Outline" stage={outlineApproval(props.state)} />
      <PlannedButton
        plan={planNativeOutlineGeneration(props.state, props.draftId)}
        label="Generate outline"
        busy={props.busy}
        dispatch={props.dispatch}
        role={props.role}
      />
      <PlannedButton
        primary
        plan={planOutlineApprove(props.state, props.draftId)}
        label="Approve outline"
        busy={props.busy}
        dispatch={props.dispatch}
        role={props.role}
      />
    </Panel>
  );
}

function ProposalGate({ props }: { props: GenerationPanelProps }) {
  const pending = props.proposals.filter(
    (proposal) => proposal.status === "pending",
  );
  if (pending.length === 0) return null;
  return (
    <Panel title="Proposals">
      {pending.map((proposal) => (
        <div key={proposal.id}>
          <p>
            {proposal.type}{" "}
            <Badge tone="warning">base r{proposal.baseRevision}</Badge>
          </p>
          <PlannedButton
            primary
            plan={planProposalAccept(
              props.state,
              props.draftId,
              proposal,
              props.role,
            )}
            label="Accept"
            busy={props.busy}
            dispatch={props.dispatch}
            role={props.role}
          />
          <PlannedButton
            plan={planProposalReject(
              props.state,
              props.draftId,
              proposal,
              props.role,
            )}
            label="Reject"
            busy={props.busy}
            dispatch={props.dispatch}
            role={props.role}
          />
        </div>
      ))}
    </Panel>
  );
}

function GenerationGate({ props }: { props: GenerationPanelProps }) {
  const progress = runStageProgress(props.run);
  const units = unitRetryPlan(props.run);
  const description =
    progress.total === 0
      ? "not started"
      : `${progress.done}/${progress.total} stages`;
  return (
    <Panel title="Generation" description={description}>
      <Field label="Mode" htmlFor="generation-mode">
        <SelectInput
          id="generation-mode"
          value={props.state.generation.mode}
          onValueChange={(next) => {
            const chosen = generationMode.safeParse(next);
            if (!chosen.success) return;
            props.dispatch(
              planModeChange(props.state, props.draftId, chosen.data),
              `Mode: ${next}`,
            );
          }}
          options={["quick", "standard", "max"].map((mode) => ({
            value: mode,
            label: mode,
          }))}
        />
      </Field>
      <p>
        {units.preserved.length} unit(s) produced · {units.retryable.length}{" "}
        outstanding
      </p>
      <PlannedButton
        primary
        plan={planNativeGenerationStart(
          props.state,
          props.draftId,
          props.state.generation.mode,
        )}
        label="Generate document"
        busy={props.busy}
        dispatch={props.dispatch}
        role={props.role}
      />
      <PlannedButton
        plan={planCancel(props.state, props.draftId)}
        label="Cancel run"
        busy={props.busy}
        dispatch={props.dispatch}
        role={props.role}
      />
      <PlannedButton
        plan={planRetry(props.run)}
        label="Retry failed units"
        busy={props.busy}
        dispatch={props.dispatch}
        role={props.role}
      />
    </Panel>
  );
}

function QualityGate({ props }: { props: GenerationPanelProps }) {
  if (!props.quality)
    return (
      <Panel title="Quality">
        <StatusPanel loading />
      </Panel>
    );
  const fixes = qualityFixableIssues(props.quality);
  return (
    <Panel
      title="Quality"
      description={`score ${props.quality.score}`}
      actions={
        <Badge tone={qualityTone(props.quality)}>
          {props.quality.readiness}
        </Badge>
      }
    >
      {fixes.length === 0 && <p>No fixable findings.</p>}
      {fixes.map((check) => (
        <div key={check.id}>
          <p>
            <strong>{check.label}</strong> {check.detail}
          </p>
          <PlannedButton
            plan={planQualityFix(props.state, props.draftId, check, props.role)}
            label="Create fix"
            busy={props.busy}
            dispatch={props.dispatch}
            role={props.role}
          />
        </div>
      ))}
    </Panel>
  );
}

export function GeneratePanel(props: GenerationPanelProps) {
  return (
    <div>
      <BriefGate props={props} />
      <ContextGate props={props} />
      <OutlineGate props={props} />
      <ProposalGate props={props} />
      <GenerationGate props={props} />
      <QualityGate props={props} />
    </div>
  );
}

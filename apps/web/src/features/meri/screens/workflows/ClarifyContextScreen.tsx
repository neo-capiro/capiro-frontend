"use client";
import { useState } from "react";
import { Notice } from "../../ui/Notice";
import { LinkAction } from "../../ui/LinkAction";
import ui from "../../ui/meri-ui.module.css";
import { ToolingPanel, type ToolingPanelView } from "./ToolingPanel";
import { ToolingPage } from "./ToolingPage";
import { WorkflowField, type WorkflowFieldView } from "./WorkflowField";
import styles from "./screens.module.css";
import tooling from "./tooling.module.css";

export type ClarifyCandidate = ToolingPanelView & { id: string };
export type ClarifyContextView = {
  description: string;
  ambiguity: { title: string; detail: string };
  candidates: readonly ClarifyCandidate[];
  fiscalYears: readonly string[];
  timezone: string;
  optional: WorkflowFieldView;
  cancelHref?: string | undefined;
};

/** Local clarification draft; nothing is sent until the trusted run accepts an answer. */
function useClarification(view: ClarifyContextView) {
  const [person, setPerson] = useState<string>();
  const [fiscalYear, setFiscalYear] = useState<string>();
  const [timezone, setTimezone] = useState(false);
  const [emphasis, setEmphasis] = useState(view.optional.value);
  const [skipped, setSkipped] = useState(false);
  const chosen = view.candidates.find((candidate) => candidate.id === person);
  const summary = [
    chosen ? `Selected ${chosen.title}` : "No person selected",
    fiscalYear ? `Fiscal year ${fiscalYear}` : "Fiscal year unknown",
    timezone ? `Timezone ${view.timezone}` : "Timezone unconfirmed",
    skipped
      ? "Optional question skipped"
      : emphasis || "No preference supplied",
  ];
  return {
    person,
    setPerson,
    fiscalYear,
    setFiscalYear,
    timezone,
    confirmTimezone: () => setTimezone(true),
    emphasis,
    editEmphasis: (value: string) => {
      setSkipped(false);
      setEmphasis(value);
    },
    skip: () => setSkipped(true),
    resolved: Boolean(chosen && fiscalYear && timezone),
    summary,
  };
}

/** Bounded authorized candidates; choosing one only selects it locally. */
function CandidateChoices({
  candidates,
  selected,
  onSelect,
  unavailable,
}: {
  candidates: readonly ClarifyCandidate[];
  selected: string | undefined;
  onSelect: (id: string) => void;
  unavailable: string;
}) {
  return (
    <div
      className={tooling.pair}
      role="group"
      aria-label="Bounded authorized candidates"
    >
      {candidates.map((candidate) => (
        <div key={candidate.id} className={styles.section}>
          <ToolingPanel
            panel={candidate}
            body="large"
            unavailable={unavailable}
          />
          <button
            type="button"
            className={ui.outline}
            aria-pressed={selected === candidate.id}
            onClick={() => onSelect(candidate.id)}
          >
            {selected === candidate.id ? "Selected" : "Choose this person"}
            <span className="sr-only">: {candidate.title}</span>
          </button>
        </div>
      ))}
    </div>
  );
}

/** Required context that cannot be inferred: fiscal year and calendar timezone. */
function RequiredContext({
  view,
  state,
}: {
  view: ClarifyContextView;
  state: ReturnType<typeof useClarification>;
}) {
  return (
    <div
      className={tooling.pair}
      role="group"
      aria-label="Required unresolved context"
    >
      <section className={tooling.box} aria-labelledby="clarify-fiscal-year">
        <h2 id="clarify-fiscal-year" className={tooling.boxTitle}>
          Fiscal year · Required for this request
        </h2>
        <p className={`${tooling.small} ${tooling.muted}`}>
          The requested fiscal year is unknown. Do not substitute the calendar
          year or the current budget cycle.
        </p>
        <div className={ui.row}>
          {view.fiscalYears.map((year) => (
            <button
              key={year}
              type="button"
              className={ui.outline}
              aria-pressed={state.fiscalYear === year}
              onClick={() => state.setFiscalYear(year)}
            >
              {year}
            </button>
          ))}
        </div>
      </section>
      <section className={tooling.box} aria-labelledby="clarify-timezone">
        <h2 id="clarify-timezone" className={tooling.boxTitle}>
          Timezone · Confirm before resolving “next week”
        </h2>
        <p className={`${tooling.small} ${tooling.muted}`}>
          Workspace suggestion: {view.timezone}. The resolved start/end dates
          remain visible with an exclusive end boundary.
        </p>
        <button
          type="button"
          className={ui.outline}
          aria-pressed={state.timezone}
          onClick={state.confirmTimezone}
        >
          Use {view.timezone}
        </button>
      </section>
    </div>
  );
}

/** 12.15 Clarify subject & context: required identity, fiscal year and timezone before work starts. */
export function ClarifyContextScreen({
  view,
  backHref,
  unavailable,
}: {
  view: ClarifyContextView;
  backHref?: string | undefined;
  unavailable: string;
}) {
  const state = useClarification(view);
  return (
    <ToolingPage
      title="Confirm the subject and context"
      description={view.description}
      backHref={backHref}
      unavailable={unavailable}
    >
      <Notice title={view.ambiguity.title}>{view.ambiguity.detail}</Notice>
      <CandidateChoices
        candidates={view.candidates}
        selected={state.person}
        onSelect={state.setPerson}
        unavailable={unavailable}
      />
      <RequiredContext view={view} state={state} />
      <ul
        className={styles.summary}
        role="status"
        aria-label="Clarification selection summary"
      >
        {state.summary.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <WorkflowField
        field={view.optional}
        value={state.emphasis}
        onChange={state.editEmphasis}
      />
      <div className={ui.row} role="group" aria-label="Clarification response">
        <button
          type="button"
          className={`${ui.primary} ${state.resolved ? "" : tooling.blocked}`}
          disabled
          title={
            state.resolved
              ? unavailable
              : "Resolve the required identity, fiscal year and timezone first."
          }
        >
          {state.resolved ? "Answer" : "Answer · Required fields missing"}
        </button>
        <button type="button" className={ui.outline} onClick={state.skip}>
          Skip optional question
        </button>
        <LinkAction
          variant="ghost"
          href={view.cancelHref}
          unavailable={unavailable}
        >
          Cancel
        </LinkAction>
      </div>
      <p className={tooling.caption}>
        The selected workflow, prompt and permitted attachments remain attached.
        Answer becomes available only after required context is resolved; Cancel
        returns without starting a run.
      </p>
    </ToolingPage>
  );
}

"use client";
import { MeriPageHeading } from "../../ui/MeriPageHeading";
import { LinkAction } from "../../ui/LinkAction";
import { StatusPill, type StatusTone } from "../../ui/StatusPill";
import ui from "../../ui/meri-ui.module.css";
import surfaces from "../../ui/surfaces.module.css";
import { RejectedOutcome, type Rejection } from "./RejectedOutcome";
import styles from "./approvals.module.css";

/** A decision state with the one place to go next, or the decision still to be made. */
export type OutcomeState = {
  title: string;
  tone: StatusTone;
  status: string;
  detail: string;
  /** Who may act on this view, e.g. the requester's read-only note (06.08). */
  note?: string;
  /** Decision controls for the deciding reviewer (06.08C); a fixture never records a decision. */
  decisions?: readonly string[];
  action?: { label: string; href?: string };
};

export type DecisionOutcomeView = {
  title: string;
  description: string;
  outcome:
    | ({ kind: "state" } & OutcomeState)
    | ({ kind: "rejected" } & Rejection);
};

function OutcomeStateCard({
  state,
  unavailable,
}: {
  state: OutcomeState;
  unavailable: string;
}) {
  return (
    <section className={styles.stateCard} aria-label={state.title}>
      <h2 className={surfaces.sectionTitle}>{state.title}</h2>
      <StatusPill tone={state.tone}>{state.status}</StatusPill>
      <p className={ui.muted}>{state.detail}</p>
      {state.note ? <p className={ui.muted}>{state.note}</p> : null}
      {state.decisions ? (
        <div className={ui.row} role="group" aria-label="Decision">
          {state.decisions.map((label, index) => (
            <button
              key={label}
              type="button"
              className={index ? ui.outline : ui.primary}
              disabled
              title={unavailable}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}
      {state.action ? (
        <LinkAction
          variant="outline"
          href={state.action.href}
          unavailable={unavailable}
        >
          {state.action.label}
        </LinkAction>
      ) : null}
    </section>
  );
}

/**
 * 06.05A, 06.07B, 06.07C, 06.07D and 06.08–06.08C: the recorded outcome of a
 * decision or request, or (06.08C) the decision awaiting its reviewer. The
 * original payload is unchanged; nothing here executes or grants access.
 */
export function DecisionOutcomeScreen({
  view,
  unavailable,
}: {
  view: DecisionOutcomeView;
  unavailable: string;
}) {
  const { outcome } = view;
  return (
    <div className={ui.page}>
      <MeriPageHeading title={view.title} description={view.description} />
      {outcome.kind === "state" ? (
        <OutcomeStateCard state={outcome} unavailable={unavailable} />
      ) : (
        <RejectedOutcome rejection={outcome} unavailable={unavailable} />
      )}
    </div>
  );
}

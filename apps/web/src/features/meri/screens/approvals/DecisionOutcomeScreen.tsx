"use client";
import { MeriPageHeading } from "../../ui/MeriPageHeading";
import { LinkAction } from "../../ui/LinkAction";
import { StatusPill, type StatusTone } from "../../ui/StatusPill";
import ui from "../../ui/meri-ui.module.css";
import surfaces from "../../ui/surfaces.module.css";
import { RejectedOutcome, type Rejection } from "./RejectedOutcome";
import styles from "./approvals.module.css";

/** A recorded decision state that needs follow-up, with the one place to go next. */
export type OutcomeState = {
  title: string;
  tone: StatusTone;
  status: string;
  detail: string;
  action: { label: string; href?: string };
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
      <LinkAction
        variant="outline"
        href={state.action.href}
        unavailable={unavailable}
      >
        {state.action.label}
      </LinkAction>
    </section>
  );
}

/**
 * 06.05A, 06.07B, 06.07C, 06.07D and 06.08: the recorded outcome of a decision or
 * request. The original payload is unchanged; nothing here executes or grants access.
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

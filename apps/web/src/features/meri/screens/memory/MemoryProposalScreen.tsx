"use client";
import Link from "next/link";
import { X } from "lucide-react";
import { MeriPageHeading } from "../../ui/MeriPageHeading";
import { Notice } from "../../ui/Notice";
import { StatusPill } from "../../ui/StatusPill";
import { LinkAction } from "../../ui/LinkAction";
import ui from "../../ui/meri-ui.module.css";
import panel from "../../ui/panel.module.css";
import surfaces from "../../ui/surfaces.module.css";
import {
  phaseRules,
  type MemoryProposalView,
  type ProposalAction,
} from "./proposal-phases";
import { ProposalContentFields } from "./ProposalContentFields";
import styles from "./memory.module.css";

/**
 * Memory proposal lifecycle (05.06, 05.10–05.20): one proposal dialog whose
 * explicit phase decides what is editable and which actions are possible. A
 * proposal never changes canonical memory by itself; submission, review and
 * status reads stay with the trusted backend and are unavailable here.
 */
export function MemoryProposalScreen({
  view,
  closeHref,
  unavailable,
}: {
  view: MemoryProposalView;
  closeHref?: string | undefined;
  unavailable: string;
}) {
  const rules = phaseRules[view.phase];
  return (
    <div className={ui.page}>
      <MeriPageHeading title={view.heading} description={view.description} />
      <section
        className={`${surfaces.card} ${styles.proposal}`}
        aria-labelledby="proposal-title"
        aria-busy={rules.busy || undefined}
        data-phase={view.phase}
      >
        <div className={styles.proposalHeading}>
          <h2 id="proposal-title" className={panel.title}>
            {view.title}
          </h2>
          {view.status ? (
            <span className={styles.lifecycleStatus}>
              <StatusPill tone={view.status.tone}>
                {view.status.label}
              </StatusPill>
            </span>
          ) : null}
          {closeHref ? (
            <Link
              className={ui.ghost}
              href={closeHref}
              aria-label={`Close ${view.title}`}
            >
              <X aria-hidden />
            </Link>
          ) : null}
        </div>
        <p className={`${panel.body} ${ui.muted}`}>{view.context}</p>
        {view.feedback ? <Feedback feedback={view.feedback} /> : null}
        {"content" in view ? (
          <ProposalContentFields
            content={view.content}
            editable={rules.editable}
          />
        ) : null}
        <p className={`${surfaces.small} ${ui.muted}`}>{view.footnote}</p>
        <div className={ui.row}>
          <Action
            action={view.secondary}
            variant="outline"
            busy={rules.busy}
            unavailable={unavailable}
          />
          <Action
            action={view.primary}
            variant="primary"
            busy={rules.busy}
            unavailable={unavailable}
          />
        </div>
      </section>
    </div>
  );
}

/** Danger feedback is an alert (from Notice); every other outcome is announced politely. */
function Feedback({
  feedback,
}: {
  feedback: NonNullable<MemoryProposalView["feedback"]>;
}) {
  return (
    <div
      className={surfaces.stretch}
      role={feedback.tone === "danger" ? undefined : "status"}
    >
      <Notice tone={feedback.tone} title={feedback.title}>
        {feedback.lines.map((line, index) => (
          <span key={line}>
            {index ? <br /> : null}
            {line}
          </span>
        ))}
      </Notice>
    </div>
  );
}

/** While a read or write is in flight both actions wait; otherwise navigation or an explained disabled control. */
function Action({
  action,
  variant,
  busy,
  unavailable,
}: {
  action: ProposalAction;
  variant: "outline" | "primary";
  busy: boolean;
  unavailable: string;
}) {
  return busy ? (
    <button type="button" className={ui[variant]} disabled>
      {action.label}
    </button>
  ) : (
    <LinkAction variant={variant} href={action.href} unavailable={unavailable}>
      {action.label}
    </LinkAction>
  );
}

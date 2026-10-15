"use client";
import { MeriPageHeading } from "../../ui/MeriPageHeading";
import { FieldTable, type FieldRow } from "../../ui/FieldTable";
import { LinkAction } from "../../ui/LinkAction";
import { Notice } from "../../ui/Notice";
import { OutcomeToast } from "../../ui/OutcomeToast";
import ui from "../../ui/meri-ui.module.css";
import panel from "../../ui/panel.module.css";
import phone from "../../ui/phone-fields.module.css";
import { ProposalConfirmation } from "./ProposalConfirmation";
import {
  ProposalReviewActions,
  type PendingDecision,
} from "./ProposalReviewActions";
import styles from "./approvals.module.css";

/** Recorded execution of the approved payload (06.04A) with the Overlay · Task created outcome. */
export type ExecutedOutcome = {
  receiptHref?: string;
  created: { title: string; detail: string; status: string };
};

/**
 * A decision another authorized reviewer already recorded (06.02C): what it
 * covered, and where its result can be read. Nothing here decides again.
 */
export type RecordedDecision = {
  notice: { title: string; body: string };
  /** Navigation only; the first is the primary next step. */
  links: readonly { label: string; href?: string | undefined }[];
};

export type ProposalReviewView = {
  title: string;
  description: string;
  proposalId: string;
  summary: string;
  /** Memory proposals show the current and proposed fact side by side. */
  comparison?: {
    current: string;
    proposed: string;
    /** Headings once a decision is recorded, e.g. "Previous · Now superseded". */
    labels?: { current: string; proposed: string };
  };
  fields: readonly FieldRow[];
  decision:
    | ({ state: "pending" } & PendingDecision)
    | ({ state: "executed" } & ExecutedOutcome)
    | ({ state: "recorded" } & RecordedDecision);
};

const notice = (decision: ProposalReviewView["decision"]) => {
  if (decision.state === "pending") return decision.reviewer;
  return decision.state === "recorded" ? decision.notice : undefined;
};

function ExecutedFollowUp({
  outcome,
  unavailable,
}: {
  outcome: ExecutedOutcome;
  unavailable: string;
}) {
  return (
    <>
      <div className={ui.row}>
        <LinkAction
          variant="outline"
          href={outcome.receiptHref}
          unavailable={unavailable}
        >
          View task receipt
        </LinkAction>
      </div>
      <OutcomeToast
        title={outcome.created.title}
        detail={outcome.created.detail}
        status={outcome.created.status}
        tone="success"
        success
        action={
          <LinkAction
            variant="primary"
            href={outcome.receiptHref}
            unavailable={unavailable}
          >
            View task receipt
          </LinkAction>
        }
      />
    </>
  );
}

function RecordedLinks({
  decision,
  unavailable,
}: {
  decision: RecordedDecision;
  unavailable: string;
}) {
  return (
    <div className={ui.row}>
      {decision.links.map((link, index) => (
        <LinkAction
          key={link.label}
          variant={index ? "outline" : "primary"}
          href={link.href}
          unavailable={unavailable}
        >
          {link.label}
        </LinkAction>
      ))}
    </div>
  );
}

/** 06.02, 06.02A, 06.02C, 06.04, 06.04A and 06.05: one immutable proposal whose exact arguments are fixed. */
export function ProposalReviewScreen({
  view,
  unavailable,
}: {
  view: ProposalReviewView;
  unavailable: string;
}) {
  const { decision, comparison } = view;
  const callout = notice(decision);
  return (
    <div className={ui.page}>
      <MeriPageHeading title={view.title} description={view.description} />
      <ProposalConfirmation
        id={view.proposalId}
        outcome={decision.state === "pending" ? "pending" : "approved"}
        label={`${view.proposalId} proposal`}
      >
        {callout && (
          <div className={panel.full}>
            <Notice tone="success" title={callout.title}>
              {callout.body}
            </Notice>
          </div>
        )}
        <h2 className={panel.title}>{view.summary}</h2>
        {comparison && (
          <div className={styles.comparison}>
            <section aria-label="Current fact">
              <h3>{comparison.labels?.current ?? "Current"}</h3>
              <p>{comparison.current}</p>
            </section>
            <section aria-label="Proposed fact">
              <h3>{comparison.labels?.proposed ?? "Proposed"}</h3>
              <p>{comparison.proposed}</p>
            </section>
          </div>
        )}
        <div className={`${styles.fields} ${phone.stackOnPhone}`}>
          <FieldTable
            caption={`${view.proposalId} exact action`}
            fieldLabel="Exact action field"
            rows={view.fields}
          />
        </div>
        {decision.state === "pending" && (
          <ProposalReviewActions
            decision={decision}
            unavailable={unavailable}
          />
        )}
        {decision.state === "recorded" && (
          <RecordedLinks decision={decision} unavailable={unavailable} />
        )}
      </ProposalConfirmation>
      {decision.state === "executed" && (
        <ExecutedFollowUp outcome={decision} unavailable={unavailable} />
      )}
    </div>
  );
}

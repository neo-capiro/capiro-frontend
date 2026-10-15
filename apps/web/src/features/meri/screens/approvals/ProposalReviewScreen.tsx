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

export type ProposalReviewView = {
  title: string;
  description: string;
  proposalId: string;
  summary: string;
  /** Memory proposals show the current and proposed fact side by side. */
  comparison?: { current: string; proposed: string };
  fields: readonly FieldRow[];
  decision:
    | ({ state: "pending" } & PendingDecision)
    | ({ state: "executed" } & ExecutedOutcome);
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

/** 06.02, 06.02A, 06.04, 06.04A and 06.05: one immutable proposal whose exact arguments are fixed. */
export function ProposalReviewScreen({
  view,
  unavailable,
}: {
  view: ProposalReviewView;
  unavailable: string;
}) {
  const { decision } = view;
  const reviewer = decision.state === "pending" ? decision.reviewer : undefined;
  return (
    <div className={ui.page}>
      <MeriPageHeading title={view.title} description={view.description} />
      <ProposalConfirmation
        id={view.proposalId}
        outcome={decision.state === "pending" ? "pending" : "approved"}
        label={`${view.proposalId} proposal`}
      >
        {reviewer && (
          <div className={panel.full}>
            <Notice tone="success" title={reviewer.title}>
              {reviewer.body}
            </Notice>
          </div>
        )}
        <h2 className={panel.title}>{view.summary}</h2>
        {view.comparison && (
          <div className={styles.comparison}>
            <section aria-label="Current fact">
              <h3>Current</h3>
              <p>{view.comparison.current}</p>
            </section>
            <section aria-label="Proposed fact">
              <h3>Proposed</h3>
              <p>{view.comparison.proposed}</p>
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
      </ProposalConfirmation>
      {decision.state === "executed" && (
        <ExecutedFollowUp outcome={decision} unavailable={unavailable} />
      )}
    </div>
  );
}

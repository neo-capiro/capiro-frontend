"use client";
import { useState } from "react";
import { MeriPageHeading } from "../../ui/MeriPageHeading";
import { InlineDialog } from "../../ui/InlineDialog";
import { FormField } from "../../ui/FormField";
import { LinkAction } from "../../ui/LinkAction";
import { StatusPill } from "../../ui/StatusPill";
import ui from "../../ui/meri-ui.module.css";
import panel from "../../ui/panel.module.css";
import { ProposalConfirmation } from "./ProposalConfirmation";
import styles from "./approvals.module.css";

export type ProposalDecisionView = {
  proposalId: string;
  context: string;
  requestedChange: string;
  rejection: { title: string; detail: string };
  reviewHref?: string;
  approvalsHref?: string;
};

/** 06.07 Reject or request changes: a change request closes the proposal; it never edits it. */
export function ProposalDecisionScreen({
  view,
  unavailable,
}: {
  view: ProposalDecisionView;
  unavailable: string;
}) {
  const [change, setChange] = useState(view.requestedChange);
  return (
    <div className={ui.page}>
      <MeriPageHeading
        title="Proposal decisions"
        description="Changes never alter an already reviewed payload."
      />
      <InlineDialog
        title="Request changes"
        context={view.context}
        closeHref={view.reviewHref}
        unavailable={unavailable}
      >
        <form
          className={styles.form}
          aria-label="Requested changes"
          onSubmit={(event) => event.preventDefault()}
        >
          <FormField
            label="What should change?"
            value={change}
            onChange={setChange}
            multiline
          />
          <p className={panel.context}>
            The current proposal will be closed. Meri prepares a new proposal
            for review with the changed details.
          </p>
          <div className={ui.row}>
            <LinkAction
              variant="outline"
              href={view.reviewHref}
              unavailable={unavailable}
            >
              Cancel
            </LinkAction>
            <button
              type="submit"
              className={ui.primary}
              disabled
              title={unavailable}
            >
              Request a new proposal
            </button>
          </div>
        </form>
      </InlineDialog>
      <ProposalConfirmation
        id={view.proposalId}
        outcome="rejected"
        label={`${view.proposalId} decision`}
        tone="muted"
        narrow
      >
        <StatusPill tone="danger">Rejected</StatusPill>
        <h2 className={panel.subtitle}>{view.rejection.title}</h2>
        <p className={ui.muted}>{view.rejection.detail}</p>
        <LinkAction
          variant="outline"
          href={view.approvalsHref}
          unavailable={unavailable}
        >
          Return to approvals
        </LinkAction>
      </ProposalConfirmation>
    </div>
  );
}

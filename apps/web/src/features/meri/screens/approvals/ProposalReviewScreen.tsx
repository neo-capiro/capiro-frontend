"use client";
import {
  ConfirmationAction,
  ConfirmationActions,
} from "@capiro/ui/confirmation";
import { MeriPageHeading } from "../../ui/MeriPageHeading";
import { FieldTable, type FieldRow } from "../../ui/FieldTable";
import { LinkAction } from "../../ui/LinkAction";
import ui from "../../ui/meri-ui.module.css";
import panel from "../../ui/panel.module.css";
import { ProposalConfirmation } from "./ProposalConfirmation";
import styles from "./approvals.module.css";

export type ProposalReviewView = {
  title: string;
  description: string;
  proposalId: string;
  summary: string;
  approveLabel: string;
  /** Memory proposals show the current and proposed fact side by side. */
  comparison?: { current: string; proposed: string };
  fields: readonly FieldRow[];
  requestChangesHref?: string;
};

/** 06.02, 06.04 and 06.05: one pending proposal whose exact arguments are fixed. */
export function ProposalReviewScreen({
  view,
  unavailable,
}: {
  view: ProposalReviewView;
  unavailable: string;
}) {
  return (
    <div className={ui.page}>
      <MeriPageHeading title={view.title} description={view.description} />
      <ProposalConfirmation
        id={view.proposalId}
        outcome="pending"
        label={`${view.proposalId} proposal`}
      >
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
        <FieldTable
          caption={`${view.proposalId} exact action`}
          fieldLabel="Exact action field"
          rows={view.fields}
        />
        <ConfirmationActions className={ui.row}>
          <ConfirmationAction
            className={ui.primary}
            disabled
            title={unavailable}
          >
            {view.approveLabel}
          </ConfirmationAction>
          <ConfirmationAction
            className={ui.outline}
            disabled
            title={unavailable}
          >
            Reject
          </ConfirmationAction>
          <LinkAction
            variant="ghost"
            href={view.requestChangesHref}
            unavailable={unavailable}
          >
            Request changes
          </LinkAction>
        </ConfirmationActions>
      </ProposalConfirmation>
    </div>
  );
}

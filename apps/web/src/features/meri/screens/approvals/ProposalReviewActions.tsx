"use client";
import {
  ConfirmationAction,
  ConfirmationActions,
} from "@capiro/ui/confirmation";
import { LinkAction } from "../../ui/LinkAction";
import ui from "../../ui/meri-ui.module.css";
import styles from "./approvals.module.css";

/** Pending decision controls; the proposer sees them unavailable and may only open what they submitted. */
export type PendingDecision = {
  approveLabel: string;
  requestChangesHref?: string;
  /** Proposer perspective (06.02): another authorized reviewer must decide. */
  proposer?: { submittedHref?: string };
  /** Authorized reviewer perspective (06.02A): who is reviewing and what approval covers. */
  reviewer?: { title: string; body: string };
};

/** Approve and reject stay disabled: a fixture never records a decision. */
export function ProposalReviewActions({
  decision,
  unavailable,
}: {
  decision: PendingDecision;
  unavailable: string;
}) {
  const proposer = decision.proposer;
  return (
    <ConfirmationActions
      className={`${ui.row} ${proposer ? styles.notYours : ""}`}
    >
      <ConfirmationAction className={ui.primary} disabled title={unavailable}>
        {decision.approveLabel}
      </ConfirmationAction>
      <ConfirmationAction className={ui.outline} disabled title={unavailable}>
        Reject
      </ConfirmationAction>
      <LinkAction
        variant={decision.reviewer ? "outline" : "ghost"}
        href={proposer ? undefined : decision.requestChangesHref}
        unavailable={unavailable}
      >
        Request changes
      </LinkAction>
      {proposer ? (
        <LinkAction
          variant="outline"
          href={proposer.submittedHref}
          unavailable={unavailable}
        >
          View submitted proposal
        </LinkAction>
      ) : null}
    </ConfirmationActions>
  );
}

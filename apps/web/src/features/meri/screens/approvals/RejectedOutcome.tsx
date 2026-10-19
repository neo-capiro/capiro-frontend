"use client";
import { LinkAction } from "../../ui/LinkAction";
import { StatusPill } from "../../ui/StatusPill";
import ui from "../../ui/meri-ui.module.css";
import panel from "../../ui/panel.module.css";
import { ProposalConfirmation } from "./ProposalConfirmation";

/** A recorded rejection: the proposal keeps its payload and no action ran. */
export type Rejection = {
  proposalId: string;
  title: string;
  detail: string;
  approvalsHref?: string;
};

/** Rejected proposal outcome (06.07, 06.07C) on the adopted Confirmation surface. */
export function RejectedOutcome({
  rejection,
  unavailable,
}: {
  rejection: Rejection;
  unavailable: string;
}) {
  return (
    <ProposalConfirmation
      id={rejection.proposalId}
      outcome="rejected"
      label={`${rejection.proposalId} decision`}
      tone="muted"
      narrow
    >
      <StatusPill tone="danger">Rejected</StatusPill>
      <h2 className={panel.subtitle}>{rejection.title}</h2>
      <p className={ui.muted}>{rejection.detail}</p>
      <LinkAction
        variant="outline"
        href={rejection.approvalsHref}
        unavailable={unavailable}
      >
        Return to approvals
      </LinkAction>
    </ProposalConfirmation>
  );
}

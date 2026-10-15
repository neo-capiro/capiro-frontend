"use client";
import { MeriPageHeading } from "../../ui/MeriPageHeading";
import ui from "../../ui/meri-ui.module.css";
import { RejectedOutcome, type Rejection } from "./RejectedOutcome";
import {
  RequestChangesDialog,
  type RequestChangesView,
} from "./RequestChangesDialog";

export type ProposalDecisionView = {
  requestChanges: RequestChangesView;
  rejection: Rejection;
};

/** 06.07 Reject or request changes: a change request closes the proposal; it never edits it. */
export function ProposalDecisionScreen({
  view,
  unavailable,
}: {
  view: ProposalDecisionView;
  unavailable: string;
}) {
  return (
    <div className={ui.page}>
      <MeriPageHeading
        title="Proposal decisions"
        description="Changes never alter an already reviewed payload."
      />
      <RequestChangesDialog
        view={view.requestChanges}
        unavailable={unavailable}
      />
      <RejectedOutcome rejection={view.rejection} unavailable={unavailable} />
    </div>
  );
}

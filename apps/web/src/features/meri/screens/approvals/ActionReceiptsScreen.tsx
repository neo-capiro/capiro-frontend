"use client";
import { MeriPageHeading } from "../../ui/MeriPageHeading";
import { FieldTable, type FieldRow } from "../../ui/FieldTable";
import { LinkAction } from "../../ui/LinkAction";
import { OutcomeToast } from "../../ui/OutcomeToast";
import { StatusPill } from "../../ui/StatusPill";
import ui from "../../ui/meri-ui.module.css";
import panel from "../../ui/panel.module.css";
import { ProposalConfirmation } from "./ProposalConfirmation";

export type ActionReceipt = {
  proposalId: string;
  status: string;
  title: string;
  /** Task receipts list exact fields; memory receipts summarise the change. */
  fields?: readonly FieldRow[];
  summary?: string;
  actionLabel: string;
  actionHref?: string;
};
export type ActionReceiptsView = {
  receipts: readonly ActionReceipt[];
  /** Overlay · Task created: the recorded outcome that led to this page. */
  created: { title: string; detail: string; status: string };
};

function ReceiptCard({
  receipt,
  primary,
  unavailable,
}: {
  receipt: ActionReceipt;
  primary: boolean;
  unavailable: string;
}) {
  return (
    <ProposalConfirmation
      id={receipt.proposalId}
      outcome="approved"
      label={`${receipt.proposalId} receipt`}
      tone={primary ? "card" : "muted"}
    >
      <StatusPill tone="success">{receipt.status}</StatusPill>
      <h2 className={primary ? panel.title : panel.subtitle}>
        {receipt.title}
      </h2>
      {receipt.fields && (
        <FieldTable
          caption={`${receipt.proposalId} receipt`}
          fieldLabel="Receipt field"
          rows={receipt.fields}
        />
      )}
      {receipt.summary && <p className={panel.body}>{receipt.summary}</p>}
      <LinkAction
        variant="outline"
        href={receipt.actionHref}
        unavailable={unavailable}
      >
        {receipt.actionLabel}
      </LinkAction>
    </ProposalConfirmation>
  );
}

/** 06.06 Approved action receipts: service-recorded decisions and outcomes. */
export function ActionReceiptsScreen({
  view,
  unavailable,
}: {
  view: ActionReceiptsView;
  unavailable: string;
}) {
  return (
    <div className={ui.page}>
      <MeriPageHeading
        title="Action receipts"
        description="Recorded decisions and outcomes"
      />
      {view.receipts.map((receipt, index) => (
        <ReceiptCard
          key={receipt.proposalId}
          receipt={receipt}
          primary={index === 0}
          unavailable={unavailable}
        />
      ))}
      <OutcomeToast
        title={view.created.title}
        detail={view.created.detail}
        status={view.created.status}
        tone="success"
        success
        action={
          <LinkAction variant="primary" unavailable={unavailable}>
            Back to conversation
          </LinkAction>
        }
      />
    </div>
  );
}

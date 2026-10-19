"use client";
import { useState } from "react";
import { MeriPageHeading } from "../../ui/MeriPageHeading";
import { SegmentedTabs } from "../../ui/SegmentedTabs";
import { DataTable, type DataColumn } from "../../ui/DataTable";
import { Notice } from "../../ui/Notice";
import { LinkAction } from "../../ui/LinkAction";
import { phoneCardColumns } from "../../ui/phone-card-columns";
import styles from "../../ui/meri-ui.module.css";
import cards from "../../ui/phone-cards.module.css";
import phone from "../../ui/phone-page.module.css";

export type ApprovalRow = {
  id: string;
  proposal: string;
  client: string;
  action: string;
  expires: string;
};
export type ApprovalReview = { label: string; href?: string | undefined };
export type ApprovalsView = {
  /** Pending count and any just-recorded decision, as the service reports them. */
  description: string;
  draftHref?: string;
  pending: readonly ApprovalRow[];
  history: readonly ApprovalRow[];
  /** Reviews of the proposals still pending. */
  reviews: readonly ApprovalReview[];
  /** The just-decided proposal's recorded outcome ("ID · Decision recorded"), after the pending reviews. */
  recorded?: ApprovalReview;
};

const columns: readonly DataColumn<ApprovalRow>[] = [
  {
    key: "proposal",
    label: "Proposal",
    width: 420,
    render: (row) => row.proposal,
  },
  { key: "client", label: "Client", width: 140, render: (row) => row.client },
  {
    key: "action",
    label: "Requested action",
    width: 340,
    render: (row) => row.action,
  },
  {
    key: "expires",
    label: "Expires",
    width: 252,
    render: (row) => row.expires,
  },
];
const cardColumns = phoneCardColumns(columns);
const views = [
  { id: "pending", label: "Pending" },
  { id: "history", label: "History" },
] as const;

/** 06.01 Approval center and 06.01A–C after a recorded decision: proposals assigned to the current user. */
export function ApprovalsScreen({
  view,
  unavailable,
}: {
  view: ApprovalsView;
  unavailable: string;
}) {
  const [tab, setTab] = useState<"pending" | "history">("pending");
  return (
    <div className={`${styles.page} ${phone.page} ${cards.cards}`}>
      <MeriPageHeading title="Approvals" description={view.description} />
      <div className={styles.row}>
        <LinkAction
          variant="outline"
          href={view.draftHref}
          unavailable={unavailable}
        >
          Draft a client task
        </LinkAction>
      </div>
      <SegmentedTabs
        label="Approval list"
        options={views}
        value={tab}
        onChange={setTab}
      />
      <DataTable
        caption={tab === "pending" ? "Pending approvals" : "Approval history"}
        columns={cardColumns}
        rows={view[tab]}
      />
      <div className={styles.row} aria-label="Review proposals">
        {view.reviews.map((review, index) => (
          <LinkAction
            key={review.label}
            variant={index === 0 ? "primary" : "outline"}
            href={review.href}
            unavailable={unavailable}
          >
            {review.label}
          </LinkAction>
        ))}
        {view.recorded ? (
          <LinkAction
            variant="ghost"
            href={view.recorded.href}
            unavailable={unavailable}
          >
            {view.recorded.label}
          </LinkAction>
        ) : null}
      </div>
      <Notice tone="warning" title="Review the exact proposal">
        Approving permits only the displayed action and arguments. Changed
        details require a new proposal.
      </Notice>
    </div>
  );
}

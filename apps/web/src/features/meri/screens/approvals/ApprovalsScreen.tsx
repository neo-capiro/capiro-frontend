"use client";
import { useState } from "react";
import { MeriPageHeading } from "../../ui/MeriPageHeading";
import { SegmentedTabs } from "../../ui/SegmentedTabs";
import { DataTable, type DataColumn } from "../../ui/DataTable";
import { Notice } from "../../ui/Notice";
import { LinkAction } from "../../ui/LinkAction";
import styles from "../../ui/meri-ui.module.css";

export type ApprovalRow = {
  id: string;
  proposal: string;
  client: string;
  action: string;
  expires: string;
};
export type ApprovalReview = { label: string; href?: string };
export type ApprovalsView = {
  pending: readonly ApprovalRow[];
  history: readonly ApprovalRow[];
  reviews: readonly ApprovalReview[];
};

const columns: readonly DataColumn<ApprovalRow>[] = [
  {
    key: "proposal",
    label: "Proposal",
    width: 36,
    render: (row) => row.proposal,
  },
  { key: "client", label: "Client", width: 12, render: (row) => row.client },
  {
    key: "action",
    label: "Requested action",
    width: 24,
    render: (row) => row.action,
  },
  { key: "expires", label: "Expires", width: 28, render: (row) => row.expires },
];
const views = [
  { id: "pending", label: "Pending" },
  { id: "history", label: "History" },
] as const;

/** 06.01 Approval center: decisions assigned to the current user. */
export function ApprovalsScreen({
  view,
  unavailable,
}: {
  view: ApprovalsView;
  unavailable: string;
}) {
  const [tab, setTab] = useState<"pending" | "history">("pending");
  return (
    <div className={styles.page}>
      <MeriPageHeading
        title="Approvals"
        description="Decisions assigned to you · Actions are rechecked before execution"
      />
      <SegmentedTabs
        label="Approval list"
        options={views}
        value={tab}
        onChange={setTab}
      />
      <DataTable
        caption={tab === "pending" ? "Pending approvals" : "Approval history"}
        columns={columns}
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
      </div>
      <Notice tone="warning" title="Review the exact proposal">
        Approving permits only the displayed action and arguments. Changed
        details require a new proposal.
      </Notice>
    </div>
  );
}

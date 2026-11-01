"use client";
import Link from "next/link";
import { Button } from "@capiro/ui/button";
import { DataTable, type DataColumn } from "../ui/DataTable";
import { StatusPill } from "../ui/StatusPill";
import ui from "../ui/meri-ui.module.css";
import type { InboxRowView } from "./inbox-view";

export type InboxPageView = {
  rows: readonly InboxRowView[];
  pending: { count: number; complete: boolean };
  hasMore: boolean;
  loadingMore: boolean;
};

const columns: readonly DataColumn<InboxRowView>[] = [
  {
    key: "proposal",
    label: "Proposal",
    width: 260,
    render: (row) => row.proposal,
  },
  { key: "client", label: "Client", width: 160, render: (row) => row.client },
  {
    key: "conversation",
    label: "Conversation",
    width: 320,
    render: (row) => (
      <Link href={row.conversation.href}>{row.conversation.label}</Link>
    ),
  },
  {
    key: "created",
    label: "Created",
    width: 180,
    render: (row) => row.created,
  },
  {
    key: "expires",
    label: "Expires",
    width: 180,
    render: (row) => row.expires,
  },
  {
    key: "state",
    label: "State",
    width: 200,
    render: (row) => (
      <StatusPill tone={row.state.tone}>{row.state.label}</StatusPill>
    ),
  },
];

/** The inbox lists and links; every decision is made inline in the conversation the row links to. */
export function ApprovalInbox({
  page,
  onLoadMore,
}: {
  page: InboxPageView;
  onLoadMore: () => void;
}) {
  const pending = page.pending.complete
    ? `${page.pending.count} awaiting your decision.`
    : `${page.pending.count} awaiting your decision on this page; older proposals follow below.`;
  return (
    <section aria-label="Approval inbox">
      <p role="status" className={ui.muted}>
        {page.rows.length === 0
          ? "No proposals have been prepared for you yet."
          : `${pending} Open a conversation to review and decide; nothing is approved from this list.`}
      </p>
      {page.rows.length > 0 ? (
        <DataTable
          caption="Proposals across your conversations, newest first"
          columns={columns}
          rows={page.rows}
        />
      ) : null}
      {page.hasMore ? (
        <div className={ui.row}>
          <Button
            type="button"
            variant="outline"
            disabled={page.loadingMore}
            onClick={onLoadMore}
          >
            {page.loadingMore
              ? "Loading older proposals…"
              : "Load older proposals"}
          </Button>
        </div>
      ) : null}
    </section>
  );
}

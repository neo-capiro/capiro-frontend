"use client";
import { useRef, useState } from "react";
import { Plus } from "lucide-react";
import { MeriPageHeading } from "../../ui/MeriPageHeading";
import { DataTable, type DataColumn } from "../../ui/DataTable";
import { LinkAction } from "../../ui/LinkAction";
import { Notice } from "../../ui/Notice";
import { StatusToast } from "../../ui/StatusToast";
import { HistoryFilters, useHistoryFilters } from "./HistoryFilters";
import type { HistoryRow } from "./HistoryFilters";
import ui from "../../ui/meri-ui.module.css";

export type HistoryView = {
  rows: readonly HistoryRow[];
  background?: { title: string; detail: string; runsHref?: string };
  /** A recorded outcome shown as the Figma "Conversation deleted" toast. */
  outcome?: { title: string; detail: string };
  manageHref?: string;
};

const columns: readonly DataColumn<HistoryRow>[] = [
  { key: "title", label: "Conversation", width: 43, render: (r) => r.title },
  { key: "client", label: "Client", width: 20, render: (r) => r.client },
  { key: "status", label: "Status", width: 18, render: (r) => r.status },
  { key: "updated", label: "Updated", width: 19, render: (r) => r.updated },
];

/** 01.04 Conversation history: local search, filters and selection over listed conversations. */
export function ConversationHistoryScreen({
  view,
  unavailable,
}: {
  view: HistoryView;
  unavailable: string;
}) {
  const filters = useHistoryFilters(view.rows);
  const [selected, setSelected] = useState(view.rows[0]?.id);
  const history = useRef<HTMLElement>(null);
  const current =
    filters.rows.find((row) => row.id === selected) ?? filters.rows[0];
  return (
    <div className={ui.page}>
      <MeriPageHeading
        title="Conversations"
        description="Find previous work, including runs that are still active."
        action={
          <LinkAction variant="primary" unavailable={unavailable}>
            <Plus aria-hidden /> New conversation
          </LinkAction>
        }
      />
      <HistoryFilters filters={filters} rows={view.rows} />
      <section ref={history} tabIndex={-1} aria-label="Conversation history">
        {filters.rows.length ? (
          <DataTable
            caption="Conversations"
            columns={columns}
            rows={filters.rows}
            selectedId={current?.id}
            onSelect={setSelected}
          />
        ) : (
          <p className={ui.muted} role="status">
            No conversations match these filters.
          </p>
        )}
      </section>
      <div className={ui.row} aria-label="Selected conversation actions">
        <LinkAction variant="primary" unavailable={unavailable}>
          Open conversation
        </LinkAction>
        <LinkAction
          variant="outline"
          href={current && view.manageHref}
          unavailable={unavailable}
        >
          Rename
        </LinkAction>
        <button
          type="button"
          className={ui.outline}
          disabled
          title={unavailable}
        >
          Archive
        </button>
        <button type="button" className={ui.ghost} disabled title={unavailable}>
          Delete
        </button>
      </div>
      <HistoryFollowUps
        view={view}
        unavailable={unavailable}
        onOpenHistory={() => history.current?.focus()}
      />
    </div>
  );
}

function HistoryFollowUps({
  view,
  unavailable,
  onOpenHistory,
}: {
  view: HistoryView;
  unavailable: string;
  onOpenHistory: () => void;
}) {
  const [outcome, setOutcome] = useState(view.outcome);
  return (
    <>
      {view.background ? (
        <Notice
          tone="success"
          title={view.background.title}
          action={
            <LinkAction
              variant="outline"
              href={view.background.runsHref}
              unavailable={unavailable}
            >
              View runs
            </LinkAction>
          }
        >
          {view.background.detail}
        </Notice>
      ) : null}
      {outcome ? (
        <StatusToast
          title={outcome.title}
          action={
            <button
              type="button"
              className={ui.outline}
              onClick={() => {
                setOutcome(undefined);
                onOpenHistory();
              }}
            >
              Open history
            </button>
          }
        >
          {outcome.detail}
        </StatusToast>
      ) : null}
    </>
  );
}

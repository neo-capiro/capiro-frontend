"use client";
import { useRef, useState } from "react";
import { Plus } from "lucide-react";
import { MeriPageHeading } from "../../ui/MeriPageHeading";
import { DataTable, type DataColumn } from "../../ui/DataTable";
import { LinkAction } from "../../ui/LinkAction";
import { StateMessage } from "../../ui/StateMessage";
import {
  HistoryFilters,
  useHistoryFilters,
  type HistoryQuery,
  type HistoryRow,
} from "./HistoryFilters";
import { HistoryActions } from "./HistoryActions";
import { HistoryFollowUps, type HistoryFollowUpView } from "./HistoryFollowUps";
import { phoneCardColumns } from "../../ui/phone-card-columns";
import ui from "../../ui/meri-ui.module.css";
import cards from "../../ui/phone-cards.module.css";
import phone from "../../ui/phone-page.module.css";

export type HistoryView = HistoryFollowUpView & {
  /** Heading guidance; after a deletion it reports what was removed (01.04H). */
  description: string;
  rows: readonly HistoryRow[];
  initial?: HistoryQuery & {
    /** Conversation selected on load; null when the selection was just deleted. */
    selectedId?: string | null;
    openMenu?: "client" | "status";
  };
  manageHref?: string;
};

const columns: readonly DataColumn<HistoryRow>[] = [
  { key: "title", label: "Conversation", width: 43, render: (r) => r.title },
  { key: "client", label: "Client", width: 20, render: (r) => r.client },
  { key: "status", label: "Status", width: 18, render: (r) => r.status },
  { key: "updated", label: "Updated", width: 19, render: (r) => r.updated },
];
const cardColumns = phoneCardColumns(columns, {
  key: "status",
  tone: (row) => (row.status === "Complete" ? "success" : "neutral"),
});

/** 01.04 Conversation history (01.04A–H states): local search, filters, selection and deletion confirmation. */
export function ConversationHistoryScreen({
  view,
  unavailable,
}: {
  view: HistoryView;
  unavailable: string;
}) {
  return (
    <div className={`${ui.page} ${phone.page} ${cards.cards}`}>
      <MeriPageHeading
        title="Conversations"
        description={view.description}
        action={
          <LinkAction variant="primary" unavailable={unavailable}>
            <Plus aria-hidden /> New conversation
          </LinkAction>
        }
      />
      {view.rows.length ? (
        <HistoryList view={view} unavailable={unavailable} />
      ) : (
        <StateMessage
          title="No conversations yet"
          status="Information"
          action={
            <LinkAction variant="outline" unavailable={unavailable}>
              New conversation
            </LinkAction>
          }
        >
          Start a conversation to research, analyze or draft. Only conversations
          permitted by your current account will appear here.
        </StateMessage>
      )}
    </div>
  );
}

function HistoryList({
  view,
  unavailable,
}: {
  view: HistoryView;
  unavailable: string;
}) {
  const filters = useHistoryFilters(view.rows, view.initial);
  const [selected, setSelected] = useState(
    view.initial?.selectedId === undefined
      ? view.rows[0]?.id
      : view.initial.selectedId,
  );
  const history = useRef<HTMLElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const current = selected
    ? (filters.rows.find((row) => row.id === selected) ?? filters.rows[0])
    : undefined;
  return (
    <>
      <HistoryFilters
        filters={filters}
        rows={view.rows}
        openMenu={view.initial?.openMenu}
        searchRef={search}
      />
      <section ref={history} tabIndex={-1} aria-label="Conversation history">
        {filters.rows.length ? (
          <DataTable
            caption="Conversations"
            columns={cardColumns}
            rows={filters.rows}
            selectedId={current?.id}
            onSelect={setSelected}
          />
        ) : (
          <StateMessage
            title="No matching conversations"
            status="No matches"
            announce
            action={
              <button
                type="button"
                className={ui.outline}
                onClick={() => {
                  filters.clear();
                  search.current?.focus();
                }}
              >
                Clear search and filters
              </button>
            }
          >
            No permitted conversations match the current search and filters.
            This does not prove that the work never existed; access and
            retention rules still apply.
          </StateMessage>
        )}
      </section>
      {filters.rows.length ? (
        <HistoryActions
          selected={current !== undefined}
          manageHref={view.manageHref}
          unavailable={unavailable}
        />
      ) : null}
      <HistoryFollowUps
        view={view}
        visibleIds={filters.rows.map((row) => row.id)}
        unavailable={unavailable}
        onOutcomeClosed={() => history.current?.focus()}
      />
    </>
  );
}

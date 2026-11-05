"use client";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronDown, ListFilter } from "lucide-react";
import type { ConversationSummary } from "../../../shared/meri-conversations/history-client";
import { useManagedConversations } from "../../../shared/meri-conversations/useManagedConversations";
import { conversationHref } from "../../../shared/meri-conversations/conversation-navigation";
import { useClients } from "../../../shared/portfolio/api/clients";
import { accessDenied } from "../../../shared/meri-conversations/history-queries";
import { DataTable, type DataColumn } from "../ui/DataTable";
import { FormField } from "../ui/FormField";
import { StateMessage } from "../ui/StateMessage";
import { phoneCardColumns } from "../ui/phone-card-columns";
import { FilterMenu } from "../screens/conversation/FilterMenu";
import { UnconfirmedChatChanges } from "./UnconfirmedChatChanges";
import { SelectedConversationActions } from "./SelectedConversationActions";
import ui from "../ui/meri-ui.module.css";
import conversation from "../screens/conversation/conversation.module.css";
import styles from "./conversation-history.module.css";

type Status = ConversationSummary["status"];
/** Figma 13.22 status menu: the summaries read serves one status at a time, so "Active" replaces "All statuses". */
export const STATUS_FILTER = {
  "": "active",
  Archived: "archived",
  Trash: "trashed",
} as const satisfies Record<string, Status>;
export const STATUS_LABEL: Record<Status, string> = {
  active: "Active",
  archived: "Archived",
  trashed: "In Trash",
};
/** Figma 13.21 client menu lists General among the clients; value "" is All clients. */
export const GENERAL_CLIENT_FILTER = "General";

export type HistoryRow = {
  id: string;
  title: string;
  client: string;
  status: string;
  updated: string;
  summary: ConversationSummary;
};

/** Figma 01.04 "Updated" column: Just now · N min ago · Today · Yesterday · 7 Oct. */
export function updatedLabel(iso: string, now = Date.now()) {
  const at = new Date(iso);
  const seconds = Math.max(0, Math.round((now - at.getTime()) / 1000));
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  const day = (value: Date) =>
    Date.UTC(value.getFullYear(), value.getMonth(), value.getDate());
  const days = Math.round((day(new Date(now)) - day(at)) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return at.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function historyRows(
  rows: readonly ConversationSummary[],
  clientName: (clientId: string) => string,
  now = Date.now(),
): HistoryRow[] {
  return rows.map((summary) => ({
    id: summary.conversationId,
    title: summary.title,
    client:
      summary.scopeKind === "research_portfolio"
        ? `Research · ${summary.scope.researchPortfolioName}`
        : summary.clientId === null
          ? GENERAL_CLIENT_FILTER
          : clientName(summary.clientId),
    status: STATUS_LABEL[summary.status],
    updated: updatedLabel(summary.updatedAt, now),
    summary,
  }));
}

const columns: readonly DataColumn<HistoryRow>[] = [
  {
    key: "title",
    label: "Conversation",
    width: 43,
    render: (row) =>
      row.summary.status === "active" ? (
        <Link href={conversationHref(row.summary, row.summary.conversationId)}>
          {row.title}
        </Link>
      ) : (
        row.title
      ),
  },
  { key: "client", label: "Client", width: 20, render: (row) => row.client },
  { key: "status", label: "Status", width: 18, render: (row) => row.status },
  { key: "updated", label: "Updated", width: 19, render: (row) => row.updated },
];
const cardColumns = phoneCardColumns(columns, {
  key: "status",
  tone: (row) => (row.summary.status === "active" ? "success" : "neutral"),
});

/**
 * The summaries read fails only with the closed history refusal or a transport error. An access
 * refusal is the person's own access and is never reported as a missing feature; every other
 * failure is stated as a failed read that proves nothing about the saved conversations.
 */
export function titleReadFailure(error: unknown) {
  return accessDenied(error)
    ? "You cannot open your saved chat titles with your current access."
    : "Saved chat titles could not be loaded. This does not mean your conversations are gone.";
}

/** Current account-owned discovery (Figma 01.04); Core rechecks each chat's immutable scope and client wall. */
export function ConversationHistoryList({
  initialClient,
  newConversation,
}: {
  /** "General" or a client id from the entry link; narrows the list until the user changes it. */
  initialClient?: string | undefined;
  /** 01.04A empty state action. */
  newConversation?: ReactNode;
}) {
  const [title, setTitle] = useState("");
  const [statusKey, setStatusKey] = useState<keyof typeof STATUS_FILTER>("");
  // null until the user chooses: the entry link's General or client id narrows the list meanwhile.
  const [chosenClient, setClient] = useState<string | null>(
    initialClient === GENERAL_CLIENT_FILTER ? GENERAL_CLIENT_FILTER : null,
  );
  // Undefined keeps initial selection; null is an explicit Clear until a row is chosen.
  const [selectedId, setSelectedId] = useState<string | null | undefined>();
  const search = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const focusSearch = () => {
      if (window.location.hash === "#chat-title-search")
        search.current?.focus({ preventScroll: true });
    };
    // Fragment entry focuses the field without moving the page heading out of view.
    focusSearch();
    window.addEventListener("hashchange", focusSearch);
    return () => window.removeEventListener("hashchange", focusSearch);
  }, []);
  const status = STATUS_FILTER[statusKey];
  // Core filters its stored title before Meri derives the visible first-prompt title. Keep
  // the admitted Core pages intact (including their cursor) and filter only the displayed rows.
  const { query, scope, current, retained, shown, summaries } =
    useManagedConversations("", status);
  const roster = useClients({
    enabled: Boolean(scope),
    scope: scope
      ? { tenantId: scope.tenantId, userId: scope.actorId }
      : { tenantId: "", userId: "" },
  });
  const names = useMemo(
    () => new Map((roster.data ?? []).map((item) => [item.id, item.name])),
    [roster.data],
  );
  // The entry link carries a client id; the menu works on names once the roster has resolved it.
  const client =
    chosenClient ??
    (initialClient && initialClient !== GENERAL_CLIENT_FILTER
      ? (names.get(initialClient) ?? "")
      : "");
  // Admitted rows belong to the read that returned them: a page fetch or a timed-out next page
  // keeps them, and every other failure or replacement removes them with their private state.
  const rows = historyRows(summaries, (id) => names.get(id) ?? "Client");
  const needle = title.trim().toLowerCase();
  const visible = rows.filter(
    (row) =>
      (!client || row.client === client) &&
      (!needle || row.title.toLowerCase().includes(needle)),
  );
  const clientOptions = [
    GENERAL_CLIENT_FILTER,
    ...new Set(
      rows
        .map((row) => row.client)
        .filter((name) => name !== GENERAL_CLIENT_FILTER),
    ),
  ];
  const selected =
    selectedId === null
      ? undefined
      : (visible.find((row) => row.id === selectedId) ?? visible[0]);
  const filtered = Boolean(title.trim() || client || statusKey);
  const clear = () => {
    setTitle("");
    setClient("");
    setStatusKey("");
    setSelectedId(null);
    search.current?.focus({ preventScroll: true });
  };
  return (
    <div className={styles.list}>
      <div className={conversation.filters} role="search">
        <div className={conversation.searchField}>
          <FormField
            label="Search"
            type="search"
            placeholder="Search conversations…"
            value={title}
            onChange={setTitle}
            maxLength={200}
            ref={search}
          />
        </div>
        <FilterMenu
          title="Filter by client"
          triggerClassName={conversation.clientFilter}
          description="Choose the scope of the conversation list."
          allLabel="All clients"
          icon={<ChevronDown aria-hidden />}
          options={clientOptions}
          value={client}
          onChange={setClient}
        />
        <FilterMenu
          title="Filter by status"
          triggerClassName={conversation.statusFilter}
          description="Choose the state of the conversation list."
          allLabel="Active"
          icon={<ListFilter aria-hidden />}
          options={Object.keys(STATUS_FILTER).filter(Boolean)}
          value={statusKey}
          onChange={(value) => {
            setStatusKey(value as keyof typeof STATUS_FILTER);
            setSelectedId((value) => (value === null ? null : undefined));
          }}
        />
      </div>
      {scope && (
        <UnconfirmedChatChanges
          key={`${scope.tenantId}:${scope.actorId}:${Math.max(query.dataUpdatedAt, query.errorUpdatedAt)}`}
          account={scope}
          refresh={() => void query.refetch()}
        />
      )}
      {!scope ? (
        <p role="status">Verify your account to load your chats.</p>
      ) : query.isFetching && !query.data ? (
        <p role="status">Loading your chats…</p>
      ) : query.error && !retained ? (
        <div role="alert" className={ui.row}>
          <p>{titleReadFailure(query.error)}</p>
          <button
            type="button"
            className={ui.outline}
            onClick={() => void query.refetch()}
          >
            Retry
          </button>
        </div>
      ) : current && !visible.length && !query.hasNextPage ? (
        filtered ? (
          <StateMessage
            title="No matching conversations"
            status="No matches"
            announce
            action={
              filtered ? (
                <button type="button" className={ui.outline} onClick={clear}>
                  Clear search and filters
                </button>
              ) : undefined
            }
          >
            No permitted conversations match the current search and filters.
            This does not prove that the work never existed; access and
            retention rules still apply.
          </StateMessage>
        ) : (
          <StateMessage
            title="No conversations yet"
            status="Information"
            action={newConversation}
          >
            Start a conversation to research, analyze or draft. Only
            conversations permitted by your current account will appear here.
          </StateMessage>
        )
      ) : null}
      {retained && (
        // The rows already admitted stay; only the next page failed, and only the next page is
        // asked for again. This is a manual continuation, never a re-read of the whole list.
        <div role="status" className={ui.row}>
          <p>
            Part of your saved chat titles could not be loaded. The
            conversations already listed are unchanged.
          </p>
          <button
            type="button"
            className={ui.outline}
            disabled={query.isFetching}
            onClick={() => void query.fetchNextPage()}
          >
            Try the next page again
          </button>
        </div>
      )}
      {status === "trashed" && (
        <p className={ui.muted}>
          Restore within 30 days. After that, deletion follows the workspace
          retention rules.
        </p>
      )}
      {scope && visible.length > 0 && (
        // The attribute wins over no class: a layout class here would override hidden.
        // Display currency only: a page fetch or a retained page failure keeps admitted rows on
        // screen, while a revalidation still hides them until the read is current again.
        <div hidden={!shown}>
          <section aria-label="Conversation history">
            <DataTable
              caption="Conversations"
              columns={cardColumns}
              rows={visible}
              selectedId={selected?.id}
              onSelect={setSelectedId}
            />
          </section>
          {selected && (
            <SelectedConversationActions
              key={`${scope.tenantId}:${scope.actorId}:${selected.id}`}
              row={selected.summary}
              account={scope}
              available={current}
              current={current}
              refresh={() => void query.refetch()}
            />
          )}
        </div>
      )}
      {scope && shown && !retained && query.hasNextPage && (
        <>
          {!visible.length && (
            <p role="status" className={ui.muted}>
              More conversations may be on a later page.
            </p>
          )}
          <button
            type="button"
            className={ui.outline}
            disabled={query.isFetching}
            onClick={() => void query.fetchNextPage()}
          >
            Load more
          </button>
        </>
      )}
    </div>
  );
}

"use client";
import { useState } from "react";
import type { ManagedConversation } from "../../../shared/capiro/operations/meri-conversation-management";
import { ManagedChatRow } from "./ManagedChatRow";
import { ManagedOutcomes } from "./ManagedOutcomes";
import { useManagedConversations } from "../../../shared/meri-conversations/useManagedConversations";
import styles from "./managed-conversations.module.css";

export function ManagedConversationPanel() {
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<ManagedConversation["status"]>("active");
  const { query, scope, current } = useManagedConversations(title, status);
  const rows = current
    ? (query.data?.pages.flatMap((page) => page.conversations) ?? [])
    : [];
  const available =
    current && query.data?.pages[0]?.managementAvailable === true;
  return (
    <ManagedOutcomes
      scopeKey={JSON.stringify([
        scope?.tenantId,
        scope?.actorId,
        status,
        title.trim(),
      ])}
    >
      <section className={styles.panel} aria-label="Your saved chats">
        <ManagedChatFilters
          title={title}
          status={status}
          setTitle={setTitle}
          setStatus={setStatus}
        />
        {!scope ? (
          <p role="status">Verify your account to load your chats.</p>
        ) : query.isFetching ? (
          <p role="status">Loading your chats…</p>
        ) : query.error ? (
          <div role="alert">
            <p>Your saved chat titles are unavailable in this environment.</p>
            <button onClick={() => void query.refetch()}>Retry</button>
          </div>
        ) : current && !rows.length ? (
          <p>No matching chats.</p>
        ) : null}
        {current && !available && (
          <p role="status">Chat changes are unavailable in this environment.</p>
        )}
        {status === "trashed" && (
          <p>
            Restore within 30 days. After that, deletion follows the workspace
            retention rules.
          </p>
        )}
        {scope &&
          rows.map((row) => (
            <ManagedChatRow
              key={`${scope.tenantId}:${scope.actorId}:${row.conversationId}:${row.revision}`}
              row={row}
              account={scope}
              available={available}
              refresh={() => void query.refetch()}
            />
          ))}
        {current && query.hasNextPage && (
          <button onClick={() => void query.fetchNextPage()}>
            Load more chats
          </button>
        )}
      </section>
    </ManagedOutcomes>
  );
}

function ManagedChatFilters({
  title,
  status,
  setTitle,
  setStatus,
}: {
  title: string;
  status: ManagedConversation["status"];
  setTitle(value: string): void;
  setStatus(value: ManagedConversation["status"]): void;
}) {
  return (
    <>
      <label>
        Search your chat titles
        <input
          value={title}
          maxLength={200}
          onChange={(event) => setTitle(event.target.value)}
          type="search"
        />
      </label>
      <label>
        Show
        <select
          value={status}
          onChange={(event) =>
            setStatus(event.target.value as ManagedConversation["status"])
          }
        >
          <option value="active">Recent chats</option>
          <option value="archived">Archived</option>
          <option value="trashed">Trash</option>
        </select>
      </label>
    </>
  );
}

"use client";
import { useState } from "react";
import Link from "next/link";
import { MotionSurface } from "@capiro/ui/motion";
import type {
  ManagedConversation,
  ManagementRequest,
} from "../../../shared/capiro/operations/meri-conversation-management";
import { conversationHref } from "../../../shared/meri-conversations/conversation-navigation";
import { TrashConversationButton } from "./TrashConversationButton";
import { useManagedChange } from "./useManagedChange";
import styles from "./managed-conversations.module.css";

export function ManagedChatRow({
  row,
  account,
  available,
  refresh,
}: {
  row: ManagedConversation;
  account: { tenantId: string; actorId: string };
  available: boolean;
  refresh: () => void;
}) {
  const [title, setTitle] = useState(row.title);
  const { journal, intent, busy, message, submit, change } = useManagedChange({
    row,
    account,
    available,
    refresh,
  });
  return (
    <MotionSurface className={styles.row}>
      <div>
        {row.status === "active" ? (
          <Link href={conversationHref(row.clientId, row.conversationId)}>
            {row.title}
          </Link>
        ) : (
          <strong>{row.title}</strong>
        )}
        <span>{row.scopeKind === "general" ? "General" : "Client chat"}</span>
      </div>
      {row.restoreUntil && (
        <p>Restore by {new Date(row.restoreUntil).toLocaleString()}.</p>
      )}
      <details>
        <summary>Manage chat</summary>
        {!journal && (
          <p role="status">This tab cannot safely retain a chat change.</p>
        )}
        <label>
          Title
          <input
            value={title}
            maxLength={200}
            disabled={busy || Boolean(intent) || row.status === "trashed"}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <ChatChangeButtons
          row={row}
          title={title}
          disabled={!available || !journal || busy || Boolean(intent)}
          change={(operation) => change(operation, title)}
        />
        <p>
          Archive, Trash and Restore wait until the active run has finished.
        </p>
        {intent && (
          <button
            disabled={busy || !available || !journal}
            onClick={() => void submit(intent)}
          >
            Retry same change
          </button>
        )}
        {message && <p role="status">{message}</p>}
      </details>
    </MotionSurface>
  );
}

function ChatChangeButtons({
  row,
  title,
  disabled,
  change,
}: {
  row: ManagedConversation;
  title: string;
  disabled: boolean;
  change(operation: ManagementRequest["operation"]): void;
}) {
  return (
    <div className={styles.actions}>
      <button
        disabled={
          disabled ||
          !title.trim() ||
          title.trim() === row.title ||
          row.status === "trashed"
        }
        onClick={() => change("rename")}
      >
        Rename
      </button>
      {row.status === "active" ? (
        <button disabled={disabled} onClick={() => change("archive")}>
          Archive
        </button>
      ) : (
        <button disabled={disabled} onClick={() => change("restore")}>
          Restore
        </button>
      )}
      {row.status !== "trashed" && (
        <TrashConversationButton
          disabled={disabled}
          onConfirm={() => change("trash")}
        />
      )}
    </div>
  );
}

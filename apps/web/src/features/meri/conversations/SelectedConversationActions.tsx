"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { ConversationSummary } from "../../../shared/meri-conversations/history-client";
import { conversationHref } from "../../../shared/meri-conversations/conversation-navigation";
import { DeleteConversationDialog } from "../screens/conversation/DeleteConversationDialog";
import { RenameConversationDialog } from "./RenameConversationDialog";
import { SavedChatTranscript } from "./SavedChatTranscript";
import { useManagedChange } from "./useManagedChange";
import { ConversationExportAction } from "./ConversationExportAction";
import ui from "../ui/meri-ui.module.css";
import conversation from "../screens/conversation/conversation.module.css";
import styles from "./conversation-history.module.css";

/**
 * Figma 01.04 "History actions" for the selected row: Open conversation, Rename, Archive or Restore, Delete.
 * Every change goes through the existing management command owner; lost replies keep their exact retry.
 */
export function SelectedConversationActions({
  row,
  account,
  available,
  current,
  refresh,
}: {
  row: ConversationSummary;
  account: { tenantId: string; actorId: string };
  available: boolean;
  /** The read is current; dialogs close while rows are being revalidated and keep their draft. */
  current: boolean;
  refresh: () => void;
}) {
  const { journal, intent, busy, message, submit, change } = useManagedChange({
    row,
    account,
    available,
    refresh,
  });
  const [draft, setDraft] = useState(row.title);
  const previousTitle = useRef(row.title);
  useEffect(() => {
    const previous = previousTitle.current;
    previousTitle.current = row.title;
    setDraft((value) => (value === previous ? row.title : value));
  }, [row.title]);
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const restoreDeadline = row.restoreUntil
    ? Date.parse(row.restoreUntil)
    : null;
  useEffect(() => {
    if (restoreDeadline === null || restoreDeadline <= now) return;
    const timer = setTimeout(
      () => setNow(Date.now()),
      Math.min(2_147_483_647, Math.max(1, restoreDeadline - Date.now())),
    );
    return () => clearTimeout(timer);
  }, [restoreDeadline, now]);
  const locked = !available || !journal || busy || Boolean(intent);
  const restoreExpired = restoreDeadline !== null && restoreDeadline <= now;
  return (
    <>
      <div
        className={`${ui.row} ${conversation.historyActions}`}
        aria-label="Selected conversation actions"
      >
        <ConversationExportAction
          row={row}
          account={account}
          available={available && current && !busy && !intent}
        />
        {row.status === "active" ? (
          <Link
            className={ui.primary}
            href={conversationHref(row.clientId, row.conversationId)}
          >
            Open conversation
          </Link>
        ) : (
          <button
            type="button"
            className={ui.primary}
            disabled
            title="Restore this conversation to open it."
          >
            Open conversation
          </button>
        )}
        <button
          type="button"
          className={ui.outline}
          disabled={locked || row.status === "trashed"}
          aria-haspopup="dialog"
          onClick={() => setRenaming(true)}
        >
          Rename
        </button>
        {row.status === "active" ? (
          <button
            type="button"
            className={ui.outline}
            disabled={locked || !row.canManage}
            onClick={() => change("archive", row.title)}
          >
            Archive
          </button>
        ) : (
          <button
            type="button"
            className={ui.outline}
            disabled={locked || !row.canManage || restoreExpired}
            onClick={() => change("restore", row.title)}
          >
            Restore
          </button>
        )}
        {row.status !== "trashed" && (
          <button
            type="button"
            className={ui.ghost}
            disabled={locked || !row.canManage}
            aria-haspopup="dialog"
            onClick={() => setDeleting(true)}
          >
            Delete
          </button>
        )}
      </div>
      <div className={styles.receipts}>
        {!journal && (
          <p role="status">This tab cannot safely retain a chat change.</p>
        )}
        {row.restoreUntil && (
          <p>Restore by {new Date(row.restoreUntil).toLocaleString()}.</p>
        )}
        <p>
          Archive, Restore and Delete wait until the active run has finished.
        </p>
        {intent && (
          <button
            type="button"
            className={ui.outline}
            disabled={busy || !available || !journal}
            onClick={() => void submit(intent)}
          >
            Retry same change
          </button>
        )}
        {message && <p role="status">{message}</p>}
      </div>
      {row.status === "archived" && row.hasTranscript && (
        <div className={styles.transcript}>
          <SavedChatTranscript row={row} account={account} />
        </div>
      )}
      <RenameConversationDialog
        open={renaming && current}
        onOpenChange={setRenaming}
        current={row.title}
        draft={draft}
        onDraft={setDraft}
        disabled={locked}
        onSave={(title) => {
          setRenaming(false);
          change("rename", title);
        }}
      />
      <DeleteConversationDialog
        open={deleting && current}
        onOpenChange={setDeleting}
        explanation="It moves to Trash, where you can restore it for 30 days. After that, permanent deletion follows your workspace retention rules. Filed client records, action receipts and legally retained records follow their own rules."
        confirmLabel="Delete conversation"
        disabled={locked || !row.canManage}
        onConfirm={() => {
          if (locked || !row.canManage) return;
          setDeleting(false);
          change("trash", row.title);
        }}
      />
    </>
  );
}

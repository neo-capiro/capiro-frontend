"use client";
import { useMemo, useRef, useState } from "react";
import { announceManagementReceipt } from "../../../shared/meri-conversations/management-refresh";
import {
  ConversationHistoryUnavailable,
  MANAGEMENT_VERSION,
  type ConversationSummary,
  type ConversationHistoryManageRequest,
} from "../../../shared/meri-conversations/history-client";
import {
  managementJournal,
  submitManagementChange,
} from "../../../shared/meri-conversations/management-journal";

export type ManagedChatProps = {
  row: ConversationSummary;
  account: { tenantId: string; actorId: string };
  available: boolean;
  refresh(): void;
};
/** Lost replies retry the persisted command through the same canonical receipt owner. */
export function useManagedChange({
  row,
  account,
  available,
  refresh,
}: ManagedChatProps) {
  const { tenantId, actorId } = account;
  const recovery = useMemo(() => {
    try {
      const owner = managementJournal({
        tenantId,
        actorId,
        clientId: row.clientId,
        conversationId: row.conversationId,
      });
      return { owner, pending: owner.read() ?? null };
    } catch {
      return null;
    }
  }, [tenantId, actorId, row.clientId, row.conversationId]);
  const journal = recovery?.owner;
  const [intent, setIntent] = useState<ConversationHistoryManageRequest | null>(
    () => recovery?.pending ?? null,
  );
  const pending = useRef(intent),
    sending = useRef(false);
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  async function submit(command: ConversationHistoryManageRequest) {
    if (sending.current || !available || !journal) return;
    sending.current = true;
    setBusy(true);
    setMessage("");
    try {
      pending.current = command;
      setIntent(command);
      await submitManagementChange(
        journal,
        row.clientId,
        command,
        new AbortController().signal,
      );
      pending.current = null;
      setIntent(null);
      setMessage("Chat change confirmed.");
      announceManagementReceipt(account);
      refresh();
    } catch (error) {
      if (
        error instanceof ConversationHistoryUnavailable &&
        error.outcome === "NOT_DISPATCHED" &&
        (error.code === "CONVERSATION_MANAGEMENT_CONFLICT" ||
          error.code === "CONVERSATION_RESTORE_EXPIRED")
      ) {
        pending.current = null;
        setIntent(null);
        setMessage(
          error.code === "CONVERSATION_RESTORE_EXPIRED"
            ? "The 30-day Restore period has ended. The chat remains in Trash."
            : "The chat changed or its run is still active. Refresh before making another change.",
        );
      } else
        setMessage(
          "The change is not confirmed. Retry the same change to recover its result.",
        );
      refresh();
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }
  function change(
    operation: ConversationHistoryManageRequest["operation"],
    title: string,
  ) {
    if (
      !available ||
      !journal ||
      sending.current ||
      pending.current ||
      (operation !== "rename" && !row.canManage)
    )
      return;
    const request = {
      version: MANAGEMENT_VERSION,
      requestId: crypto.randomUUID(),
      conversationId: row.conversationId,
      expectedRevision: row.revision,
    };
    void submit(
      operation === "rename"
        ? { ...request, operation, title: title.trim() }
        : { ...request, operation },
    );
  }
  return { journal, intent, busy, message, submit, change };
}

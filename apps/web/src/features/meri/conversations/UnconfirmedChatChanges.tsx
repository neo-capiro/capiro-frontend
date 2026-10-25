"use client";
import { useState } from "react";
import {
  pendingManagementScopes,
  type TabScope,
} from "../../../shared/meri-conversations/tab-journal";
import {
  managementJournal,
  submitManagementChange,
} from "../../../shared/meri-conversations/management-journal";
import { ConversationHistoryUnavailable } from "../../../shared/meri-conversations/history-client";
import { announceManagementReceipt } from "../../../shared/meri-conversations/management-refresh";

/** Reuse retained commands even when an acknowledged change removed its row from this filter. */
export function UnconfirmedChatChanges({
  account,
  refresh,
}: {
  account: { tenantId: string; actorId: string };
  refresh(): void;
}) {
  const [initial] = useState(() => {
    try {
      return { scopes: pendingManagementScopes(account), unavailable: false };
    } catch {
      return { scopes: [] as TabScope[], unavailable: true };
    }
  });
  const [scopes, setScopes] = useState(initial.scopes);
  const unavailable = initial.unavailable;
  const [busy, setBusy] = useState<string | null>(null),
    [message, setMessage] = useState("");
  async function recover(scope: TabScope) {
    if (busy) return;
    setBusy(scope.conversationId);
    setMessage("");
    try {
      const journal = managementJournal(scope),
        command = journal.read();
      if (!command) throw Error("Missing retained request");
      try {
        await submitManagementChange(
          journal,
          scope.clientId,
          command,
          new AbortController().signal,
        );
      } catch (error) {
        if (
          !(
            error instanceof ConversationHistoryUnavailable &&
            (error.code === "CONVERSATION_MANAGEMENT_CONFLICT" ||
              error.code === "CONVERSATION_RESTORE_EXPIRED") &&
            error.outcome === "NOT_DISPATCHED"
          )
        )
          throw error;
      }
      setScopes((current) =>
        current.filter((item) => item.conversationId !== scope.conversationId),
      );
      setMessage(
        "The retained change was reconciled. Current chat details have been refreshed.",
      );
      announceManagementReceipt(account);
      refresh();
    } catch {
      setMessage(
        "The result is still unconfirmed. Keep this retained request and retry when access is available.",
      );
    } finally {
      setBusy(null);
    }
  }
  return (
    <>
      {unavailable && (
        <p role="status">This tab could not read retained chat changes.</p>
      )}
      {scopes.length > 0 && (
        <section aria-label="Unconfirmed chat changes">
          <p>
            A chat change may have completed. Recover its exact result before
            making another change.
          </p>
          {scopes.map((scope, index) => (
            <button
              key={scope.conversationId}
              disabled={busy !== null}
              onClick={() => void recover(scope)}
            >
              Recover unconfirmed change {index + 1}
            </button>
          ))}
        </section>
      )}
      {message && <p role="status">{message}</p>}
    </>
  );
}

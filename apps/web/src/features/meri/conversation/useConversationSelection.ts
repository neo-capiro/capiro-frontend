"use client";
import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { ConversationContext } from "../../../shared/meri-conversations/session";
import type { ConversationAccount } from "../../../shared/meri-conversations/host-controller";
import { renewConversationSelection } from "./conversation-selection";
import {
  conversationIntentJournal,
  conversationSelectionOwner,
} from "../../../shared/meri-conversations/query-journal";
import {
  requireMeriTabStorage,
  TabJournalUnavailable,
} from "../../../shared/meri-conversations/tab-journal";

/** Storage failures never fall back to broader session selectors. */
export function useConversationSelection(
  account: ConversationAccount,
  clientId: string | null,
  conversationId?: string,
) {
  const cache = useQueryClient();
  const [selection, setSelection] = useState(() => {
    try {
      return conversationSelectionOwner(
        cache,
        account,
        clientId,
        conversationId,
        requireMeriTabStorage(),
      );
    } catch {
      return undefined;
    }
  });
  const [storageError, setStorageError] = useState<string | undefined>(() =>
    selection ? undefined : new TabJournalUnavailable().message,
  );
  const record = useCallback(
    (context: ConversationContext) => {
      try {
        if (!selection) throw new TabJournalUnavailable();
        selection.record(context);
      } catch (error) {
        setStorageError(new TabJournalUnavailable().message);
        throw error;
      }
    },
    [selection],
  );
  /**
   * Retire the revoked recovery for the exact conversation. Before it is retired, the tab's own
   * request journal for the pinned run is read once: a retained submission (pending, unknown or
   * observed) means a turn may already be in flight, so the answer `true` keeps every later retry
   * on the exact run. A storage failure also answers `true`: an unreadable journal is ambiguous.
   */
  const clear = useCallback(
    (exactConversation: string | undefined, runId: string | undefined) => {
      if (!exactConversation) return false;
      try {
        const storage = requireMeriTabStorage();
        const retained =
          !!runId &&
          !!conversationIntentJournal(
            cache,
            {
              ...account,
              selectedClientId: clientId,
              conversationId: exactConversation,
              runId,
            },
            storage,
          ).read().submit;
        setSelection(
          renewConversationSelection(
            cache,
            { ...account, clientId, conversationId: exactConversation },
            conversationId,
            storage,
          ),
        );
        return retained;
      } catch {
        setStorageError(new TabJournalUnavailable().message);
        return true;
      }
    },
    [account, clientId, conversationId, cache],
  );
  return { selection, storageError, record, clear };
}

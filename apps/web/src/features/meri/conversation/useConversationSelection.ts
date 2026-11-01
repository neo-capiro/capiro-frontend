"use client";
import type { ResearchSelection } from "../../../shared/meri-conversations/research-context";
import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { ConversationContext } from "../../../shared/meri-conversations/session";
import type { ConversationAccount } from "../../../shared/meri-conversations/host-controller";
import { renewConversationSelection } from "./conversation-selection";
import { conversationSelectionOwner } from "../../../shared/meri-conversations/query-journal";
import {
  requireMeriTabStorage,
  TabJournalUnavailable,
} from "../../../shared/meri-conversations/tab-journal";

/** Storage failures never fall back to broader session selectors. */
export function useConversationSelection(
  account: ConversationAccount,
  clientId: string | null,
  conversationId?: string,
  research?: ResearchSelection,
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
        research,
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
  const clear = useCallback(
    (exactConversation: string | undefined) => {
      if (!exactConversation) return;
      try {
        setSelection(
          renewConversationSelection(
            cache,
            { ...account, clientId, conversationId: exactConversation },
            conversationId,
            undefined,
            research,
          ),
        );
      } catch {
        setStorageError(new TabJournalUnavailable().message);
      }
    },
    [account, clientId, conversationId, cache, research],
  );
  return { selection, storageError, record, clear };
}

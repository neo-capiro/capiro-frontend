"use client";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { MeriConversationPort } from "../../../shared/meri-conversations/host-controller";
import {
  conversationIntentJournal,
  type ConversationIntent,
} from "../../../shared/meri-conversations/query-journal";
import {
  requireMeriTabStorage,
  TabJournalUnavailable,
} from "../../../shared/meri-conversations/tab-journal";
import { useCommandGate } from "./useCommandGate";

export type TranscriptState = "loading" | "loaded" | "empty" | "unavailable";
function retainedCommands(
  cache: ReturnType<typeof useQueryClient>,
  port: MeriConversationPort,
) {
  try {
    return conversationIntentJournal(
      cache,
      port.context,
      requireMeriTabStorage(),
    );
  } catch {
    return {
      current: () => false,
      recoveryBlocked: true,
      acknowledgeCompletedRetirement: () => false,
      read: (): ConversationIntent => ({}),
      write: (value: ConversationIntent): boolean => {
        void value;
        throw new TabJournalUnavailable();
      },
    };
  }
}
/** Scope-bound persistence and visible command uncertainty, independent of transport operations. */
export function useRunCommandJournal(
  port: MeriConversationPort,
  initialPrompt: string | undefined,
  alive: { readonly current: boolean },
) {
  const cache = useQueryClient();
  const [journal] = useState(() => retainedCommands(cache, port));
  const [intent, setIntent] = useState(journal.read);
  const [transcript, setTranscript] = useState<TranscriptState>(() =>
    initialPrompt
      ? "loaded"
      : journal.read().submit?.state === "unknown"
        ? "unavailable"
        : "loading",
  );
  const gate = useCommandGate(alive, () => setIntent(journal.read()));
  const record = {
    read: journal.read,
    write: (value: ConversationIntent) => {
      if (!alive.current || !journal.write(value))
        throw new TabJournalUnavailable();
      setIntent(value);
    },
  };
  const storageError =
    journal.recoveryBlocked ||
    !journal.current() ||
    gate.error === new TabJournalUnavailable().message
      ? new TabJournalUnavailable().message
      : undefined;
  return {
    journal,
    intent,
    transcript,
    setTranscript,
    record,
    storageError,
    ...gate,
  };
}

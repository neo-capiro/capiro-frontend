"use client";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { MeriConversationPort } from "../../../shared/meri-conversations/host-controller";
import { conversationIntentJournal } from "../../../shared/meri-conversations/query-journal";
import { requestStop, sendRequest } from "./run-commands";
import { useCommandGate } from "./useCommandGate";
import type { useRunObservation } from "./useRunObservation";
import { isSettled } from "./conversation-view";

export type TranscriptState = "loading" | "loaded" | "unavailable";

/** Session-bound command state; observation still owns its separate watching lifetime. */
export function useRunCommands(
  port: MeriConversationPort,
  initialPrompt: string | undefined,
  alive: { readonly current: boolean },
  observation: Pick<
    ReturnType<typeof useRunObservation>,
    "observe" | "stop" | "restart"
  >,
) {
  const cache = useQueryClient();
  const [journal] = useState(() =>
    conversationIntentJournal(cache, port.context),
  );
  const [intent, setIntent] = useState(journal.read);
  // An uncertain request is retried explicitly before any transcript is read for it.
  const [transcript, setTranscript] = useState<TranscriptState>(() =>
    initialPrompt
      ? "loaded"
      : journal.read().submit?.state === "unknown"
        ? "unavailable"
        : "loading",
  );
  const { busy, error, perform, active } = useCommandGate(alive, () =>
    setIntent(journal.read()),
  );
  const record = {
    read: journal.read,
    write: (value: ReturnType<typeof journal.read>) => {
      if (alive.current) journal.write(value);
    },
  };
  const thenObserve = (done: boolean) => {
    if (done && alive.current) observation.observe();
  };
  const loadHistory = async () => {
    observation.stop();
    setTranscript("loading");
    try {
      await port.history({ limit: 100 });
      setTranscript("loaded");
    } catch (cause) {
      setTranscript("unavailable");
      throw cause;
    }
  };
  const history = () => perform(loadHistory).then(thenObserve);
  const submit = (prompt: string, retry = false) =>
    perform(async () => {
      await sendRequest(port, record, prompt, retry);
      setTranscript("loaded");
      // A replayed ACK may already be terminal and contain no output events. Read its exact
      // run-local transcript before the observation loop sees that there is nothing left to watch.
      if (isSettled(port.getSnapshot().observation?.runState))
        await loadHistory();
    }).then(thenObserve);
  // The receipt is not the run's status; keep observing for run.status either way.
  const cancel = () =>
    perform(() => requestStop(port, record)).then(() => {
      if (alive.current) observation.restart();
    });

  return {
    journal,
    active,
    intent,
    busy,
    error,
    transcript,
    history,
    submit,
    cancel,
  };
}

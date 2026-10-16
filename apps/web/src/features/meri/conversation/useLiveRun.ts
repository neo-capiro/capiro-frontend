"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { MeriConversationPort } from "../../../shared/meri-conversations/host-controller";
import { conversationIntentJournal } from "../../../shared/meri-conversations/query-journal";
import { requestStop, sendRequest } from "./run-commands";
import { useCommandGate } from "./useCommandGate";
import { useRunObservation } from "./useRunObservation";

export type TranscriptState = "loading" | "loaded" | "unavailable";

/**
 * One session-bound run: loads its admitted transcript, observes it until its status settles,
 * submits the run's single request and requests durable cancellation. The public client owns
 * admission, cursors and retained command bytes; the journal keeps write uncertainty across
 * navigation. `initialPrompt` is a request the person already sent for a fresh next run.
 */
export function useLiveRun(
  port: MeriConversationPort,
  initialPrompt: string | undefined,
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
  const alive = useRef(true),
    started = useRef(false);
  const { busy, error, perform, active } = useCommandGate(alive, () =>
    setIntent(journal.read()),
  );
  const observation = useRunObservation(port, alive);
  const snapshot = useSyncExternalStore(
    port.subscribe,
    port.getSnapshot,
    port.getSnapshot,
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

  const history = () =>
    perform(async () => {
      observation.stop();
      setTranscript("loading");
      try {
        await port.history({ limit: 100 });
        setTranscript("loaded");
      } catch (cause) {
        setTranscript("unavailable");
        throw cause;
      }
    }).then(thenObserve);
  const submit = (prompt: string, retry = false) =>
    perform(async () => {
      await sendRequest(port, record, prompt, retry);
      setTranscript("loaded");
    }).then(thenObserve);
  // The receipt is not the run's status; keep observing for run.status either way.
  const cancel = () =>
    perform(() => requestStop(port, record)).then(() => {
      if (alive.current) observation.restart();
    });

  useEffect(() => {
    alive.current = true;
    if (!started.current) {
      started.current = true;
      const retained = journal.read().submit;
      if (initialPrompt && !retained) void submit(initialPrompt);
      else if (!retained || retained.state === "observed") void history();
    } else if (!active.current) observation.observe();
    return () => {
      alive.current = false;
      observation.stop();
    };
    // Runs once per mounted port; later commands are explicit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    snapshot,
    intent,
    busy,
    error,
    transcript,
    observing: observation.state,
    history,
    submit,
    cancel,
    reconnect: observation.observe,
  };
}

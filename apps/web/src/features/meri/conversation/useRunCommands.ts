"use client";
import type { MeriConversationPort } from "../../../shared/meri-conversations/host-controller";
import {
  useRunCommandJournal,
  type TranscriptState,
} from "./useRunCommandJournal";
export type { TranscriptState } from "./useRunCommandJournal";
import {
  historyNotStarted,
  recoverRequest,
  reconcileStoredRequest,
  requestStop,
  sendRequest,
} from "./run-commands";
import type {
  ConversationStoredRequest,
  ConversationSubmitRequest,
} from "@capiro/meri-contracts/conversation-application";
import type { useRunObservation } from "./useRunObservation";
import { isSettled } from "./conversation-view";

/** Reads the run's transcript; false when the conversation has no run yet to observe. */
async function readTranscript(
  port: MeriConversationPort,
  setTranscript: (state: TranscriptState) => void,
) {
  setTranscript("loading");
  try {
    // `after` first keeps the body clear of the edge WAF rule that blocks a bare `{"limit":n}`.
    await port.history({ after: 0, limit: 100 });
    setTranscript("loaded");
    return true;
  } catch (cause) {
    if (historyNotStarted(cause)) {
      setTranscript("empty");
      return false;
    }
    setTranscript("unavailable");
    throw cause;
  }
}

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
  const {
    journal,
    intent,
    transcript,
    setTranscript,
    record,
    storageError,
    busy,
    error,
    perform,
    active,
  } = useRunCommandJournal(port, initialPrompt, alive);
  const thenObserve = (done: boolean) => {
    if (done && alive.current) observation.observe();
  };
  const loadHistory = () => {
    observation.stop();
    return readTranscript(port, setTranscript);
  };
  const history = () => {
    let observable = false;
    return perform(async () => {
      observable = await loadHistory();
    }).then((done) => thenObserve(done && observable));
  };
  const send = (operation: () => Promise<unknown>) =>
    perform(async () => {
      await operation();
      setTranscript("loaded");
      // A replayed ACK may already be terminal and contain no output events. Read its exact
      // run-local transcript before the observation loop sees that there is nothing left to watch.
      if (isSettled(port.getSnapshot().observation?.runState))
        await loadHistory();
    }).then(thenObserve);
  const submit = (prompt: string, retry = false) =>
    send(() => sendRequest(port, record, prompt, retry));
  const submitInitial = (
    prompt: string,
    onRecorded?: (request: ConversationSubmitRequest) => void,
    modelSelection?: ConversationSubmitRequest["modelSelection"],
  ) =>
    send(() =>
      sendRequest(
        port,
        record,
        prompt,
        false,
        true,
        onRecorded,
        modelSelection,
      ),
    );
  const recover = (stored: ConversationStoredRequest) =>
    send(() => recoverRequest(port, record, stored));
  const reconcile = (stored: ConversationStoredRequest) => {
    if (journal.read().submit?.state !== "unknown" || active.current) return;
    return perform(() => reconcileStoredRequest(port, record, stored));
  };
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
    storageError,
    transcript,
    history,
    submit,
    submitInitial,
    recover,
    reconcile,
    cancel,
  };
}

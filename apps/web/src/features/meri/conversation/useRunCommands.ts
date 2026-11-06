"use client";
import type { MeriConversationPort } from "../../../shared/meri-conversations/host-controller";
import {
  useRunCommandJournal,
  type TranscriptState,
} from "./useRunCommandJournal";
export type { TranscriptState } from "./useRunCommandJournal";
import {
  recoverRequest,
  reconcileStoredCancel,
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
import { TabJournalUnavailable } from "../../../shared/meri-conversations/tab-journal";
import type { ConversationSkillSelection } from "../../../shared/meri-conversations/query-journal";

/** Reads the run's transcript; false when the conversation has no run yet to observe. */
async function readTranscript(
  port: MeriConversationPort,
  setTranscript: (state: TranscriptState) => void,
) {
  setTranscript("loading");
  try {
    // `after` first keeps the body clear of the edge WAF rule that blocks a bare `{"limit":n}`.
    const snapshot = await port.history({ after: 0, limit: 100 });
    const started = snapshot.observation !== null;
    setTranscript(started ? "loaded" : "empty");
    return started;
  } catch (cause) {
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
    failure,
    refusal,
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
      if (observable && alive.current)
        journal.acknowledgeAcceptedRetirement(port);
    }).then((done) => thenObserve(done && observable));
  };
  const send = (operation: () => Promise<unknown>) =>
    perform(async () => {
      await operation();
      if (!alive.current) return;
      setTranscript("loaded");
      // A replayed ACK may already be terminal and contain no output events. Read its exact
      // run-local transcript before the observation loop sees that there is nothing left to watch.
      if (isSettled(port.getSnapshot().observation?.runState))
        await loadHistory();
    }).then(thenObserve);
  const submit = (
    prompt: string,
    retry = false,
    onRecorded?: (request: ConversationSubmitRequest) => void,
    modelSelection?: ConversationSubmitRequest["modelSelection"],
    selection?: ConversationSkillSelection,
  ) =>
    send(() =>
      sendRequest(
        port,
        record,
        prompt,
        retry,
        false,
        onRecorded,
        modelSelection,
        selection,
        window.sessionStorage,
      ),
    );
  const submitInitial = (
    prompt: string,
    onRecorded?: (request: ConversationSubmitRequest) => void,
    modelSelection?: ConversationSubmitRequest["modelSelection"],
    selection?: ConversationSkillSelection,
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
        selection,
        window.sessionStorage,
      ),
    );
  const recover = (stored: ConversationStoredRequest) =>
    send(() => recoverRequest(port, record, stored));
  /**
   * The one failure this tab must never retry by itself: its own record could not be saved, which
   * leaves exactly the state that would ask again. A control or transport failure says nothing
   * about local storage, and a settled run still ends its stop record then.
   */
  const localWriteFailed = error === new TabJournalUnavailable().message;
  /**
   * Confirms what one positive history read proved for this exact run, in one command: a settled
   * run ends its unresolved stop record, and the request this read admitted is acknowledged. They
   * are sequenced here, not in separate commands, so the single-command gate cannot drop either.
   */
  const reconcile = (stored?: ConversationStoredRequest) =>
    perform(() => {
      reconcileStoredCancel(port, record);
      return stored && journal.read().submit?.state === "unknown"
        ? reconcileStoredRequest(port, record, stored)
        : Promise.resolve();
    });
  /**
   * Control confirmed this run admitted no message, or the person discarded it: drop the retained one, here and in
   * the session's client, so the next message is an ordinary new request. Its files go back to the composer.
   */
  const release = () =>
    perform(async () => {
      const { submit, ...rest } = record.read();
      if (submit?.state !== "unknown") return;
      port.releaseSubmit();
      record.write(rest);
      if (submit.uploads?.length) port.uploads?.offer(submit.uploads);
    });
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
    failure,
    refusal,
    storageError,
    localWriteFailed,
    transcript,
    history,
    submit,
    submitInitial,
    recover,
    reconcile,
    release,
    cancel,
  };
}

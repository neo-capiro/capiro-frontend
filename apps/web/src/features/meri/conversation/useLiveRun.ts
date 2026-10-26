"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { MeriConversationPort } from "../../../shared/meri-conversations/host-controller";
import type { ConversationStoredRequest } from "@capiro/meri-contracts/conversation-application";
import { useRunCommands } from "./useRunCommands";
import { useRunObservation } from "./useRunObservation";

export type { TranscriptState } from "./useRunCommands";

/**
 * One session-bound run: loads its admitted transcript, observes it until its status settles,
 * submits the run's single request and requests durable cancellation. The public client owns
 * admission, cursors and retained command bytes; the journal keeps write uncertainty across
 * navigation. `initialPrompt` is a request the person already sent for a fresh next run.
 */
export function useLiveRun(
  port: MeriConversationPort,
  initialPrompt: string | undefined,
  acceptedRequest?: ConversationStoredRequest,
) {
  const alive = useRef(true),
    started = useRef(false);
  const observation = useRunObservation(port, alive);
  const { journal, active, ...commands } = useRunCommands(
    port,
    initialPrompt,
    alive,
    observation,
  );
  const snapshot = useSyncExternalStore(
    port.subscribe,
    port.getSnapshot,
    port.getSnapshot,
  );
  const [decisionRefresh, setDecisionRefresh] = useState(0);
  const requested = useRef(0);
  const handled = useRef(0),
    generation = useRef(0);
  const refreshAfterDecision = () => {
    if (alive.current) setDecisionRefresh(++requested.current);
  };
  useEffect(() => {
    if (
      !alive.current ||
      commands.busy ||
      active.current ||
      decisionRefresh <= handled.current
    )
      return;
    handled.current = decisionRefresh;
    const captured = generation.current;
    // Coalesce read wakeups until an existing command finishes; never queue its write.
    void commands.history().then(() => {
      if (
        alive.current &&
        generation.current === captured &&
        port.getSnapshot().status === "ready" &&
        port.getSnapshot().observation?.runState === "waiting-for-approval"
      )
        observation.afterDecision();
    });
    // The command gate's busy transition releases a pending read wakeup.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decisionRefresh, commands.busy]);

  useEffect(() => {
    alive.current = true;
    if (!started.current) {
      started.current = true;
      const retained = journal.read().submit;
      // Fresh next-turn admission records identity before reservation; reconnect reuses it exactly.
      if (initialPrompt && retained && retained.state !== "observed")
        void commands.submit(retained.prompt, true);
      // Every new authorized port needs readmission, including cached uncertain requests.
      // Reading can recover a terminal answer; uncertainty still never authorizes a resend.
      else void commands.history();
    } else if (!active.current) observation.observe();
    return () => {
      alive.current = false;
      observation.stop();
    };
    // Runs once per mounted port; later commands are explicit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (
      acceptedRequest &&
      snapshot.status === "ready" &&
      snapshot.observation &&
      snapshot.observation.runState !== "queued" &&
      !commands.busy &&
      !commands.error
    )
      void commands.reconcile(acceptedRequest);
    // Reconcile only positive server history; never resend a restored command.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    acceptedRequest,
    snapshot.status,
    snapshot.observation?.runState,
    commands.busy,
    commands.error,
  ]);

  return {
    snapshot,
    ...commands,
    observing: observation.state,
    refreshAfterDecision,
    suspendObservation: () => {
      handled.current = requested.current;
      generation.current++;
      observation.stop();
    },
    reconnect: () => {
      if (
        decisionRefresh &&
        snapshot.observation?.runState === "waiting-for-approval"
      )
        refreshAfterDecision();
      else observation.observe();
    },
  };
}

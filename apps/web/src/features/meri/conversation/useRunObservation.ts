"use client";
import { useRef, useState } from "react";
import { ConversationUnavailable } from "@capiro/meri-client/conversation";
import type { MeriConversationPort } from "../../../shared/meri-conversations/host-controller";
import { isSettled } from "./conversation-view";
import {
  observeUntilSettled,
  type ObservationOutcome,
  type ObservationPhase,
} from "./observation-loop";

export type ObservationState = "idle" | ObservationPhase | ObservationOutcome;

/**
 * At most one observation loop per port. Each attempt is one public subscription through the
 * client's guarded SDK Chat; ending or aborting a loop only stops watching, never the run.
 */
export function useRunObservation(
  port: MeriConversationPort,
  alive: { readonly current: boolean },
) {
  const [state, setState] = useState<ObservationState>("idle");
  const loop = useRef<AbortController | null>(null);
  const observe = (afterDecision = false) => {
    if (loop.current && !loop.current.signal.aborted) return;
    if (!port.getSnapshot().observation) return;
    const controller = new AbortController();
    loop.current = controller;
    const current = () => alive.current && loop.current === controller;
    let after = port.getSnapshot().observation?.after ?? 0;
    // History can be paged: status events in its undelivered suffix are not
    // evidence that the approval wait changed after this read.
    let startingSequence = port.getSnapshot().observation?.hasMore
      ? null
      : after;
    let awaitingStatus =
      afterDecision &&
      port.getSnapshot().observation?.runState === "waiting-for-approval";
    let waitingWindowEnded = false;
    const settled = () =>
      awaitingStatus
        ? waitingWindowEnded
        : isSettled(port.getSnapshot().observation?.runState);
    // A recovered window can remain open for 30 s after admitting an event.
    const unsubscribe = port.subscribe(() => {
      if (!current()) return;
      const observed = port.getSnapshot().observation;
      if (observed && observed.after > after) {
        after = observed.after;
        if (startingSequence === null && !observed.hasMore)
          startingSequence = after;
        if (
          startingSequence !== null &&
          observed.events.some(
            (event) =>
              event.sequence > startingSequence! && event.type === "run.status",
          )
        )
          awaitingStatus = false;
        setState(settled() ? "settled" : "live");
      }
    });
    const detach = () => {
      unsubscribe();
      controller.signal.removeEventListener("abort", detach);
    };
    controller.signal.addEventListener("abort", detach, { once: true });
    void observeUntilSettled({
      signal: controller.signal,
      settled,
      progress: () => port.getSnapshot().observation?.after ?? 0,
      onPhase: (phase) => {
        if (current()) setState(phase);
      },
      attempt: async (first) => {
        const handle = port.openChat();
        const stop = () => {
          void handle.chat.stop();
        };
        controller.signal.addEventListener("abort", stop, { once: true });
        try {
          // The public subscribe command starts at sequence 0; later attempts resume the cursor.
          if (first && port.getSnapshot().observation?.after === 0)
            await handle.chat.sendMessage({ text: "" });
          else await handle.chat.resumeStream();
          if (handle.chat.error)
            throw new ConversationUnavailable("subscription-unavailable");
        } finally {
          controller.signal.removeEventListener("abort", stop);
          // One normal 30 s server window (70 s client hard lease), without
          // automatic reconnect while the original approval wait is unchanged.
          if (awaitingStatus) waitingWindowEnded = true;
        }
      },
    })
      .finally(detach)
      .then((outcome) => {
        if (loop.current !== controller) return;
        loop.current = null;
        if (alive.current)
          setState(
            awaitingStatus && waitingWindowEnded && outcome !== "stopped"
              ? "stalled"
              : outcome,
          );
      });
  };
  const stop = () => {
    loop.current?.abort();
    loop.current = null;
  };
  /** Start over from the current cursor now, e.g. after a stop request was answered. */
  const restart = () => {
    stop();
    observe();
  };
  const afterDecision = () => {
    stop();
    observe(true);
  };
  return { state, observe, stop, restart, afterDecision };
}

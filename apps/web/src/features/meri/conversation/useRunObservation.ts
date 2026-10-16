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
  const observe = () => {
    if (loop.current && !loop.current.signal.aborted) return;
    if (!port.getSnapshot().observation) return;
    const controller = new AbortController();
    loop.current = controller;
    const current = () => alive.current && loop.current === controller;
    void observeUntilSettled({
      signal: controller.signal,
      settled: () => isSettled(port.getSnapshot().observation?.runState),
      progress: () => port.getSnapshot().observation?.after ?? 0,
      onPhase: (phase) => {
        if (current()) setState(phase);
      },
      attempt: async (first) => {
        const handle = port.openChat();
        // The public subscribe command starts at sequence 0; later attempts resume the cursor.
        if (first && port.getSnapshot().observation?.after === 0)
          await handle.chat.sendMessage({ text: "" });
        else await handle.chat.resumeStream();
        if (handle.chat.error)
          throw new ConversationUnavailable("subscription-unavailable");
      },
    }).then((outcome) => {
      if (loop.current !== controller) return;
      loop.current = null;
      if (alive.current) setState(outcome);
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
  return { state, observe, stop, restart };
}

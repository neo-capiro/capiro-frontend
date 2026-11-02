"use client";
import { useEffect, useEffectEvent, useState } from "react";

/** Why the queue let go of the message; `block` reasons last only while that block does. */
type Released = Readonly<{ reason: string; block: boolean }>;
export type QueueState = Readonly<{ queued: boolean; released?: Released }>;
export const STOPPED_NOTICE = "Stopped; your message is kept.";

/**
 * One step of the composer's one queued message. `waiting`: a run is in flight for the last message, or
 * the conversation is still being checked. `ready`: a new message may be sent now. `release`: why the
 * queue must be dropped (a block other than the run, a terminal block once the run ended, or an emptied
 * box, `""`), else `false`. The queue clears before its one send, so nothing is sent twice.
 */
export function nextQueueState(
  state: QueueState,
  input: Readonly<{ waiting: boolean; ready: boolean; release: string | false }>,
): { state: QueueState; send: boolean } {
  if (state.queued && input.release !== false)
    return {
      state: {
        queued: false,
        ...(input.release ? { released: { reason: input.release, block: true } } : {}),
      },
      send: false,
    };
  if (state.queued && input.ready) return { state: { queued: false }, send: true };
  // A reason clears once its block has, or once a new message is on its way.
  if (state.released && (input.waiting || (state.released.block && input.release === false)))
    return { state: { queued: state.queued }, send: false };
  return { state, send: false };
}

/** Queue the draft: drops any earlier reason. */
export const queueMessage = (): QueueState => ({ queued: true });
/** Stop the run: a queued message stays in the box as an ordinary draft, and the person is told so. */
export const stopQueue = (state: QueueState): QueueState =>
  state.queued ? { queued: false, released: { reason: STOPPED_NOTICE, block: false } } : state;

export function useQueuedSend(
  waiting: boolean,
  ready: boolean,
  release: string | false,
  send: () => void,
) {
  const [state, setState] = useState<QueueState>({ queued: false });
  const [sends, setSends] = useState(0);
  // Render-phase transition: the queue clears during render and the one send runs after that render commits.
  const next = nextQueueState(state, { waiting, ready, release });
  if (next.state !== state) setState(next.state);
  if (next.send) setSends(sends + 1);
  const sendQueued = useEffectEvent(send);
  useEffect(() => {
    if (sends > 0) sendQueued();
  }, [sends]);
  return {
    onQueue:
      waiting && release === false && !state.queued
        ? () => setState(queueMessage())
        : undefined,
    queued: state.queued ? { onCancel: () => setState({ queued: false }) } : undefined,
    released: state.released?.reason,
    stop: () => setState(stopQueue),
  };
}

/** How long a message waits on the conversation check before the check's own refusal is shown instead. */
export const CHECK_WAIT_MS = 8_000;
/** True while `checking` has lasted less than `limitMs`; it re-arms whenever the check ends and starts again. */
export function useBoundedCheck(checking: boolean, limitMs = CHECK_WAIT_MS) {
  const [expired, setExpired] = useState(false);
  if (!checking && expired) setExpired(false);
  useEffect(() => {
    if (!checking) return;
    const timer = setTimeout(() => setExpired(true), limitMs);
    return () => clearTimeout(timer);
  }, [checking, limitMs]);
  return checking && !expired;
}

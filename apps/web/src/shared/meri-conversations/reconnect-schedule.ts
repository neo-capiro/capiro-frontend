"use client";
import { useEffect, useState, useSyncExternalStore } from "react";

/** First automatic retry after 2 s, doubling to a 30 s ceiling while control keeps not answering. */
export const RECONNECT_BASE_MS = 2_000;
export const RECONNECT_MAX_MS = 30_000;

/** "busy" is an attempt in flight: it neither schedules another nor resets the ladder. */
export type ReconnectState = "ok" | "busy" | "failing";

export const reconnectDelayMs = (
  attempt: number,
  baseMs = RECONNECT_BASE_MS,
  maxMs = RECONNECT_MAX_MS,
) => Math.min(maxMs, baseMs * 2 ** attempt);

/**
 * Backed-off automatic retries of one read while it keeps failing because control did not answer.
 * Each failing observation schedules at most one next attempt; success ends the episode and resets
 * the ladder, and an explicit Retry starts it over. The schedule never decides what to run. With
 * `maxAttempts`, a failure after that many automatic attempts schedules nothing more: the schedule is
 * `stopped` until success or an explicit Retry, so a steady failure cannot poll for the life of the page.
 */
export function createReconnectSchedule(
  baseMs = RECONNECT_BASE_MS,
  maxMs = RECONNECT_MAX_MS,
  maxAttempts = Infinity,
) {
  let attempts = 0;
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let run: () => void = () => undefined;
  const listeners = new Set<() => void>();
  const notify = () => {
    for (const listener of listeners) listener();
  };
  const cancel = () => {
    clearTimeout(timer);
    timer = undefined;
  };
  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    /** True while an automatic attempt is scheduled. */
    pending: () => timer !== undefined,
    attempts: () => attempts,
    /** True once the automatic attempts are spent; only success or an explicit Retry clears it. */
    stopped: () => stopped,
    observe(state: ReconnectState, next: () => void) {
      run = next;
      if (state === "ok") {
        if (timer === undefined && attempts === 0) return;
        cancel();
        attempts = 0;
        stopped = false;
        notify();
        return;
      }
      if (state === "busy" || timer !== undefined || stopped) return;
      if (attempts >= maxAttempts) {
        stopped = true;
        notify();
        return;
      }
      const delay = reconnectDelayMs(attempts++, baseMs, maxMs);
      timer = setTimeout(() => {
        timer = undefined;
        notify();
        run();
      }, delay);
      notify();
    },
    /** An explicit retry starts the ladder over; the caller runs the attempt itself. */
    reset() {
      cancel();
      attempts = 0;
      stopped = false;
      notify();
    },
    dispose() {
      cancel();
      attempts = 0;
      stopped = false;
    },
  };
}

export function useReconnectSchedule(
  state: ReconnectState,
  run: () => void,
  maxAttempts = Infinity,
) {
  const [schedule] = useState(() =>
    createReconnectSchedule(RECONNECT_BASE_MS, RECONNECT_MAX_MS, maxAttempts),
  );
  useEffect(() => {
    schedule.observe(state, run);
  }, [schedule, state, run]);
  useEffect(() => () => schedule.dispose(), [schedule]);
  const pending = useSyncExternalStore(
    schedule.subscribe,
    schedule.pending,
    schedule.pending,
  );
  const stopped = useSyncExternalStore(
    schedule.subscribe,
    schedule.stopped,
    schedule.stopped,
  );
  return { pending, stopped, reset: schedule.reset };
}

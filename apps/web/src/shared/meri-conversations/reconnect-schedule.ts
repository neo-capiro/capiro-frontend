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
 * the ladder, and an explicit Retry starts it over. The schedule never decides what to run.
 */
export function createReconnectSchedule(
  baseMs = RECONNECT_BASE_MS,
  maxMs = RECONNECT_MAX_MS,
) {
  let attempts = 0;
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
    observe(state: ReconnectState, next: () => void) {
      run = next;
      if (state === "ok") {
        if (timer === undefined && attempts === 0) return;
        cancel();
        attempts = 0;
        notify();
        return;
      }
      if (state === "busy" || timer !== undefined) return;
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
      notify();
    },
    dispose() {
      cancel();
      attempts = 0;
    },
  };
}

export function useReconnectSchedule(state: ReconnectState, run: () => void) {
  const [schedule] = useState(() => createReconnectSchedule());
  useEffect(() => {
    schedule.observe(state, run);
  }, [schedule, state, run]);
  useEffect(() => () => schedule.dispose(), [schedule]);
  const pending = useSyncExternalStore(
    schedule.subscribe,
    schedule.pending,
    schedule.pending,
  );
  return { pending, reset: schedule.reset };
}

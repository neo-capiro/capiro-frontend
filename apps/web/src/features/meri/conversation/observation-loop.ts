export type ObservationOutcome = "settled" | "stalled" | "stopped";
export type ObservationPhase = "live" | "reconnecting";

/** Waits between attempts that admitted nothing new; three in a row stop the loop. */
export const reconnectDelays: readonly number[] = Object.freeze([
  1_000, 2_000, 4_000,
]);

const pause = (milliseconds: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    if (signal.aborted || milliseconds <= 0) return resolve();
    const done = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", done);
      resolve();
    };
    const timer = setTimeout(done, milliseconds);
    signal.addEventListener("abort", done, { once: true });
  });

/**
 * Keeps observing one run until its authoritative status settles. A stream ending is not
 * completion: the loop resumes from the receiver's accepted cursor. Attempts that admit new
 * events reset the failure budget; consecutive failed attempts without progress back off and then
 * stop as "stalled" so the person can reconnect explicitly. A window that Meri closed cleanly
 * without new events is not a failure: before the run starts there can be minutes of them, so the
 * loop keeps watching after a short pause. Aborting stops observation only; it never cancels the run.
 */
export async function observeUntilSettled({
  attempt,
  settled,
  progress,
  signal,
  onPhase,
  delays = reconnectDelays,
  wait = pause,
}: {
  /** One subscription. `first` is true only for the first attempt of this loop. */
  attempt: (first: boolean) => Promise<void>;
  settled: () => boolean;
  /** The receiver's accepted cursor; it only moves forward. */
  progress: () => number;
  signal: AbortSignal;
  onPhase?: (phase: ObservationPhase) => void;
  delays?: readonly number[];
  wait?: (milliseconds: number, signal: AbortSignal) => Promise<void>;
}): Promise<ObservationOutcome> {
  let first = true,
    failures = 0;
  while (!signal.aborted) {
    if (settled()) return "settled";
    // Meri closes every window within 30 s, so a window that admitted events and then ended is a normal rollover, not an
    // interruption. Only an attempt that admitted nothing reads as reconnecting.
    onPhase?.(failures === 0 ? "live" : "reconnecting");
    const before = progress();
    let failed = false;
    try {
      await attempt(first);
    } catch {
      // The failure budget below decides whether to resume.
      failed = true;
    }
    first = false;
    if (signal.aborted) break;
    if (settled()) return "settled";
    if (progress() > before) failures = 0;
    else if (failed) failures++;
    else {
      // A clean, empty window: still live; pause before the next one so a window that closes at once cannot spin.
      await wait(delays[0] ?? 0, signal);
      continue;
    }
    if (failures > delays.length) return "stalled";
    if (failures > 0) {
      onPhase?.("reconnecting");
      await wait(delays[failures - 1]!, signal);
    }
  }
  return "stopped";
}

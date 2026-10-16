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
 * events reset the failure budget; consecutive attempts without progress back off and then stop
 * as "stalled" so the person can reconnect explicitly. Aborting stops observation only; it never
 * cancels the run.
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
    onPhase?.(first && failures === 0 ? "live" : "reconnecting");
    const before = progress();
    try {
      await attempt(first);
    } catch {
      // The failure budget below decides whether to resume.
    }
    first = false;
    if (signal.aborted) break;
    if (settled()) return "settled";
    failures = progress() > before ? 0 : failures + 1;
    if (failures > delays.length) return "stalled";
    if (failures > 0) {
      onPhase?.("reconnecting");
      await wait(delays[failures - 1]!, signal);
    }
  }
  return "stopped";
}

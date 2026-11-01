/** How long an unanswered access check waits before one automatic recheck. */
export const ACCESS_RECHECK_MS = 1_500;
/**
 * After an automatic recheck, no further automatic recheck for this long. A recheck that reissues
 * a session makes access look regained for a moment before the same refusal returns; without this
 * floor that flapping would recheck forever.
 */
export const ACCESS_RECHECK_COOLDOWN_MS = 30_000;

/**
 * One automatic recheck per access-loss episode. The first loss schedules exactly one retry; a loss
 * that persists after it waits for the person's explicit "Check access again". Regained access
 * ends the episode, and a later loss gets its own single automatic recheck once the cooldown has
 * passed. The owner of this schedule must outlive the access-loss presentation.
 */
export function createAccessRecheck(
  delayMs = ACCESS_RECHECK_MS,
  cooldownMs = ACCESS_RECHECK_COOLDOWN_MS,
  now: () => number = Date.now,
) {
  let scheduled = false;
  let lastRun: number | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let recheck: () => void = () => undefined;
  const listeners = new Set<() => void>();
  const notify = () => {
    for (const listener of listeners) listener();
  };
  const cancel = () => {
    clearTimeout(timer);
    timer = undefined;
    scheduled = false;
  };
  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    /** True while the automatic recheck is still pending. */
    pending: () => scheduled,
    /** Reports the current access state; the latest `run` is the one an automatic recheck calls. */
    observe(accessLost: boolean, run: () => void) {
      recheck = run;
      if (!accessLost) {
        if (!scheduled) return;
        cancel();
        notify();
        return;
      }
      if (scheduled || (lastRun !== undefined && now() - lastRun < cooldownMs))
        return;
      scheduled = true;
      notify();
      timer = setTimeout(() => {
        timer = undefined;
        scheduled = false;
        lastRun = now();
        notify();
        recheck();
      }, delayMs);
    },
    dispose() {
      cancel();
    },
  };
}

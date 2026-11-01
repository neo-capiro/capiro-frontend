/** How long an unanswered access check waits before one automatic recheck. */
export const ACCESS_RECHECK_MS = 1_500;

/**
 * One automatic recheck per access-loss episode. The first loss schedules exactly one retry; a loss
 * that persists after it waits for the person's explicit "Check access again". Regained access
 * resets the episode so a later loss gets its own single automatic recheck.
 */
export function createAccessRecheck(delayMs = ACCESS_RECHECK_MS) {
  let phase: "idle" | "scheduled" | "done" = "idle";
  let recheck = () => undefined as void;
  let timer: ReturnType<typeof setTimeout> | undefined;
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
    /** True while the automatic recheck is still pending. */
    pending: () => phase === "scheduled",
    /** Reports the current access state; the latest `run` is the one an automatic recheck calls. */
    observe(accessLost: boolean, run: () => void) {
      recheck = run;
      if (!accessLost) {
        if (phase === "idle") return;
        cancel();
        phase = "idle";
        notify();
        return;
      }
      if (phase !== "idle") return;
      phase = "scheduled";
      notify();
      timer = setTimeout(() => {
        timer = undefined;
        phase = "done";
        notify();
        recheck();
      }, delayMs);
    },
    dispose() {
      cancel();
      phase = "idle";
    },
  };
}

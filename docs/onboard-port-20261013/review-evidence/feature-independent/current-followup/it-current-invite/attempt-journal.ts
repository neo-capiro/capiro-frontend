import type { QueryClient } from "@tanstack/react-query";

export type AttemptRecord = {
  phase: "pending" | "unknown" | "confirmed" | "rejected";
  intent: string;
  detail?: string;
};
export type AttemptGuard = {
  current: () => boolean;
  assertCurrent: () => void;
  wait: <T>(effect: () => Promise<T>) => Promise<T>;
};
export class ConfirmedInputRefusal extends Error {}

const interrupted = () =>
  new DOMException("This onboarding view was replaced.", "AbortError");

/** Local effect admission/outcome only. Native services retain all authority. */
export function createOnboardAttempt(
  cache: QueryClient,
  name: string,
  isOwnerCurrent: () => boolean,
  namespace: readonly unknown[] = ["onboard"],
) {
  const key = [...namespace, "attempt", name];
  cache.setQueryDefaults(key, { gcTime: Infinity });
  let live = false;
  let epoch = 0;
  let activeRecord: AttemptRecord | undefined;
  const read = () => {
    const record = cache.getQueryData<AttemptRecord>(key);
    return record;
  };
  const write = (record: AttemptRecord) =>
    cache.setQueryData<AttemptRecord>(key, record);
  const blocked = () => ["pending", "unknown"].includes(read()?.phase ?? "");
  const guard = (): AttemptGuard => {
    const generation = epoch;
    const current = () => live && generation === epoch && isOwnerCurrent();
    const assertCurrent = () => {
      if (!current()) throw interrupted();
    };
    return {
      current,
      assertCurrent,
      wait: async (effect) => {
        assertCurrent();
        const result = await effect();
        assertCurrent();
        return result;
      },
    };
  };
  return {
    key,
    read,
    blocked,
    guard,
    mount() {
      live = true;
      epoch += 1;
      return () => {
        live = false;
        epoch += 1;
        const record = read();
        if (record && record === activeRecord && record.phase === "pending")
          write({
            ...record,
            phase: "unknown",
            detail:
              "The view closed before a current acknowledgement was confirmed.",
          });
      };
    },
    async run<T>(
      intent: string,
      perform: (attempt: AttemptGuard) => Promise<T>,
    ) {
      const attempt = guard();
      attempt.assertCurrent();
      if (blocked())
        throw new Error(
          "This operation needs current-status review before another submission.",
        );
      const pending = write({ phase: "pending", intent });
      activeRecord = pending;
      try {
        const result = await perform(attempt);
        attempt.assertCurrent();
        write({ phase: "confirmed", intent });
        return result;
      } catch (error) {
        // An invalid/aborted response does not prove the effect did not occur.
        if (read() === pending)
          write({
            phase:
              error instanceof ConfirmedInputRefusal ? "rejected" : "unknown",
            intent,
            detail:
              "The result was not confirmed. Check current status; do not repeat this submission.",
          });
        throw error;
      }
    },
    async reconcile<T>(
      fetchCurrent: () => Promise<T>,
      confirms: (value: T) => boolean,
    ) {
      const attempt = guard();
      const before = read();
      const value = await attempt.wait(fetchCurrent);
      if (confirms(value)) {
        const record = read();
        if (record && record === before && record.phase === "unknown")
          write({
            ...record,
            phase: "confirmed",
            detail:
              "Current state confirmed. This does not prove delivery of a prior notification.",
          });
      }
      return value;
    },
  };
}

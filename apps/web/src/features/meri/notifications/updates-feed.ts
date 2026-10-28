import type { RunIndexSummary } from "@capiro/meri-contracts/conversation-history";
import {
  receiveMemoryNotificationPage,
  type MemoryNotificationPage,
} from "../../../shared/meri-notifications/memory-contract";

/**
 * The Updates read lifecycle, owned by this surface.
 *
 * One feed instance serves one account lifetime. Its scope is changed through
 * `read(scope)` instead of being rebuilt, so the previously authorized rows stay
 * visible while the newly selected scope is being verified — they are released
 * only when the account lifetime ends (dispose/access loss), never merely because
 * a client selection changed. It is deliberately not a store or a second
 * scheduler: it holds one recent page per owner plus the local read state.
 */
export type UpdatesScope = Readonly<
  { kind: "client"; clientId: string } | { kind: "general" }
>;

export const GENERAL_SCOPE: UpdatesScope = Object.freeze({ kind: "general" });

/** Scope object from the selected client id (a primitive), so identity is stable. */
export function runScope(clientId: string | null | undefined): UpdatesScope {
  return clientId ? Object.freeze({ kind: "client", clientId }) : GENERAL_SCOPE;
}

export function scopeKey(scope: UpdatesScope): string {
  return scope.kind === "client" ? `client:${scope.clientId}` : "general";
}

/** The key that may create a new feed. It never contains a scope object identity. */
export function updatesLifetimeKey(ownerKey: string): string {
  return `owner:${ownerKey}`;
}

export type Feed<T> =
  | { state: "loading" }
  | { state: "observed"; value: T }
  | { state: "unavailable" };

export type UpdatesFeedSnapshot = Readonly<{
  notifications: Feed<MemoryNotificationPage>;
  runs: Feed<readonly RunIndexSummary[]>;
  /** A read for a newly selected scope is in flight; retained rows are not current. */
  refreshing: boolean;
  /** False when the last read for the current scope could not be verified. */
  scopeVerified: boolean;
  moreError: string;
  /** Number of reads this feed has dispatched; used by tests and diagnostics. */
  reads: number;
}>;

type NotificationsClient = Readonly<{
  list(
    input: Readonly<{ cursor?: string | null }>,
    signal: AbortSignal,
  ): Promise<MemoryNotificationPage>;
}>;

type RunsClient = Readonly<{
  list(
    input: Readonly<{
      scope: UpdatesScope;
      status: "terminal";
      cursor: null;
      limit: number;
    }>,
    signal: AbortSignal,
  ): Promise<{ runs: readonly RunIndexSummary[] }>;
}>;

const empty = (): UpdatesFeedSnapshot => ({
  notifications: { state: "loading" },
  runs: { state: "loading" },
  refreshing: false,
  scopeVerified: false,
  moreError: "",
  reads: 0,
});

export function createUpdatesFeed(input: {
  scope: UpdatesScope;
  notificationsClient: NotificationsClient;
  runsClient: RunsClient;
  /** Account-lifetime fence owned by the caller; rechecked at every boundary. */
  isCurrent: () => boolean;
  onAccessLost: () => void;
  onSnapshot?: () => void;
}) {
  let value = empty();
  let generation = 0;
  let controller: AbortController | undefined;
  let pending = false;
  let disposed = false;
  let scope = input.scope;
  let reads = 0;
  const listeners = new Set<() => void>();

  const publish = (next: UpdatesFeedSnapshot) => {
    value = Object.freeze(next);
    listeners.forEach((listener) => listener());
    input.onSnapshot?.();
  };
  const canPublish = (forGeneration: number, signal: AbortSignal) =>
    !disposed &&
    generation === forGeneration &&
    !signal.aborted &&
    input.isCurrent();

  async function dispatch(nextScope: UpdatesScope) {
    if (disposed) return;
    const forGeneration = ++generation;
    controller?.abort();
    const current = new AbortController();
    controller = current;
    pending = false;
    scope = nextScope;
    reads += 1;
    publish({
      ...value,
      // Retain the previously authorized rows while the new scope is verified.
      refreshing: true,
      scopeVerified: false,
      moreError: "",
      reads,
    });
    const [notifications, runs] = await Promise.allSettled([
      input.notificationsClient.list({ cursor: null }, current.signal),
      input.runsClient.list(
        { scope: nextScope, status: "terminal", cursor: null, limit: 20 },
        current.signal,
      ),
    ]);
    if (!canPublish(forGeneration, current.signal)) return;
    const runValue =
      runs.status === "fulfilled" && !("error" in runs.value)
        ? runs.value.runs
        : null;
    const notificationsValue =
      notifications.status === "fulfilled" && notifications.value
        ? notifications.value
        : null;
    publish({
      notifications:
        notificationsValue !== null
          ? { state: "observed", value: notificationsValue }
          : { state: "unavailable" },
      runs:
        runValue !== null
          ? { state: "observed", value: runValue }
          : { state: "unavailable" },
      refreshing: false,
      scopeVerified: notificationsValue !== null && runValue !== null,
      moreError: "",
      reads,
    });
  }

  return Object.freeze({
    snapshot: () => value,
    scope: () => scope,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    /** Explicit read. Never dispatched by a render or by a preference save. */
    read(nextScope: UpdatesScope = scope) {
      return dispatch(nextScope).catch(() => {
        if (!disposed && input.isCurrent())
          publish({
            ...value,
            refreshing: false,
            moreError: "Updates could not be verified. Try again.",
          });
      });
    },
    /**
     * Validates the next window before committing it. A malformed or
     * non-advancing page keeps the previous authorized page and reports a local
     * message; it can never throw into a state update.
     */
    async loadMore() {
      const page = value.notifications;
      if (
        disposed ||
        pending ||
        page.state !== "observed" ||
        !page.value.nextCursor ||
        !controller
      )
        return;
      const cursor = page.value.nextCursor;
      const forGeneration = generation;
      const signal = controller.signal;
      const base = page.value;
      pending = true;
      publish({ ...value, moreError: "" });
      try {
        // Re-admit the next window through the closed receiver so a client that
        // returns a malformed, repeated or over-long page fails locally here
        // instead of reaching a state update or the DOM.
        const next = receiveMemoryNotificationPage(
          await input.notificationsClient.list({ cursor }, signal),
        );
        if (!canPublish(forGeneration, signal)) return;
        if (
          value.notifications.state !== "observed" ||
          value.notifications.value !== base
        )
          return;
        if (base.nextCursor !== cursor) return;
        if (next.nextCursor !== null && next.nextCursor === cursor) {
          publish({
            ...value,
            moreError:
              "The next updates window did not advance. The verified page is kept.",
          });
          return;
        }
        const seen = new Set(base.items.map((row) => row.id));
        if (next.items.some((row) => seen.has(row.id))) {
          publish({
            ...value,
            moreError:
              "The next updates window repeated a notice. The verified page is kept.",
          });
          return;
        }
        publish({
          ...value,
          notifications: {
            state: "observed",
            value: { ...next, items: [...base.items, ...next.items] },
          },
          moreError: "",
        });
      } catch {
        if (canPublish(forGeneration, signal))
          publish({
            ...value,
            moreError:
              "The next updates window could not be verified. Try again.",
          });
      } finally {
        pending = false;
      }
    },
    /** Ends this account lifetime: every retained row is released. */
    lose() {
      generation += 1;
      disposed = true;
      controller?.abort();
      controller = undefined;
      pending = false;
      publish({ ...empty(), reads });
    },
    dispose() {
      generation += 1;
      disposed = true;
      controller?.abort();
      controller = undefined;
      listeners.clear();
    },
  });
}

export type UpdatesFeed = ReturnType<typeof createUpdatesFeed>;

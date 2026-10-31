import { describe, expect, it } from "vitest";
import type { RunIndexSummary } from "@capiro/meri-contracts/conversation-history";
import {
  MEMORY_NOTIFICATION_SCHEMA,
  receiveMemoryNotificationPage,
} from "../src/shared/meri-notifications/memory-contract";
import {
  GENERAL_SCOPE,
  createUpdatesFeed,
  runScope,
  scopeKey,
  updatesLifetimeKey,
} from "../src/features/meri/notifications/updates-feed";

const ids = {
  a: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  b: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  c: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  d: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
};
const conversationId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const runId = "ffffffff-ffff-4fff-8fff-ffffffffffff";

function notification(id: string, eventType = "review_assigned") {
  return {
    id,
    reviewRequestId: ids.d,
    candidateId: ids.c,
    clientId: null,
    eventType,
    title: "Memory proposal",
    readAt: null,
    createdAt: "2026-10-27T10:00:00.000Z",
  };
}

function page(
  items: Record<string, unknown>[],
  over: Record<string, unknown> = {},
) {
  return receiveMemoryNotificationPage({
    schemaVersion: MEMORY_NOTIFICATION_SCHEMA,
    enabled: true,
    items,
    nextCursor: null,
    ...over,
  });
}

const run: RunIndexSummary = {
  conversationId,
  runId,
  createdAt: "2026-10-26T09:00:00.000Z",
  state: "completed",
  statusAt: "2026-10-27T12:00:00.000Z",
  lastSequence: 1,
  clientIds: [],
  usage: {
    recording: "not-recorded",
    sdkEstimateUsd: null,
    providerBilledUsd: null,
  },
  references: { conversationId, runId },
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

/**
 * Synthetic clients that count reads. The feed owns no network of its own, so a
 * read count is the exact number of dispatched owner reads.
 */
function harness(options: { hold?: boolean } = {}) {
  const calls = { notifications: 0, runs: 0 };
  const held: Array<() => void> = [];
  let pages: ReturnType<typeof page>[] = [page([notification(ids.a)])];
  let pageIndex = 0;
  const notificationsClient = {
    async list() {
      calls.notifications += 1;
      if (options.hold) {
        const gate = deferred<void>();
        held.push(() => gate.resolve());
        await gate.promise;
      }
      const next = pages[Math.min(pageIndex, pages.length - 1)];
      if (!next) throw new Error("No synthetic notification page configured");
      pageIndex += 1;
      return next;
    },
  };
  const runsClient = {
    async list() {
      calls.runs += 1;
      return {
        runs: [run],
        nextCursor: null,
        coverage: {
          kind: "current-authorized-durable-runs" as const,
          complete: true,
          snapshot: false as const,
        },
      };
    },
  };
  return {
    calls,
    release: () => held.splice(0).forEach((open) => open()),
    setPages: (next: ReturnType<typeof page>[]) => {
      pages = next;
      pageIndex = 0;
    },
    feed(
      isCurrent: () => boolean = () => true,
      onAccessLost: () => void = () => undefined,
    ) {
      return createUpdatesFeed({
        scope: GENERAL_SCOPE,
        notificationsClient,
        runsClient,
        isCurrent,
        onAccessLost,
      });
    },
  };
}

describe("updates scope and lifetime identity", () => {
  it("derives stable keys from primitives, never from an object identity", () => {
    expect(runScope(null)).toBe(GENERAL_SCOPE);
    expect(runScope(undefined)).toBe(GENERAL_SCOPE);
    expect(Object.isFrozen(runScope("client-1"))).toBe(true);
    expect(scopeKey(runScope("client-1"))).toBe("client:client-1");
    expect(scopeKey(runScope(null))).toBe("general");
    expect(scopeKey(runScope("client-1"))).toBe(scopeKey(runScope("client-1")));
    expect(scopeKey(runScope("client-2"))).not.toBe(
      scopeKey(runScope("client-1")),
    );
    expect(updatesLifetimeKey("t:a")).toBe("owner:t:a");
    expect(updatesLifetimeKey("t:a")).toBe(updatesLifetimeKey("t:a"));
    expect(updatesLifetimeKey("t:b")).not.toBe(updatesLifetimeKey("t:a"));
  });
});

describe("updates feed reads", () => {
  it("settles after one explicit read and does not re-read on local churn", async () => {
    const test = harness();
    const feed = test.feed();
    const seen: string[] = [];
    feed.subscribe(() => seen.push(feed.snapshot().notifications.state));
    await feed.read();
    expect(test.calls).toEqual({ notifications: 1, runs: 1 });
    expect(feed.snapshot().reads).toBe(1);
    expect(feed.snapshot().notifications.state).toBe("observed");
    expect(feed.snapshot().runs.state).toBe("observed");
    expect(feed.snapshot().refreshing).toBe(false);
    expect(feed.snapshot().scopeVerified).toBe(true);
    // Subscriber notifications (a preference save or a local render) never read.
    await Promise.resolve();
    expect(test.calls).toEqual({ notifications: 1, runs: 1 });
    expect(seen.length).toBeGreaterThan(0);
  });

  it("reads exactly once per explicit refresh", async () => {
    const test = harness();
    const feed = test.feed();
    await feed.read();
    await feed.read();
    expect(test.calls).toEqual({ notifications: 2, runs: 2 });
    expect(feed.snapshot().reads).toBe(2);
  });

  it("retains the previously verified scope while a new scope is verified", async () => {
    const test = harness({ hold: true });
    const feed = test.feed();
    const clientScope = runScope("client-9");
    const first = feed.read(clientScope);
    await Promise.resolve();
    test.release();
    await first;
    const before = feed.snapshot().notifications;
    expect(before.state).toBe("observed");
    test.setPages([page([notification(ids.b)])]);
    const second = feed.read(runScope("client-10"));
    await Promise.resolve();
    expect(feed.snapshot().refreshing).toBe(true);
    // Only the scope-specific promise is held; the runs read settles immediately.
    test.release();
    await second;
    expect(feed.snapshot().refreshing).toBe(false);
    const after = feed.snapshot().notifications;
    expect(after.state).toBe("observed");
    if (after.state === "observed" && before.state === "observed")
      expect(after.value.items[0]?.id).not.toBe(before.value.items[0]?.id);
  });

  it("reports an unverified scope instead of pretending the retained rows are current", async () => {
    const test = harness();
    const feed = test.feed();
    await feed.read();
    const failing = createUpdatesFeed({
      scope: GENERAL_SCOPE,
      notificationsClient: {
        list: async () => {
          throw new Error("unavailable");
        },
      },
      runsClient: {
        list: async () => {
          throw new Error("unavailable");
        },
      },
      isCurrent: () => true,
      onAccessLost: () => undefined,
    });
    await failing.read();
    expect(failing.snapshot().scopeVerified).toBe(false);
    expect(failing.snapshot().notifications.state).toBe("unavailable");
    expect(failing.snapshot().runs.state).toBe("unavailable");
    await failing.read();
    expect(failing.snapshot().reads).toBe(2);
    expect(failing.snapshot().scopeVerified).toBe(false);
  });

  it("releases every retained row when the account lifetime ends", async () => {
    const test = harness({ hold: true });
    const feed = test.feed();
    const pending = feed.read();
    await Promise.resolve();
    test.release();
    await pending;
    expect(feed.snapshot().notifications.state).toBe("observed");
    feed.lose();
    expect(feed.snapshot().notifications.state).toBe("loading");
    expect(feed.snapshot().runs.state).toBe("loading");
    test.release();
    await Promise.resolve();
    expect(feed.snapshot().notifications.state).toBe("loading");
    // A late resolution after dispose can never publish.
    const held = harness({ hold: true });
    const disposed = held.feed();
    const late = disposed.read();
    await Promise.resolve();
    disposed.dispose();
    held.release();
    await late;
    expect(disposed.snapshot().notifications.state).toBe("loading");
  });
});

describe("updates pagination admission", () => {
  it("appends an admitted next window and reports its own failures locally", async () => {
    const base = page([notification(ids.a)]);
    const test = harness();
    test.setPages([page([notification(ids.a)], { nextCursor: "cursor-1" })]);
    const feed = test.feed();
    await feed.read();
    test.setPages([page([notification(ids.b)])]);
    await feed.loadMore();
    const snapshot = feed.snapshot();
    expect(snapshot.notifications.state).toBe("observed");
    if (snapshot.notifications.state === "observed")
      expect(snapshot.notifications.value.items.map((row) => row.id)).toEqual([
        ids.a,
        ids.b,
      ]);
    expect(snapshot.moreError).toBe("");
    expect(base.items).toHaveLength(1);
  });

  it("keeps the verified page and never throws on a repeated or non-advancing window", async () => {
    const test = harness();
    const feed = test.feed();
    test.setPages([page([notification(ids.a)], { nextCursor: "cursor-1" })]);
    await feed.read();
    // A repeated notice.
    test.setPages([page([notification(ids.a)])]);
    await expect(feed.loadMore()).resolves.toBeUndefined();
    expect(feed.snapshot().moreError).toMatch(/repeated/i);
    const afterRepeat = feed.snapshot().notifications;
    expect(afterRepeat.state).toBe("observed");
    if (afterRepeat.state === "observed")
      expect(afterRepeat.value.items.map((row) => row.id)).toEqual([ids.a]);
    // A non-advancing cursor.
    test.setPages([page([notification(ids.b)], { nextCursor: "cursor-1" })]);
    await expect(feed.loadMore()).resolves.toBeUndefined();
    expect(feed.snapshot().moreError).toMatch(/did not advance/i);
    const afterCursor = feed.snapshot().notifications;
    if (afterCursor.state === "observed")
      expect(afterCursor.value.items).toHaveLength(1);
    // A malformed window the closed receiver refuses. The raw object bypasses
    // the receiver here so the feed's own re-admission is what rejects it.
    test.setPages([
      {
        schemaVersion: MEMORY_NOTIFICATION_SCHEMA,
        enabled: true,
        items: [notification(ids.b), notification(ids.b)],
        nextCursor: null,
      } as unknown as ReturnType<typeof page>,
    ]);
    await expect(feed.loadMore()).resolves.toBeUndefined();
    expect(feed.snapshot().moreError).toMatch(/could not be verified/i);
    const afterMalformed = feed.snapshot().notifications;
    if (afterMalformed.state === "observed")
      expect(afterMalformed.value.items.map((row) => row.id)).toEqual([ids.a]);
  });

  it("refuses a second window while one is in flight and after the lifetime ends", async () => {
    let calls = 0;
    const gate = deferred<void>();
    const feed = createUpdatesFeed({
      scope: GENERAL_SCOPE,
      notificationsClient: {
        async list(input: { cursor?: string | null }) {
          calls += 1;
          if (input.cursor) await gate.promise;
          return page(
            [notification(input.cursor ? ids.b : ids.a)],
            input.cursor ? {} : { nextCursor: "cursor-1" },
          );
        },
      },
      runsClient: {
        async list() {
          return {
            runs: [run],
            nextCursor: null,
            coverage: {
              kind: "current-authorized-durable-runs" as const,
              complete: true,
              snapshot: false as const,
            },
          };
        },
      },
      isCurrent: () => true,
      onAccessLost: () => undefined,
    });
    await feed.read();
    const load = feed.loadMore();
    await Promise.resolve();
    await feed.loadMore();
    expect(calls).toBe(2);
    gate.resolve();
    await load;
    expect(calls).toBe(2);
    const after = feed.snapshot().notifications;
    expect(after.state).toBe("observed");
    if (after.state === "observed")
      expect(after.value.items.map((row) => row.id)).toEqual([ids.a, ids.b]);
    feed.lose();
    await feed.loadMore();
    expect(feed.snapshot().notifications.state).toBe("loading");
  });
});

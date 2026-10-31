import { describe, expect, it, vi } from "vitest";
import type { RunIndexSummary } from "@capiro/meri-contracts/conversation-history";
import { USER_PREFERENCE_DEFAULTS } from "@capiro/meri-client/user-preferences";
import { createRunsClient } from "../src/shared/meri-runs/client";
import {
  createUpdatesFeed,
  GENERAL_SCOPE,
  runScope,
} from "../src/features/meri/notifications/updates-feed";
import { projectUpdates } from "../src/shared/meri-notifications/projection";
import { MEMORY_NOTIFICATION_SCHEMA } from "../src/shared/meri-notifications/memory-contract";

const conversationId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const runIds = [
  "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
];
const coverage = (complete: boolean) => ({
  kind: "current-authorized-durable-runs" as const,
  complete,
  snapshot: false as const,
});
const run = (
  index: number,
  state: RunIndexSummary["state"] = "completed",
): RunIndexSummary => ({
  conversationId,
  runId: runIds[index]!,
  state,
  createdAt: `2026-10-30T0${9 - index}:00:00.000Z`,
  statusAt: "2026-10-31T09:00:00.000Z",
  lastSequence: 1,
  clientIds: [],
  usage: {
    recording: "not-recorded",
    sdkEstimateUsd: null,
    providerBilledUsd: null,
  },
  references: { conversationId, runId: runIds[index]! },
});
const memory = {
  schemaVersion: MEMORY_NOTIFICATION_SCHEMA,
  enabled: true,
  items: [],
  nextCursor: null,
};
const page = (runs: RunIndexSummary[], nextCursor: string | null = null) => ({
  runs,
  nextCursor,
  coverage: coverage(nextCursor === null),
});

function harness() {
  let current = true;
  const list = vi.fn().mockResolvedValue(page([run(0)], "next-1"));
  const memoryList = vi.fn().mockResolvedValue(memory);
  const feed = createUpdatesFeed({
    scope: GENERAL_SCOPE,
    notificationsClient: { list: memoryList },
    runsClient: { list },
    isCurrent: () => current,
    onAccessLost: () => undefined,
  });
  return {
    feed,
    list,
    memoryList,
    retire: () => {
      current = false;
      feed.lose();
    },
  };
}

describe("notification run source pagination", () => {
  it("joins a second real public-protocol page without manufacturing read state", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(async (_url, init) => {
        const request = JSON.parse(
          new TextDecoder().decode(init!.body as Uint8Array),
        );
        return Response.json({
          schemaVersion: "meri.run-index/1",
          observedAt: "2026-10-31T10:00:00.000Z",
          scope: request.scope,
          status: request.status,
          ...page(
            [
              run(
                request.cursor ? 1 : 0,
                request.cursor ? "waiting-for-approval" : "completed",
              ),
            ],
            request.cursor ? null : "next-1",
          ),
        });
      });
    const feed = createUpdatesFeed({
      scope: GENERAL_SCOPE,
      notificationsClient: { list: async () => memory },
      runsClient: createRunsClient(
        () => true,
        () => undefined,
        fetcher,
      ),
      isCurrent: () => true,
      onAccessLost: () => undefined,
    });
    await feed.read();
    expect(feed.snapshot().runNextCursor).toBe("next-1");
    await feed.loadMoreRuns();
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[1]?.[0]).toBe("/api/conversations/runs/list");
    const state = feed.snapshot();
    expect(state.runNextCursor).toBeNull();
    expect(state.runCoverage).toEqual(coverage(true));
    expect(state.runs.state).toBe("observed");
    if (state.runs.state !== "observed") throw new Error("Missing owner rows");
    const projection = projectUpdates({
      notifications: { state: "observed", page: memory },
      runs: { state: "observed", runs: state.runs.value },
      preferences: {
        ...USER_PREFERENCE_DEFAULTS,
        notifications: {
          runCompleted: true,
          approvalRequested: true,
          memoryReviewed: true,
        },
      },
    });
    expect(projection.notices.map((row) => row.source).sort()).toEqual([
      "run-approval",
      "run-outcome",
    ]);
    expect(
      projection.notices.every((row) => row.read === null && row.run !== null),
    ).toBe(true);
  });

  it("advances through empty windows and uses the captured client scope", async () => {
    const h = harness();
    h.list.mockResolvedValueOnce(page([], "next-1"));
    await h.feed.read(runScope("cccccccc-cccc-4ccc-8ccc-cccccccccccc"));
    h.list.mockResolvedValueOnce(page([run(1)]));
    await h.feed.loadMoreRuns();
    expect(h.list.mock.calls[1]?.[0]).toEqual({
      scope: runScope("cccccccc-cccc-4ccc-8ccc-cccccccccccc"),
      status: "all",
      cursor: "next-1",
      limit: 20,
    });
    expect(h.memoryList).toHaveBeenCalledTimes(1);
    expect(h.feed.snapshot().runs).toEqual({
      state: "observed",
      value: [run(1)],
    });
  });

  it.each(["repeat-row", "repeat-cursor", "failure"])(
    "keeps verified pages on %s with no automatic retry",
    async (mode) => {
      const h = harness();
      await h.feed.read();
      const before = h.feed.snapshot().runs;
      if (mode === "failure")
        h.list.mockRejectedValueOnce(new Error("Unavailable"));
      else
        h.list.mockResolvedValueOnce(
          page(
            [run(mode === "repeat-row" ? 0 : 1)],
            mode === "repeat-cursor" ? "next-1" : null,
          ),
        );
      await h.feed.loadMoreRuns();
      expect(h.feed.snapshot().runs).toBe(before);
      expect(h.feed.snapshot().runMoreError).toMatch(/could not be verified/);
      expect(h.feed.snapshot().runMorePending).toBe(false);
      expect(h.list).toHaveBeenCalledTimes(2);
    },
  );

  it("blocks overlapping pages and discards late results after a scope replacement", async () => {
    const h = harness();
    await h.feed.read();
    let resolve!: (value: ReturnType<typeof page>) => void;
    h.list.mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    const pending = h.feed.loadMoreRuns();
    await h.feed.loadMoreRuns();
    expect(h.list).toHaveBeenCalledTimes(2);
    h.list.mockResolvedValueOnce(page([]));
    await h.feed.read(runScope("cccccccc-cccc-4ccc-8ccc-cccccccccccc"));
    resolve(page([run(1)]));
    await pending;
    expect(h.feed.snapshot().runs).toEqual({ state: "observed", value: [] });
    expect(h.feed.snapshot().runMorePending).toBe(false);
  });

  it("does not dispatch more reads after account retirement", async () => {
    const h = harness();
    await h.feed.read();
    h.retire();
    await h.feed.loadMoreRuns();
    await h.feed.read();
    expect(h.list).toHaveBeenCalledTimes(1);
    expect(h.feed.snapshot().runs.state).toBe("loading");
    expect(h.feed.snapshot().runNextCursor).toBeNull();
  });
});

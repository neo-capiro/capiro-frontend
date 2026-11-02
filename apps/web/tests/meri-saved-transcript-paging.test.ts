import { afterEach, expect, it, vi } from "vitest";
import { InfiniteQueryObserver, QueryClient } from "@tanstack/react-query";
import type { UIEvent } from "@capiro/meri-contracts";
import {
  nextSavedPageDue,
  savedHistory,
  savedTranscriptQuery,
} from "../src/shared/meri-conversations/history-queries";
import { sessionHistoryState } from "../src/features/meri/conversation/saved-turns";
import {
  binding,
  clientId,
  nextBinding,
  runFor,
  status,
  event,
} from "../test/browser/meri-conversation-fixtures";
import {
  conversation,
  nextRequestId,
  requestId,
  turn,
} from "../test/browser/meri-history-fixtures";

/**
 * The real history client, receiver and page validator over an explicit synthetic transcript that
 * crosses the page size, driven by the same options and continuation rule the screen uses.
 * No live service, browser or database is involved.
 */
const account = { tenantId: binding.tenantId, actorId: binding.actorId };
const thirdBinding = {
  ...nextBinding,
  runId: "40000000-0000-4000-8000-000000000077",
  attemptId: "50000000-0000-4000-8000-000000000077",
  workerId: "60000000-0000-4000-8000-000000000077",
  writerFence: 3,
};
const thirdRequestId = "a0000000-0000-4000-8000-00000000000c";
// Conversation-wide sequence: the first run fills exactly one page; the middle and latest runs
// follow on the next page.
const firstEvents = Array.from({ length: 100 }, (_, index) =>
  index === 99 ? status(100, "completed") : event(index + 1, "."),
);
const middleEvents = [
  event(1, "Middle answer", nextBinding),
  status(2, "failed", nextBinding),
];
const latestEvents = [
  event(1, "Latest answer", thirdBinding),
  status(2, "completed", thirdBinding),
];
const wrapped = [...firstEvents, ...middleEvents, ...latestEvents].map(
  (item, index) => ({
    sequence: index + 1,
    event: {
      ...item,
      eventId: `70000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    } as UIEvent,
  }),
);
const first = {
  ...turn(binding, requestId, "First question", 0, 100),
  sequenceEnd: 100,
};
const middle = {
  ...turn(nextBinding, nextRequestId, "Middle question", 100, 2),
  run: runFor("failed", nextBinding),
  sequenceEnd: 102,
};
const latest = turn(thirdBinding, thirdRequestId, "Latest question", 102, 2);
const turns = [first, middle, latest];

function transcript(after: number, limit: number) {
  const events = wrapped.filter((row) => row.sequence > after).slice(0, limit);
  const touched = new Set(events.map((row) => row.event.binding.runId));
  const nextSequence = events.at(-1)?.sequence ?? after;
  return {
    schema: "meri.conversation-transcript/1",
    conversation,
    latestRun: latest.run,
    latestSequenceBase: latest.sequenceBase,
    turns: turns.filter((row) => touched.has(row.run.binding.runId)),
    events,
    nextSequence,
    lastSequence: wrapped.length,
    hasMore: nextSequence < wrapped.length,
    pendingTurn: null,
  };
}

/** Every transcript request the screen would make, answered through the real receiver. */
function serve(failAfter?: number) {
  const reads: number[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init: RequestInit) => {
      const input = JSON.parse(
        new TextDecoder().decode(init.body as Uint8Array),
      ) as { after: number; limit: number };
      reads.push(input.after);
      if (input.after === failAfter)
        return Response.json(
          { error: { code: "CONVERSATION_UNAVAILABLE" } },
          { status: 503 },
        );
      return Response.json(transcript(input.after, input.limit));
    }),
  );
  return reads;
}

function observe(client: QueryClient) {
  const observer = new InfiniteQueryObserver(
    client,
    savedTranscriptQuery(account, clientId, binding.conversationId, true),
  );
  const unsubscribe = observer.subscribe((result) => {
    if (nextSavedPageDue(result)) void observer.fetchNextPage();
  });
  return { observer, unsubscribe };
}

/** Every page read and admitted, with nothing left to continue. */
const settled = (observer: ReturnType<typeof observe>["observer"]) => {
  const result = observer.getCurrentResult();
  return result.isSuccess && !result.isFetching && !result.hasNextPage;
};

afterEach(() => {
  vi.unstubAllGlobals();
});

it("reads every saved page by itself so a reload shows the turns between the first page and the latest run", async () => {
  const reads = serve();
  const client = new QueryClient();
  const { observer, unsubscribe } = observe(client);
  try {
    await vi.waitFor(() => expect(settled(observer)).toBe(true));
    const result = observer.getCurrentResult();
    expect(reads).toEqual([0, 100]);
    const { saved, invalid, moreFailed } = savedHistory(
      result,
      true,
      account,
      clientId,
    );
    expect({ invalid, moreFailed }).toEqual({
      invalid: false,
      moreFailed: false,
    });
    const view = sessionHistoryState(
      { saved, current: transcript(102, 100) as never },
      thirdBinding.runId,
      [],
      undefined,
      false,
    );
    // The middle turn is shown, and a failed run is shown as failed rather than dropped.
    expect(
      view.earlier.map((row) => [
        row.prompt,
        row.runState,
        row.incompleteHistory,
      ]),
    ).toEqual([
      ["First question", "completed", false],
      ["Middle question", "failed", false],
    ]);
    expect(view.earlier[1]?.messages.map((m) => m.text)).toEqual([
      "Middle answer",
    ]);
    expect(view.savedCurrent?.prompt).toBe("Latest question");
  } finally {
    unsubscribe();
    client.clear();
  }
});

it("keeps the admitted pages and waits for a manual retry when a later page cannot be read", async () => {
  const reads = serve(100);
  const client = new QueryClient();
  const { observer, unsubscribe } = observe(client);
  try {
    await vi.waitFor(() =>
      expect(observer.getCurrentResult().isFetchNextPageError).toBe(true),
    );
    const failed = observer.getCurrentResult();
    expect(reads).toEqual([0, 100]);
    expect(nextSavedPageDue(failed)).toBe(false);
    const partial = savedHistory(failed, true, account, clientId);
    expect(partial.moreFailed).toBe(true);
    expect(partial.saved?.turns.map((row) => row.request.prompt)).toEqual([
      "First question",
    ]);
    // The retry the status offers reads the rest without re-reading the shown page.
    vi.unstubAllGlobals();
    const retried = serve();
    await observer.fetchNextPage();
    await vi.waitFor(() => expect(settled(observer)).toBe(true));
    expect(retried).toEqual([100]);
    const complete = savedHistory(
      observer.getCurrentResult(),
      true,
      account,
      clientId,
    );
    expect(complete.moreFailed).toBe(false);
    expect(complete.saved?.turns.map((row) => row.request.prompt)).toEqual([
      "First question",
      "Middle question",
      "Latest question",
    ]);
  } finally {
    unsubscribe();
    client.clear();
  }
});

it("never continues a read that is still in flight, failed or finished", () => {
  expect(
    [
      { hasNextPage: true, isFetching: false, error: null },
      { hasNextPage: true, isFetching: true, error: null },
      { hasNextPage: true, isFetching: false, error: new Error("x") },
      { hasNextPage: false, isFetching: false, error: null },
    ].map(nextSavedPageDue),
  ).toEqual([true, false, false, false]);
});

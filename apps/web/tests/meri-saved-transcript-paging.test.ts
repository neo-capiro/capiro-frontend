import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createElement, type ComponentProps, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { InfiniteQueryObserver, QueryClient } from "@tanstack/react-query";
import type { UIEvent } from "@capiro/meri-contracts";
import { ConversationHistoryStatus } from "../src/features/meri/conversation/ConversationHistoryStatus";
import {
  controlFailure,
  controlReconnectingMessage,
} from "../src/features/meri/conversation/control-reachability";
import { ConversationHistoryUnavailable } from "../src/shared/meri-conversations/history-client";
import {
  nextSavedPageDue,
  savedHistory,
  savedTranscriptQuery,
} from "../src/shared/meri-conversations/history-queries";
import {
  sessionHistoryState,
  settledRefreshDue,
} from "../src/features/meri/conversation/saved-turns";
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
const buttons = vi.hoisted(
  () => [] as Array<{ onClick: () => void; children: ReactNode }>,
);
vi.mock("@capiro/ui/button", () => ({
  Button: (props: { onClick: () => void; children: ReactNode }) => {
    buttons.push(props);
    return createElement("button", { onClick: props.onClick }, props.children);
  },
}));
// The backed-off schedule is covered on its own; here only what the status hands it matters.
const ladder = vi.hoisted(
  () => [] as Array<{ state: string; run: () => void }>,
);
vi.mock("../src/shared/meri-conversations/reconnect-schedule", () => ({
  useReconnectSchedule: (state: string, run: () => void) => {
    ladder.push({ state, run });
    return { pending: false, reset: vi.fn() };
  },
}));
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
function serve(failAfter?: number, stallAfter?: number) {
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
      // A page that claims more without moving the cursor.
      if (input.after === stallAfter)
        return Response.json({
          ...transcript(input.after, 0),
          nextSequence: input.after,
          hasMore: true,
        });
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

beforeEach(() => {
  buttons.length = 0;
  ladder.length = 0;
});
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

it("a page that claims more without moving the cursor is a failed continuation, never a silent end", async () => {
  const reads = serve(undefined, 100);
  const client = new QueryClient();
  const { observer, unsubscribe } = observe(client);
  try {
    await vi.waitFor(() =>
      expect(observer.getCurrentResult().isFetchNextPageError).toBe(true),
    );
    const result = observer.getCurrentResult();
    expect(reads).toEqual([0, 100]);
    expect(nextSavedPageDue(result)).toBe(false);
    const partial = savedHistory(result, true, account, clientId);
    expect(partial.moreFailed).toBe(true);
    expect(partial.saved?.turns.map((row) => row.request.prompt)).toEqual([
      "First question",
    ]);
    // Not something control failed to answer: it waits for the person, not the ladder.
    expect(controlFailure(result.error)).toBeUndefined();
  } finally {
    unsubscribe();
    client.clear();
  }
});

type HistorySession = ComponentProps<
  typeof ConversationHistoryStatus
>["session"];
function failedContinuation(error: unknown) {
  const query = {
    isPending: false,
    isRefetching: false,
    isFetching: false,
    hasNextPage: true,
    isFetchNextPageError: true,
    error,
    fetchNextPage: vi.fn(),
    refetch: vi.fn(),
  };
  const session = {
    history: {
      selected: true,
      unavailable: false,
      moreFailed: true,
      empty: false,
      query,
      tail: { refetch: vi.fn() },
      refresh: vi.fn(),
    },
    continuation: { intent: undefined, failed: false, notReady: false },
    recoveryNeeded: false,
    unknownReservation: false,
    readReservation: vi.fn(),
  };
  const html = renderToStaticMarkup(
    createElement(ConversationHistoryStatus, {
      session: session as unknown as HistorySession,
    }),
  );
  return { html: html.replace(/&#x27;/g, "'"), query, session };
}

it("a continuation control did not answer re-reads only that page on the ladder; a refused one waits for the person", () => {
  const unreachable = failedContinuation(
    new ConversationHistoryUnavailable(503, "CONVERSATION_UNAVAILABLE"),
  );
  expect(unreachable.html).toContain(controlReconnectingMessage);
  expect(unreachable.html).not.toContain("Part of the saved conversation");
  expect(ladder.map((entry) => entry.state)).toEqual(["failing"]);
  ladder[0]!.run();
  expect(buttons.map((button) => button.children)).toEqual(["Retry"]);
  buttons[0]!.onClick();
  expect(unreachable.query.fetchNextPage).toHaveBeenCalledTimes(2);
  expect(unreachable.query.refetch).not.toHaveBeenCalled();
  expect(unreachable.session.history.refresh).not.toHaveBeenCalled();
  expect(unreachable.session.history.tail.refetch).not.toHaveBeenCalled();
  buttons.length = 0;
  ladder.length = 0;
  const refused = failedContinuation(
    new Error("Transcript page did not advance"),
  );
  expect(refused.html).toContain("Part of the saved conversation is shown.");
  expect(refused.html).not.toContain(controlReconnectingMessage);
  expect(ladder.map((entry) => entry.state)).toEqual(["ok"]);
  expect(buttons.map((button) => button.children)).toEqual([
    "Load more saved turns",
  ]);
  buttons[0]!.onClick();
  expect(refused.query.fetchNextPage).toHaveBeenCalledOnce();
  expect(refused.session.history.refresh).not.toHaveBeenCalled();
});

it("a reopened run the saved read already reports finished does not re-read and hide the saved pages", async () => {
  const reads = serve();
  const client = new QueryClient();
  const { observer, unsubscribe } = observe(client);
  try {
    await vi.waitFor(() => expect(settled(observer)).toBe(true));
    const result = observer.getCurrentResult();
    const { saved } = savedHistory(result, true, account, clientId);
    const view = sessionHistoryState(
      { saved, current: transcript(102, 100) as never },
      thirdBinding.runId,
      [],
      undefined,
      false,
    );
    const reopened = view.savedCurrent!;
    expect(reopened.runState).toBe("completed");
    // The live replay of that same finished run asks for no second read.
    expect(settledRefreshDue(reopened, reopened)).toBe(false);
    expect(reads).toEqual([0, 100]);
    // A re-read would hide every admitted page until all of them are read again.
    expect(
      savedHistory({ ...result, isRefetching: true }, true, account, clientId)
        .saved,
    ).toBeUndefined();
    // A run this view watched finish, or one the saved read has not reached, is read again.
    expect(
      settledRefreshDue(reopened, { ...reopened, runState: "running" }),
    ).toBe(true);
    expect(settledRefreshDue(reopened, undefined)).toBe(true);
    expect(
      settledRefreshDue(reopened, { ...reopened, runId: binding.runId }),
    ).toBe(true);
    expect(
      settledRefreshDue({ ...reopened, runState: "running" }, undefined),
    ).toBe(false);
  } finally {
    unsubscribe();
    client.clear();
  }
});

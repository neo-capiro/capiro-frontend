import { createElement, type ComponentProps, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { EDGE_REFUSED } from "@capiro/meri-client/conversation";
import { ConversationUnavailable } from "@capiro/meri-client/conversation";
import { ConversationHistoryUnavailable } from "../src/shared/meri-conversations/history-client";
import {
  controlFailure,
  controlUnreachableMessage,
  inputRefusedMessage,
  transientStatus,
} from "../src/features/meri/conversation/control-reachability";
import { sessionHistoryState } from "../src/features/meri/conversation/saved-turns";
import {
  ACCESS_RECHECK_COOLDOWN_MS,
  ACCESS_RECHECK_MS,
  createAccessRecheck,
} from "../src/features/meri/conversation/access-recheck";
import {
  ConnectionPending,
  pendingConversationComposer,
} from "../src/features/meri/conversation/ConnectionPending";

const buttons = vi.hoisted(
  () => [] as Array<{ onClick: () => void; children: ReactNode }>,
);
vi.mock("@capiro/ui/button", () => ({
  Button: (props: { onClick: () => void; children: ReactNode }) => {
    buttons.push(props);
    return createElement("button", { onClick: props.onClick }, props.children);
  },
}));
vi.mock("../src/features/meri/conversation/ConversationFrame", () => ({
  ConversationBody: (props: { status: ReactNode; current: ReactNode }) =>
    createElement("main", null, props.current, props.status),
}));
beforeEach(() => {
  buttons.length = 0;
});
afterEach(() => {
  vi.useRealTimers();
});

/** Static markup escapes the notice's apostrophe. */
const text = (html: string) => html.replace(/&#x27;/g, "'");
const hardLock =
  "Your last message may still be in progress. Check again before sending.";
const history = (status: number, code: string, outcome?: string) =>
  new ConversationHistoryUnavailable(status, code, outcome);

it("classifies control not answering, and the edge refusing, apart from every real refusal", () => {
  for (const status of [500, 502, 503, 504, 408, 429])
    expect(controlFailure(history(status, "CONVERSATION_UNAVAILABLE"))).toBe(
      "unreachable",
    );
  expect(controlFailure(history(502, "CONVERSATION_RESPONSE_INVALID"))).toBe(
    "unreachable",
  );
  // The shared edge answers 403 before control sees the request: refused, not revoked.
  expect(controlFailure(history(403, "CONVERSATION_ACCESS_DENIED"))).toBe(
    "refused",
  );
  expect(controlFailure(new ConversationUnavailable(EDGE_REFUSED))).toBe(
    "refused",
  );
  expect(controlFailure(new TypeError("Failed to fetch"))).toBe("unreachable");
  expect(controlFailure(new DOMException("deadline", "AbortError"))).toBe(
    "unreachable",
  );
  expect(controlFailure(new DOMException("deadline", "TimeoutError"))).toBe(
    "unreachable",
  );
  for (const cause of [
    history(401, "CONVERSATION_ACCESS_DENIED"),
    history(409, "CONVERSATION_TURN_CONFLICT", "NOT_DISPATCHED"),
    history(409, "MEMBERSHIP_CHANGED"),
    history(404, "NOT_FOUND"),
    new ConversationUnavailable("CONVERSATION_UNAVAILABLE"),
    new ConversationUnavailable("retained-submit-mismatch"),
    new Error("unavailable"),
    undefined,
  ])
    expect(controlFailure(cause)).toBeUndefined();
  expect(transientStatus(undefined)).toBe(false);
  expect(transientStatus(403)).toBe(false);
  expect(transientStatus(502)).toBe(true);
});

const source = {
  tenantId: "synthetic-tenant",
  actorId: "synthetic-user",
  conversationId: "20000000-0000-4000-8000-000000000001",
  runId: "30000000-0000-4000-8000-000000000001",
};
const retained = {
  source,
  requestId: "60000000-0000-4000-8000-000000000001",
  prompt: "Second question",
  state: "unknown" as const,
};
type Page = NonNullable<Parameters<typeof sessionHistoryState>[0]["current"]>;
/** Control's own report of a reservation this tab did not make. */
const reservedElsewhere = {
  turns: [],
  events: [],
  latestRun: { binding: source, state: "completed" },
  pendingTurn: {
    sourceBinding: { ...source, runId: "30000000-0000-4000-8000-00000000000f" },
    targetBinding: { ...source, runId: "30000000-0000-4000-8000-0000000000ff" },
    state: "RESERVED",
  },
} as unknown as Page;

it("an unanswered next-message check keeps the retained message behind a plain retry line, not the hard lock", () => {
  const unanswered = sessionHistoryState(
    {},
    source.runId,
    [],
    retained,
    false,
    "unreachable",
  );
  expect(unanswered.recoveryNeeded).toBe(true);
  expect(unanswered.unknownReservation).toBe(false);
  expect(unanswered.nextBlocked).toBe(controlUnreachableMessage);
  expect(
    sessionHistoryState({}, source.runId, [], retained, false, "refused")
      .nextBlocked,
  ).toBe(inputRefusedMessage);
  // Without a classified failure (a reload, an unknown error) the retained request still locks.
  expect(
    sessionHistoryState({}, source.runId, [], retained, false).nextBlocked,
  ).toBe(hardLock);
  // Busy recovery and control's own reservation report both outrank the plain line.
  expect(
    sessionHistoryState({}, source.runId, [], retained, true, "unreachable")
      .nextBlocked,
  ).toBe("Checking your last message…");
  const reported = sessionHistoryState(
    { current: reservedElsewhere },
    source.runId,
    [],
    retained,
    false,
    "unreachable",
  );
  expect(reported.unknownReservation).toBe(true);
  expect(reported.nextBlocked).toBe(hardLock);
});

type Session = ComponentProps<typeof ConnectionPending>["session"];
function pendingSession(unreachable: boolean): Session {
  return {
    accessLost: false,
    selectedId: source.conversationId,
    storageError: undefined,
    latestTarget: undefined,
    earlier: [],
    continuation: { intent: undefined },
    connection: {
      state: { status: "unavailable" },
      unreachable,
      pending: undefined,
      retry: vi.fn(),
      reopen: vi.fn(),
    },
    history: { refresh: vi.fn() },
  } as unknown as Session;
}
const renderPending = (session: Session) =>
  renderToStaticMarkup(createElement(ConnectionPending, { session }));

it("a connection that control did not answer is one plain retry line in the composer and the status, never a verification refusal", () => {
  const session = pendingSession(true);
  const composer = pendingConversationComposer(session, "Client");
  expect(composer.sendBlocked).toBe(controlUnreachableMessage);
  expect(composer.draftBlocked).toBeUndefined();
  const html = renderPending(session);
  expect(html).toContain("Capiro is not reachable right now.");
  expect(text(html)).toContain("we'll reconnect automatically.");
  expect(html).not.toContain("Conversation connection unavailable");
  expect(html).not.toContain("could not verify");
  expect(buttons).toHaveLength(1);
  expect(buttons[0]!.children).toBe("Retry");
  buttons[0]!.onClick();
  expect(session.connection.retry).toHaveBeenCalledExactlyOnceWith();
  expect(session.history.refresh).toHaveBeenCalledExactlyOnceWith();
  expect(session.connection.reopen).not.toHaveBeenCalled();
  // A refusal that control did answer keeps its own wording.
  const refused = pendingSession(false);
  expect(pendingConversationComposer(refused, "Client").sendBlocked).toBe(
    "Reconnect to Meri before sending.",
  );
  expect(renderPending(refused)).toContain(
    "Conversation connection unavailable",
  );
});

it("access loss rechecks itself exactly once per episode and then waits for the person", () => {
  vi.useFakeTimers();
  const run = vi.fn();
  const recheck = createAccessRecheck();
  const pending: boolean[] = [];
  recheck.subscribe(() => pending.push(recheck.pending()));
  expect(recheck.pending()).toBe(false);
  recheck.observe(true, run);
  expect(recheck.pending()).toBe(true);
  vi.advanceTimersByTime(ACCESS_RECHECK_MS - 1);
  expect(run).not.toHaveBeenCalled();
  // Re-observing the same episode, even with a newer action, neither reschedules nor fires twice.
  const newer = vi.fn();
  recheck.observe(true, newer);
  vi.advanceTimersByTime(1);
  expect(run).not.toHaveBeenCalled();
  expect(newer).toHaveBeenCalledOnce();
  expect(recheck.pending()).toBe(false);
  recheck.observe(true, newer);
  expect(newer).toHaveBeenCalledOnce();
  expect(recheck.pending()).toBe(false);
  // The recheck reissues a session: access looks regained for a moment, then the same refusal
  // returns. Inside the cooldown that flapping schedules nothing; the person's button remains.
  recheck.observe(false, newer);
  recheck.observe(true, newer);
  expect(recheck.pending()).toBe(false);
  vi.advanceTimersByTime(ACCESS_RECHECK_COOLDOWN_MS);
  expect(newer).toHaveBeenCalledOnce();
  // After the cooldown a new loss gets its own single automatic recheck.
  recheck.observe(false, newer);
  recheck.observe(true, newer);
  expect(recheck.pending()).toBe(true);
  vi.advanceTimersByTime(ACCESS_RECHECK_MS);
  expect(newer).toHaveBeenCalledTimes(2);
  expect(pending).toEqual([true, false, true, false]);
  // Leaving the screen cancels a scheduled recheck without firing it.
  vi.advanceTimersByTime(ACCESS_RECHECK_COOLDOWN_MS);
  recheck.observe(false, newer);
  recheck.observe(true, newer);
  expect(recheck.pending()).toBe(true);
  recheck.dispose();
  vi.advanceTimersByTime(60_000);
  expect(newer).toHaveBeenCalledTimes(2);
  expect(vi.getTimerCount()).toBe(0);
});

import { RunStatus } from "../src/features/meri/conversation/RunStatus";
import { ConversationHistoryStatus } from "../src/features/meri/conversation/ConversationHistoryStatus";
import { ConversationIntents } from "../src/features/meri/conversation/intents/ConversationIntents";
import { controlReconnectingMessage } from "../src/features/meri/conversation/control-reachability";
import {
  RECONNECT_BASE_MS,
  RECONNECT_MAX_MS,
  createReconnectSchedule,
  reconnectDelayMs,
} from "../src/shared/meri-conversations/reconnect-schedule";

const intentsState = vi.hoisted(() => ({
  list: { status: "unavailable" } as { status: string },
}));
vi.mock(
  "../src/features/meri/conversation/intents/useConversationIntents",
  () => ({
    useConversationIntents: () => ({
      oneTimeResults: [],
      dismissOneTime: vi.fn(),
      list: intentsState.list,
      rows: [],
      attempts: {},
      refresh: vi.fn(),
      retry: vi.fn(),
      loadMore: vi.fn(),
      decide: vi.fn(),
      decisionsReady: true,
      recoveryError: undefined,
    }),
  }),
);

it("a read that control did not answer is one plain notice with one Retry: no codes, no run-status chrome, no transcript error", () => {
  type Run = ComponentProps<typeof RunStatus>["run"];
  const run = {
    snapshot: { status: "ready", observation: null, cancelReceipt: null },
    intent: {},
    busy: false,
    error: "CONVERSATION_UNAVAILABLE",
    failure: "unreachable",
    transcript: "unavailable",
    observing: "idle",
    history: vi.fn(async () => true),
    submit: vi.fn(async () => true),
    refreshRunStatus: vi.fn(),
  } as unknown as Run;
  const html = renderToStaticMarkup(
    createElement(RunStatus, { run, active: false }),
  );
  expect(text(html)).toContain(controlReconnectingMessage);
  expect(html).not.toContain("CONVERSATION_UNAVAILABLE");
  expect(html).not.toContain("could not finish this message");
  expect(html).not.toContain("The current transcript could not be loaded.");
  expect(html).not.toContain("Refresh run status");
  expect(html).not.toContain("Loading this conversation");
  expect(buttons.map((button) => button.children)).toEqual(["Retry"]);
  buttons[0]!.onClick();
  expect(run.history).toHaveBeenCalledOnce();
  expect(run.submit).not.toHaveBeenCalled();
  // An unconfirmed request keeps its own exact retry behind the same single button.
  buttons.length = 0;
  const uncertain = {
    ...run,
    intent: {
      submit: { requestId: "r", prompt: "Unconfirmed", state: "unknown" },
    },
  } as unknown as Run;
  const retained = renderToStaticMarkup(
    createElement(RunStatus, { run: uncertain, active: false }),
  );
  expect(text(retained)).toContain(controlReconnectingMessage);
  expect(buttons.map((button) => button.children)).toEqual([
    "Retry same request",
  ]);
  buttons[0]!.onClick();
  expect(uncertain.submit).toHaveBeenCalledExactlyOnceWith("Unconfirmed", true);
  expect(uncertain.history).toHaveBeenCalledOnce();
  // A refusal control did answer keeps its closed code for support.
  buttons.length = 0;
  const refused = {
    ...run,
    failure: undefined,
    error: "retained-submit-mismatch",
    transcript: "loaded",
  } as unknown as Run;
  const generic = renderToStaticMarkup(
    createElement(RunStatus, { run: refused, active: false }),
  );
  expect(generic).toContain("Capiro could not finish this message.");
  expect(generic).not.toContain("retained-submit-mismatch");
});

type HistorySession = ComponentProps<
  typeof ConversationHistoryStatus
>["session"];
function historySession(
  query: Record<string, unknown>,
  unavailable: boolean,
): HistorySession {
  return {
    history: {
      selected: true,
      unavailable,
      empty: false,
      query: {
        isPending: false,
        isRefetching: false,
        isFetching: false,
        hasNextPage: false,
        ...query,
      },
      tail: {},
      refresh: vi.fn(),
    },
    continuation: { intent: undefined, failed: false, notReady: false },
    recoveryNeeded: false,
    unknownReservation: false,
    readReservation: vi.fn(),
  } as unknown as HistorySession;
}
const renderHistory = (session: HistorySession) =>
  renderToStaticMarkup(createElement(ConversationHistoryStatus, { session }));

it("saved history that control did not answer is one notice that re-reads itself; a re-read never flickers the loading banner", () => {
  const session = historySession(
    {
      error: history(503, "CONVERSATION_UNAVAILABLE"),
      isRefetching: true,
      isFetching: true,
    },
    true,
  );
  const html = renderHistory(session);
  expect(text(html)).toContain(controlReconnectingMessage);
  expect(html).not.toContain("Loading saved conversation history.");
  expect(html).not.toContain("Saved conversation history unavailable");
  expect(buttons.map((button) => button.children)).toEqual(["Retry"]);
  buttons[0]!.onClick();
  expect(session.history.refresh).toHaveBeenCalledOnce();
  // A refusal control did answer keeps the existing wording and reload control.
  buttons.length = 0;
  const refused = renderHistory(
    historySession({ error: history(409, "MEMBERSHIP_CHANGED") }, true),
  );
  expect(refused).toContain("Saved conversation history unavailable");
  expect(refused).not.toContain(controlReconnectingMessage);
  expect(buttons.map((button) => button.children)).toEqual([
    "Reload saved history",
  ]);
  // A healthy history re-reading in the background announces nothing.
  buttons.length = 0;
  const steady = renderHistory(
    historySession({ isRefetching: true, isFetching: true }, false),
  );
  expect(steady).not.toContain("Loading saved conversation history.");
  expect(steady).not.toContain(controlReconnectingMessage);
  expect(
    renderHistory(historySession({ isPending: true, isFetching: true }, false)),
  ).toContain("Loading saved conversation history.");
});

it("the approvals panel exists only when it has something loaded", () => {
  const render = () =>
    renderToStaticMarkup(
      createElement(ConversationIntents, {
        access: {} as never,
        scope: {
          tenantId: "synthetic-tenant",
          actorId: "synthetic-user",
          conversationId: source.conversationId,
        } as never,
      }),
    );
  intentsState.list = { status: "unavailable" };
  expect(render()).toBe("");
  intentsState.list = { status: "loading" };
  expect(render()).toBe("");
});

it("automatic re-reads back off from 2 s to a 30 s ceiling, pause while one is in flight, and start over on success or an explicit retry", () => {
  vi.useFakeTimers();
  expect(
    [0, 1, 2, 3, 4, 5, 6].map((attempt) => reconnectDelayMs(attempt)),
  ).toEqual([2_000, 4_000, 8_000, 16_000, 30_000, 30_000, 30_000]);
  expect(RECONNECT_BASE_MS).toBe(2_000);
  expect(RECONNECT_MAX_MS).toBe(30_000);
  const run = vi.fn();
  const schedule = createReconnectSchedule();
  const fired: number[] = [];
  const failing = () => schedule.observe("failing", run);
  const fire = () => {
    const before = run.mock.calls.length;
    let waited = 0;
    while (run.mock.calls.length === before) {
      vi.advanceTimersByTime(1_000);
      waited += 1_000;
      if (waited > 60_000) throw new Error("no attempt fired");
    }
    fired.push(waited);
  };
  for (let attempt = 0; attempt < 6; attempt++) {
    failing();
    failing(); // a second failing observation while scheduled changes nothing
    expect(schedule.pending()).toBe(true);
    fire();
    schedule.observe("busy", run); // the attempt is in flight: nothing new is scheduled
    expect(schedule.pending()).toBe(false);
  }
  expect(fired).toEqual([2_000, 4_000, 8_000, 16_000, 30_000, 30_000]);
  expect(run).toHaveBeenCalledTimes(6);
  // Success ends the episode and the next failure starts at 2 s again.
  schedule.observe("ok", run);
  expect(schedule.attempts()).toBe(0);
  failing();
  fire();
  expect(fired.at(-1)).toBe(2_000);
  // An explicit Retry resets the ladder without running anything itself.
  failing();
  schedule.reset();
  expect(schedule.pending()).toBe(false);
  expect(run).toHaveBeenCalledTimes(7);
  failing();
  fire();
  expect(fired.at(-1)).toBe(2_000);
  schedule.dispose();
  expect(vi.getTimerCount()).toBe(0);
});

import { composerAvailability } from "../src/features/meri/conversation/MeriLiveConversation";
import { turnFromEvents } from "../src/features/meri/conversation/conversation-view";
import { approvalsReadState } from "../src/features/meri/conversation/intents/ConversationIntents";

it("a reservation that control itself reports still blocks sending, even after an unanswered check", () => {
  const reported = sessionHistoryState(
    { current: reservedElsewhere },
    source.runId,
    [],
    retained,
    false,
    "unreachable",
  );
  const finished = turnFromEvents(
    [],
    source,
    "First question",
    "completed",
    false,
  );
  const availability = composerAvailability(
    {
      intent: {},
      busy: false,
      failure: undefined,
      refusal: undefined,
      snapshot: { status: "ready", observation: null },
    } as never,
    finished,
    [finished],
    undefined,
    undefined,
    undefined,
    reported.nextBlocked,
    !!reported.source && !reported.nextBlocked,
    false,
  );
  expect(availability.sendBlocked).toBe(hardLock);
  expect(availability.readyForNext).toBe(false);
});

it("a failed first approvals read is re-read on the backed-off schedule; a lost membership is not", () => {
  expect(approvalsReadState({ status: "unavailable" })).toBe("failing");
  expect(approvalsReadState({ status: "unavailable", accessLost: true })).toBe(
    "ok",
  );
  expect(approvalsReadState({ status: "loading" })).toBe("busy");
  expect(
    approvalsReadState({
      status: "ready",
      items: [],
      next: null,
      loadingMore: false,
    }),
  ).toBe("ok");
  expect(approvalsReadState({ status: "disabled" })).toBe("ok");
});

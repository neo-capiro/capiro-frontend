import { afterEach, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import {
  createOpeningCapture,
  type OpeningProjection,
} from "../src/shared/meri-conversations/opening-capture";
import { ConversationHostController } from "../src/shared/meri-conversations/host-controller";
import { savedTranscriptQuery } from "../src/shared/meri-conversations/history-queries";
import type { ConversationTranscriptPage } from "../src/shared/meri-conversations/history-client";
import {
  binding,
  clientId,
  nextBinding,
  runFor,
  contextFor,
} from "../test/browser/meri-conversation-fixtures";
import {
  conversation,
  requestId,
  turn,
  initialEvents,
} from "../test/browser/meri-history-fixtures";

const flag = "?meriOpeningCapture=1&meriCaptureCase=qa_synthetic01";
const hints = { clientId, conversationId: binding.conversationId };
const account = { tenantId: binding.tenantId, actorId: binding.actorId };
const receipt = () => ({
  credential: `action_session_${"s".repeat(43)}`,
  expiresAtMs: Date.now() + 60_000,
  context: contextFor(),
});
const page = (): ConversationTranscriptPage => ({
  schema: "meri.conversation-transcript/1",
  conversation,
  latestRun: runFor("completed", binding),
  latestSequenceBase: 0,
  turns: [turn(binding, requestId, "Private answer prompt", 0, 2)],
  events: initialEvents,
  nextSequence: 2,
  lastSequence: 2,
  hasMore: false,
  pendingTurn: {
    sourceBinding: binding,
    targetBinding: nextBinding,
    state: "RESERVED",
  },
});
const projection = (current = page()): OpeningProjection => ({
  hints,
  current,
  savedTurns: current.turns,
  query: { dataUpdatedAt: 100, isFetching: false, isPending: false },
  tail: { dataUpdatedAt: 101, isFetching: false, isPending: false },
  runId: binding.runId,
  unknownReservation: true,
  shown: [
    {
      runId: binding.runId,
      runState: "completed",
      throughSequence: 2,
      hasMessages: true,
    },
  ],
});
function fixture() {
  const lines: string[] = [],
    abort = new AbortController();
  const capture = createOpeningCapture(flag, {
    write: (line) => lines.push(line),
  })!;
  capture.start(hints, abort.signal);
  return {
    capture,
    lines,
    abort,
    records: () => lines.map((line) => JSON.parse(line)),
  };
}
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it("is absent without one exact opt-in and bounded nonsecret nonce", () => {
  const write = vi.fn();
  for (const search of [
    "",
    "?meriOpeningCapture=1",
    flag + "&meriOpeningCapture=1",
    flag + "&meriCaptureCase=qa_second01",
    flag.replace("=1", "=true"),
    flag.replace("qa_synthetic01", "secret-or-customer-id"),
    "?" + "a".repeat(4097),
  ])
    expect(createOpeningCapture(search, { write })).toBeUndefined();
  expect(write).not.toHaveBeenCalled();
});

it("joins opening, receipt, natural history and the same projection with aliases only", () => {
  const f = fixture(),
    current = page();
  f.capture.admitted(receipt());
  f.capture.history(current);
  f.capture.projection({
    ...projection(current),
    intent: {
      source: binding,
      requestId,
      prompt: "Private intent text",
      state: "unknown",
      receipt: {
        schema: "meri.conversation-turn/1",
        sourceBinding: binding,
        targetBinding: nextBinding,
        state: "RESERVED",
        replayed: false,
      },
    },
  });
  f.abort.abort();
  const [opening, admitted, received, projected] = f.records();
  expect(projected.kind).toBe("projection");
  expect(opening.data.hints.run).toBeNull();
  expect(admitted.data.binding.conversation).toBe(
    opening.data.hints.conversation,
  );
  expect(projected.data.run).toBe(admitted.data.binding.run);
  expect(projected.data.current.pending.source.run).toBe(projected.data.run);
  expect(projected.data.intent.request).toBe(projected.data.saved[0].request);
  expect(projected.data.shown[0].run).toBe(projected.data.saved[0].binding.run);
  expect(projected.data.currentReceivedSequence).toBe(received.sequence);
  expect(projected.data.currentProvenance).toBe("received-this-capture");
  expect(projected.data.unknownReservation).toBe(true);
  const encoded = f.lines.join("\n");
  for (const secret of [
    binding.tenantId,
    binding.actorId,
    binding.conversationId,
    binding.runId,
    nextBinding.runId,
    requestId,
    clientId,
    receipt().credential,
    "Private answer prompt",
    "Private intent text",
  ])
    expect(encoded).not.toContain(secret);
  expect(Object.keys(admitted.data).sort()).toEqual([
    "binding",
    "reboundSource",
    "reboundTarget",
    "requestField",
  ]);
});

it("labels unobserved cache identity honestly and deduplicates unchanged projections", () => {
  const f = fixture(),
    value = projection();
  f.capture.projection(value);
  f.capture.projection(value);
  const records = f.records().filter((record) => record.kind === "projection");
  expect(records).toHaveLength(1);
  expect(records[0].data.currentProvenance).toBe("cache-or-unobserved");
  expect(records[0].data.currentReceivedSequence).toBeNull();
  f.abort.abort();
});

it("bounds records and aliases, stops on disposal and never starts a second lifetime", () => {
  const f = fixture();
  for (let i = 0; i < 60; i++) f.capture.history(page());
  expect(f.lines).toHaveLength(32);
  expect(f.records().at(-1)).toMatchObject({
    kind: "stopped",
    reason: "record-limit",
    incomplete: true,
  });
  f.capture.start(hints, new AbortController().signal);
  f.capture.projection(projection());
  expect(f.lines).toHaveLength(32);
  for (const line of f.lines)
    expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(4096);
  expect(
    f.lines.reduce(
      (sum, line) => sum + new TextEncoder().encode(line).length,
      0,
    ),
  ).toBeLessThanOrEqual(65536);
  const other = fixture();
  other.abort.abort();
  const count = other.lines.length;
  other.capture.history(page());
  other.capture.admitted(receipt());
  expect(other.lines).toHaveLength(count);
});

it("expires at120 seconds without waiting for another product event", () => {
  vi.useFakeTimers();
  const f = fixture();
  vi.advanceTimersByTime(120_000);
  expect(f.records().at(-1)).toMatchObject({ reason: "deadline" });
  const count = f.lines.length;
  f.capture.history(page());
  expect(f.lines).toHaveLength(count);
  expect(vi.getTimerCount()).toBe(0);
});

it("stops at the aggregate byte budget with explicit loss and bounds every record", () => {
  const f = fixture(),
    value = projection();
  const turns = Array.from({ length: 4 }, (_, index) =>
    turn(
      { ...binding, runId: `synthetic-run-${index}` },
      `synthetic-request-${index}`,
      "private",
      index * 2,
      2,
    ),
  );
  value.current = { ...value.current!, turns };
  value.savedTurns = turns;
  value.shown = turns.map((item) => ({
    runId: item.run.binding.runId,
    runState: "completed",
    hasMessages: true,
  }));
  for (let i = 0; i < 50; i++)
    f.capture.projection({
      ...value,
      query: { ...value.query, dataUpdatedAt: i },
    });
  expect(f.records().at(-1)).toMatchObject({
    reason: "byte-limit",
    incomplete: true,
  });
  expect(f.lines.length).toBeLessThanOrEqual(32);
  const sizes = f.lines.map((line) => new TextEncoder().encode(line).length);
  expect(Math.max(...sizes)).toBeLessThanOrEqual(4096);
  expect(sizes.reduce((sum, size) => sum + size, 0)).toBeLessThanOrEqual(65536);
});

it("bounds distinct alias retention independently of record count", () => {
  const f = fixture();
  for (let i = 0; i < 30; i++) {
    const current = page();
    const turns: ConversationTranscriptPage["turns"] = Array.from(
      { length: 4 },
      (_, index) => {
        const key = `${i}-${index}`;
        return {
          ...turn(
            { ...binding, runId: `run-${key}` },
            `request-${key}`,
            "private",
            0,
            2,
          ),
          promptLineage: {
            kind: "submission",
            logicalRequestId: `logical-${key}`,
            sourceBinding: null,
            sourceRequestId: null,
          },
        };
      },
    );
    f.capture.history({ ...current, turns });
  }
  expect(f.records().at(-1)).toMatchObject({
    reason: "alias-limit",
    incomplete: true,
  });
  expect(f.lines.length).toBeLessThan(32);
});

it("sink and projection errors remain neutral and do not expose arbitrary fields", () => {
  const write = vi.fn(() => {
    throw Error("sink unavailable");
  });
  const capture = createOpeningCapture(flag, { write })!;
  expect(() =>
    capture.start(hints, new AbortController().signal),
  ).not.toThrow();
  expect(() => capture.projection(projection())).not.toThrow();
  const f = fixture(),
    value = page();
  Object.defineProperty(value, "latestRun", {
    get() {
      throw Error("private payload");
    },
  });
  expect(() => f.capture.history(value)).not.toThrow();
  expect(f.records().at(-1)).toMatchObject({ reason: "observer-error" });
  expect(f.lines.join("")).not.toContain("private payload");
});

it("preserves the real host request count, receipt and disposal when capture is off, on or broken", async () => {
  for (const mode of ["off", "on", "broken"]) {
    const calls: unknown[] = [],
      lines: string[] = [];
    const capture = createOpeningCapture(mode === "off" ? "" : flag, {
      write: (line) => {
        if (mode === "broken") throw Error();
        lines.push(line);
      },
    });
    const host = new ConversationHostController({
      hints,
      account,
      openingCapture: capture,
      fetcher: async (url, init) => {
        calls.push([url, JSON.parse(String(init?.body))]);
        return Response.json(receipt());
      },
    });
    const detach = host.attach();
    try {
      await host.connect();
      expect(host.getSnapshot().status).toBe("ready");
      expect(calls).toEqual([["/api/action-followthrough/session", hints]]);
    } finally {
      detach();
    }
    if (mode === "on")
      expect(lines.map((line) => JSON.parse(line).kind)).toEqual([
        "opening",
        "admitted",
        "stopped",
      ]);
    else expect(lines).toEqual([]);
  }
});

it("observes the existing transcript query after admission without an additional fetch", async () => {
  const f = fixture(),
    fetcher = vi.fn(async () => Response.json(page()));
  vi.stubGlobal("fetch", fetcher);
  const cache = new QueryClient();
  try {
    const result = await cache.fetchInfiniteQuery(
      savedTranscriptQuery(
        account,
        clientId,
        binding.conversationId,
        true,
        undefined,
        f.capture,
      ),
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result.pages).toHaveLength(1);
    expect(
      f.records().some((record) => record.kind === "history-received"),
    ).toBe(true);
  } finally {
    cache.clear();
    f.abort.abort();
  }
});

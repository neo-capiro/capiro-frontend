import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as historyClient from "../src/shared/meri-conversations/history-client";
import { useConversationTurn } from "../src/features/meri/conversation/useConversationTurn";
import {
  conversationTurnJournal,
  conversationTurnNotReady,
  recoverConversationTurn,
} from "../src/shared/meri-conversations/turn-journal";

const account = { tenantId: "synthetic-tenant", actorId: "synthetic-user" };
const clientId = "10000000-0000-4000-8000-000000000001";
const source = {
  ...account,
  conversationId: "20000000-0000-4000-8000-000000000001",
  runId: "30000000-0000-4000-8000-000000000001",
  attemptId: "40000000-0000-4000-8000-000000000001",
  workerId: "50000000-0000-4000-8000-000000000001",
  writerFence: 1,
};
const target = { ...source, runId: "30000000-0000-4000-8000-000000000002" };
const receipt = {
  schema: "meri.conversation-turn/1" as const,
  sourceBinding: source,
  targetBinding: target,
  state: "RESERVED" as const,
  replayed: false,
};
const settling = () =>
  new historyClient.ConversationHistoryUnavailable(
    409,
    "CONVERSATION_TURN_CONFLICT",
    "NOT_DISPATCHED",
  );
const request = {
  prompt: "Second question",
  requestId: "60000000-0000-4000-8000-000000000001",
};
function setup(cache = new QueryClient()) {
  const journal = conversationTurnJournal(
    cache,
    account,
    clientId,
    source.conversationId,
  );
  journal.start(source, request.prompt, request.requestId);
  return journal;
}
function command(cache: QueryClient, open = vi.fn()) {
  let turn!: ReturnType<typeof useConversationTurn>;
  function Probe() {
    turn = useConversationTurn(account, clientId, source.conversationId, open);
    return null;
  }
  renderToStaticMarkup(
    createElement(QueryClientProvider, { client: cache }, createElement(Probe)),
  );
  return { turn, open };
}
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

it("one explicit reservation stops at a cleanup refusal without timer-driven resends", async () => {
  vi.useFakeTimers();
  const journal = setup(),
    refused = settling();
  const reserve = vi.fn(async () => {
    throw refused;
  });
  await expect(recoverConversationTurn(journal, reserve)).rejects.toBe(refused);
  expect(reserve).toHaveBeenCalledOnce();
  expect(journal.read()).toEqual({ ...request, source, state: "unknown" });
  await vi.advanceTimersByTimeAsync(600_000);
  expect(reserve).toHaveBeenCalledOnce();
  expect(vi.getTimerCount()).toBe(0);
});

it("the command handles not-ready without failure and only an explicit retry reuses its immutable identity", async () => {
  vi.useFakeTimers();
  const cache = new QueryClient(),
    { turn, open } = command(cache);
  const reserve = vi
    .spyOn(historyClient, "reserveConversationTurn")
    .mockRejectedValueOnce(settling())
    .mockResolvedValue(receipt);
  expect(await turn.start(source, request.prompt)).toBe(true);
  const journal = conversationTurnJournal(
    cache,
    account,
    clientId,
    source.conversationId,
  );
  const captured = journal.read()!;
  expect(captured).toMatchObject({
    source,
    prompt: request.prompt,
    state: "unknown",
  });
  expect(open).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(600_000);
  expect(reserve).toHaveBeenCalledOnce();
  expect(await turn.retry()).toBe(true);
  expect(reserve).toHaveBeenCalledTimes(2);
  expect(reserve.mock.calls.map(([input]) => input)).toEqual(
    Array(2).fill({
      conversationId: source.conversationId,
      sourceRunId: source.runId,
    }),
  );
  expect(open).toHaveBeenCalledExactlyOnceWith({
    conversationId: source.conversationId,
    runId: target.runId,
    requestId: captured.requestId,
    pending: captured.prompt,
  });
  expect(journal.read()).toMatchObject({ ...captured, state: "ready" });
});

it("only the exact definite cleanup refusal is not-ready while uncertain errors remain command failures", async () => {
  expect(conversationTurnNotReady(settling())).toBe(true);
  for (const error of [
    new historyClient.ConversationHistoryUnavailable(
      502,
      "CONVERSATION_UNAVAILABLE",
      "UNKNOWN",
    ),
    new historyClient.ConversationHistoryUnavailable(
      409,
      "CONVERSATION_TURN_CONFLICT",
    ),
    new historyClient.ConversationHistoryUnavailable(
      409,
      "CONVERSATION_TURN_CONFLICT",
      "UNKNOWN",
    ),
    new historyClient.ConversationHistoryUnavailable(
      409,
      "MEMBERSHIP_CHANGED",
      "NOT_DISPATCHED",
    ),
    new historyClient.ConversationHistoryUnavailable(
      502,
      "CONVERSATION_TURN_CONFLICT",
      "NOT_DISPATCHED",
    ),
    new Error("unavailable"),
  ]) {
    expect(conversationTurnNotReady(error)).toBe(false);
    const cache = new QueryClient(),
      journal = setup(cache),
      { turn, open } = command(cache);
    const reserve = vi
      .spyOn(historyClient, "reserveConversationTurn")
      .mockRejectedValue(error);
    expect(await turn.retry()).toBe(false);
    expect(reserve).toHaveBeenCalledOnce();
    expect(journal.read()).toEqual({ ...request, source, state: "unknown" });
    expect(open).not.toHaveBeenCalled();
    reserve.mockRestore();
  }
});

it("aborted reservations never dispatch or adopt a late target and retain the original request", async () => {
  const before = new AbortController(),
    first = setup(),
    unused = vi.fn(async () => receipt);
  before.abort(new Error("scope left"));
  await expect(
    recoverConversationTurn(first, unused, before.signal),
  ).rejects.toThrow("scope left");
  expect(unused).not.toHaveBeenCalled();
  expect(first.read()).toEqual({ ...request, source, state: "unknown" });
  const during = new AbortController(),
    second = setup();
  const late = vi.fn(async () => {
    during.abort(new Error("scope left"));
    return receipt;
  });
  await expect(
    recoverConversationTurn(second, late, during.signal),
  ).rejects.toThrow("scope left");
  expect(late).toHaveBeenCalledOnce();
  expect(second.read()).toEqual({ ...request, source, state: "unknown" });
});

it("a mapping-only refusal stays a recovery failure without claiming a saved message", async () => {
  const cache = new QueryClient(),
    { turn, open } = command(cache);
  const reserve = vi
    .spyOn(historyClient, "reserveConversationTurn")
    .mockRejectedValue(settling());
  expect(await turn.readMapping(source)).toBe(false);
  expect(reserve).toHaveBeenCalledExactlyOnceWith(
    { conversationId: source.conversationId, sourceRunId: source.runId },
    expect.any(AbortSignal),
  );
  expect(
    conversationTurnJournal(
      cache,
      account,
      clientId,
      source.conversationId,
    ).read(),
  ).toBeUndefined();
  expect(open).not.toHaveBeenCalled();
});

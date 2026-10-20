import { afterEach, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { ConversationHistoryUnavailable } from "../src/shared/meri-conversations/history-client";
import {
  conversationTurnJournal,
  reserveTurnWhenSettled,
  TURN_SETTLE_RETRY_MS,
  TURN_SETTLE_WAIT_MS,
} from "../src/shared/meri-conversations/turn-journal";

const account = { tenantId: "synthetic-tenant", actorId: "synthetic-user" };
const clientId = "10000000-0000-4000-8000-000000000001";
const source = {
  tenantId: account.tenantId,
  actorId: account.actorId,
  conversationId: "20000000-0000-4000-8000-000000000001",
  runId: "30000000-0000-4000-8000-000000000001",
  attemptId: "40000000-0000-4000-8000-000000000001",
  workerId: "50000000-0000-4000-8000-000000000001",
  writerFence: 1,
} as never;
const target = {
  ...(source as object),
  runId: "30000000-0000-4000-8000-000000000002",
} as never;
const settling = () =>
  new ConversationHistoryUnavailable(
    409,
    "CONVERSATION_TURN_CONFLICT",
    "NOT_DISPATCHED",
  );
function setup() {
  const journal = conversationTurnJournal(
    new QueryClient(),
    account,
    clientId,
    (source as { conversationId: string }).conversationId,
  );
  journal.start(
    source,
    "Second question",
    "60000000-0000-4000-8000-000000000001",
  );
  return journal;
}
afterEach(() => vi.useRealTimers());

it("turn two typed while turn one is still settling is reserved once Meri stops refusing it, with the same intent", async () => {
  vi.useFakeTimers();
  const journal = setup();
  let calls = 0;
  const reserve = vi.fn(
    async (input: { conversationId: string; sourceRunId: string }) => {
      if (++calls <= 2) throw settling();
      return {
        schema: "x",
        sourceBinding: source,
        targetBinding: target,
        input,
      } as never;
    },
  );
  const reserving = reserveTurnWhenSettled(
    journal,
    reserve,
    new AbortController().signal,
  );
  await vi.advanceTimersByTimeAsync(2 * TURN_SETTLE_RETRY_MS);
  const retained = await reserving;
  expect(reserve).toHaveBeenCalledTimes(3);
  expect(
    new Set(reserve.mock.calls.map(([input]) => JSON.stringify(input))).size,
  ).toBe(1);
  expect(retained.state).toBe("ready");
  expect(retained.requestId).toBe("60000000-0000-4000-8000-000000000001");
});

it("a previous run that reaches ECS STOPPED two minutes later still lets turn two through", async () => {
  vi.useFakeTimers();
  const journal = setup();
  const settledAt = Date.now() + 120_000;
  const reserve = vi.fn(async () => {
    if (Date.now() < settledAt) throw settling();
    return {
      schema: "x",
      sourceBinding: source,
      targetBinding: target,
    } as never;
  });
  const reserving = reserveTurnWhenSettled(
    journal,
    reserve,
    new AbortController().signal,
  );
  await vi.advanceTimersByTimeAsync(120_000);
  expect((await reserving).state).toBe("ready");
});

it("only the definite not-dispatched conflict is asked again, and only for the settle window", async () => {
  vi.useFakeTimers();
  for (const error of [
    new ConversationHistoryUnavailable(
      502,
      "CONVERSATION_UNAVAILABLE",
      "UNKNOWN",
    ),
    new ConversationHistoryUnavailable(409, "CONVERSATION_TURN_CONFLICT"),
  ]) {
    const reserve = vi.fn(async () => {
      throw error;
    });
    await expect(
      reserveTurnWhenSettled(setup(), reserve, new AbortController().signal),
    ).rejects.toBe(error);
    expect(reserve).toHaveBeenCalledTimes(1);
  }
  const reserve = vi.fn(async () => {
    throw settling();
  });
  const journal = setup();
  const reserving = reserveTurnWhenSettled(
    journal,
    reserve,
    new AbortController().signal,
  );
  const refused = expect(reserving).rejects.toMatchObject({
    code: "CONVERSATION_TURN_CONFLICT",
  });
  await vi.advanceTimersByTimeAsync(TURN_SETTLE_WAIT_MS);
  await refused;
  // Asked at 0, 3 s, …, 90 s; the last refusal stands.
  expect(reserve.mock.calls.length).toBe(
    TURN_SETTLE_WAIT_MS / TURN_SETTLE_RETRY_MS + 1,
  );
  expect(journal.read()?.state).toBe("unknown");
});

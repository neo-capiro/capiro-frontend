import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { RunStatus } from "../src/features/meri/conversation/RunStatus";
import { createInitialDraftOwner } from "../src/features/meri/conversation/initial-draft";
import { ConversationHistoryUnavailable } from "../src/shared/meri-conversations/history-client";
import {
  conversationTurnJournal,
  reserveTurnWhenSettled,
  TURN_SETTLE_WAIT_MS,
} from "../src/shared/meri-conversations/turn-journal";

const context = {
  tenantId: "synthetic-tenant",
  actorId: "synthetic-actor",
  selectedClientId: "10000000-0000-4000-8000-000000000001",
  conversationId: "20000000-0000-4000-8000-000000000002",
  runId: "30000000-0000-4000-8000-000000000003",
};
const source = {
  ...context,
  attemptId: "40000000-0000-4000-8000-000000000004",
  workerId: "50000000-0000-4000-8000-000000000005",
  writerFence: 1,
};
const request = {
  requestId: "60000000-0000-4000-8000-000000000006",
  prompt: "Keep this next question",
};
afterEach(() => vi.useRealTimers());

it("Stop receipt reports a fence, while only an observed cancelled state reports the terminal record", () => {
  const render = (state: string, cancel: string, receipt: boolean) =>
    renderToStaticMarkup(
      createElement(RunStatus, {
        active: state === "running",
        run: {
          snapshot: {
            observation: { runState: state },
            cancelReceipt: receipt ? { state: "cancelled" } : null,
          },
          intent: { cancel },
          busy: false,
          transcript: "loaded",
          observing: "live",
        } as unknown as ComponentProps<typeof RunStatus>["run"],
      }),
    );
  expect(render("running", "pending", false)).toContain(
    "Stopping: requesting a cancellation fence.",
  );
  const fenced = render("running", "observed", true);
  expect(fenced).toContain("not completion of cleanup");
  expect(fenced.match(/<button[^>]*disabled=""/g)).toHaveLength(5);
  expect(fenced).toContain("Pause and checkpoint recovery are not available");
  expect(fenced).not.toContain("Stopped in the conversation record");
  expect(render("cancelled", "observed", true)).toContain(
    "Meri must confirm cleanup before starting your next message",
  );
});

it("cleanup beyond the retry window preserves the same next-turn request for an explicit retry", async () => {
  vi.useFakeTimers();
  const cache = new QueryClient();
  const journal = conversationTurnJournal(
    cache,
    context,
    context.selectedClientId,
    context.conversationId,
  );
  journal.start(source, request.prompt, request.requestId);
  let retired = false;
  const reserve = vi.fn(
    async (input: { conversationId: string; sourceRunId: string }) => {
      expect(input).toEqual({
        conversationId: source.conversationId,
        sourceRunId: source.runId,
      });
      if (!retired)
        throw new ConversationHistoryUnavailable(
          409,
          "CONVERSATION_TURN_CONFLICT",
          "NOT_DISPATCHED",
        );
      return {
        sourceBinding: source,
        targetBinding: {
          ...source,
          runId: "30000000-0000-4000-8000-000000000033",
          writerFence: 2,
        },
      } as never;
    },
  );
  const first = reserveTurnWhenSettled(
    journal,
    reserve,
    new AbortController().signal,
  );
  const refused = expect(first).rejects.toMatchObject({
    code: "CONVERSATION_TURN_CONFLICT",
  });
  await vi.advanceTimersByTimeAsync(TURN_SETTLE_WAIT_MS + 1);
  await refused;
  expect(journal.read()).toMatchObject({
    ...request,
    source,
    state: "unknown",
  });
  expect(journal.read()?.receipt).toBeUndefined();
  const count = reserve.mock.calls.length;
  await vi.advanceTimersByTimeAsync(30_000);
  expect(reserve).toHaveBeenCalledTimes(count);
  retired = true;
  const recovered = await reserveTurnWhenSettled(
    journal,
    reserve,
    new AbortController().signal,
  );
  expect(recovered).toMatchObject({ ...request, state: "ready" });
  expect(reserve).toHaveBeenCalledTimes(count + 1);
  expect(reserve.mock.calls.map(([input]) => input)).toEqual(
    Array.from({ length: count + 1 }, () => ({
      conversationId: source.conversationId,
      sourceRunId: source.runId,
    })),
  );
  cache.clear();
});

it("a next-turn acknowledgement never erases a draft edited while its reservation was pending", () => {
  const owner = createInitialDraftOwner();
  const revision = owner.revision();
  owner.edit();
  owner.edit(); // The person can edit away and back to identical bytes.
  owner.begin(context, request, request.prompt, revision);
  expect(
    owner.acknowledge(
      context,
      { ...request, state: "observed" },
      request.prompt,
    ),
  ).toBe(false);
  const unchanged = createInitialDraftOwner();
  unchanged.begin(context, request, request.prompt, unchanged.revision());
  expect(
    unchanged.acknowledge(
      context,
      { ...request, state: "pending" },
      request.prompt,
    ),
  ).toBe(false);
  expect(
    unchanged.acknowledge(
      context,
      { ...request, state: "observed" },
      request.prompt,
    ),
  ).toBe(true);
  unchanged.begin(context, request, request.prompt);
  unchanged.reset();
  expect(unchanged.hasPending(context)).toBe(false);
  expect(
    unchanged.acknowledge(
      context,
      { ...request, state: "observed" },
      request.prompt,
    ),
  ).toBe(false);
});

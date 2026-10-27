import { afterEach, expect, it, vi } from "vitest";
import { receiveIntentsResponse } from "@capiro/meri-client/intents";
import {
  legiwatchFixture,
  conversationId,
  viewer,
} from "./meri-legiwatch-fixture";
import { installPlatform } from "./command-recovery-platform";
import { createIntentsAccess } from "../src/shared/meri-intents/access";
import { intentDecisionRecovery } from "../src/features/meri/conversation/intents/decision-recovery";
import { intentRows } from "../src/features/meri/conversation/intents/intent-view";
import { intentDecisionSettled } from "../src/features/meri/conversation/intents/research-share-view";
import { useIntentExpiry } from "../src/features/meri/conversation/intents/useIntentExpiry";
const clock = vi.hoisted(() => ({
  effect: undefined as undefined | (() => void | (() => void)),
  ticks: 0,
}));
vi.mock("react", () => ({
  useState: () => [
    0,
    () => {
      clock.ticks++;
    },
  ],
  useEffect: (effect: () => void | (() => void)) => {
    clock.effect = effect;
  },
}));
installPlatform();
afterEach(() => {
  vi.useRealTimers();
  clock.effect = undefined;
  clock.ticks = 0;
});

it("receives the real public proposal and shows exact reviewed selection only to its current actor", async () => {
  const item = legiwatchFixture();
  const page = await receiveIntentsResponse(
    "list",
    200,
    JSON.stringify({ conversationId, intents: [item], next: null }),
    { request: { conversationId } },
  );
  if (!("intents" in page)) throw Error("Synthetic page refused");
  const row = intentRows(page.intents, Date.now(), viewer)[0]!;
  expect(row.decision).toBe("approvable");
  expect(row.fields).toEqual(
    expect.arrayContaining([
      { label: "Expected version", value: "2" },
      { label: "Suggestion", value: item.proposal.request.suggestionId },
      { label: "Session", value: "119" },
      { label: "Client", value: "General" },
    ]),
  );
  expect(
    intentRows(page.intents, Date.now(), { ...viewer, actorId: "another" })[0]
      ?.decision,
  ).toBe("closed");
  expect(
    intentRows(page.intents, Date.parse(item.proposal.expiresAt), viewer)[0]
      ?.status,
  ).toBe("Expired");
  expect(
    intentRows([{ ...item, result: "unavailable" }], Date.now(), viewer)[0]
      ?.decision,
  ).toBe("closed");
  const withheld = intentRows(
    [
      {
        deliveryId: item.deliveryId,
        createdAt: item.createdAt,
        operation: item.operation,
        state: item.state,
        kind: item.kind,
        withheld: true,
      },
    ],
    Date.now(),
    viewer,
  )[0]!;
  expect(withheld.fields).toEqual([]);
  expect(withheld.proposal).toBeNull();
});

it.each([
  ["added", "Added"],
  ["already_present", "Already present"],
  ["dismissed", "Suggestion dismissed"],
  ["excluded", "Excluded"],
  ["pending", "Pending review"],
  ["stale", "Suggestion changed"],
  ["undone", "Decision undone"],
  ["undo_conflict", "Undo conflict"],
  ["held", "Held"],
] as const)(
  "preserves the owner %s outcome without claiming generic completion",
  async (outcome, label) => {
    const item = legiwatchFixture("succeeded", outcome);
    const page = await receiveIntentsResponse(
      "list",
      200,
      JSON.stringify({ conversationId, intents: [item], next: null }),
      { request: { conversationId } },
    );
    if (!("intents" in page)) throw Error("Synthetic page refused");
    const row = intentRows(page.intents, Date.now(), viewer)[0]!;
    expect(row.status).toBe(label);
    expect(row.decision).toBe("closed");
    expect(row.result).toContainEqual({
      label: "Recorded outcome",
      value: outcome.replaceAll("_", " "),
    });
  },
);

it("retains an unknown exact decision and acknowledges an observed durable result without another decision POST", async () => {
  const item = legiwatchFixture("outcome_unknown");
  const request = {
    conversationId,
    deliveryId: item.deliveryId,
    proposalId: item.proposal.proposalId,
    commandSha256: item.proposal.commandSha256,
    decision: "approved" as const,
  };
  const response = {
    status: "legiwatch_decided" as const,
    deliveryId: item.deliveryId,
    proposalId: item.proposal.proposalId,
    result: item.result as Exclude<typeof item.result, "unavailable">,
  };
  const fetcher = vi.fn(async () => Response.json(response));
  const access = createIntentsAccess(
    "synthetic-session",
    new AbortController().signal,
    fetcher,
  );
  const journal = intentDecisionRecovery(
    { ...viewer, conversationId },
    item.proposal.proposalId,
    () => undefined,
  );
  await journal.decide(
    access,
    request,
    item.proposal,
    new AbortController().signal,
  );
  expect(intentDecisionSettled(response)).toBe(false);
  expect(await journal.load()).toEqual(request);
  const terminal = {
    ...response,
    result: {
      ...response.result,
      status: "succeeded" as const,
      receipt: (
        legiwatchFixture("succeeded", "stale").result as typeof response.result
      ).receipt,
    },
  };
  const received = await receiveIntentsResponse(
    "decide",
    200,
    JSON.stringify(terminal),
    { request, proposal: item.proposal },
  );
  if (!("status" in received)) throw Error("Synthetic decision refused");
  expect(intentDecisionSettled(received)).toBe(true);
  await journal.observed(item.proposal, item.deliveryId);
  expect(await journal.load()).toBeNull();
  expect(fetcher).toHaveBeenCalledTimes(1);
});

it("rejects a foreign receipt and a captured authority that changed before dispatch", async () => {
  const item = legiwatchFixture("succeeded"),
    result = item.result as Exclude<typeof item.result, "unavailable">;
  const request = {
    conversationId,
    deliveryId: item.deliveryId,
    proposalId: item.proposal.proposalId,
    commandSha256: item.proposal.commandSha256,
    decision: "approved" as const,
  };
  await expect(
    receiveIntentsResponse(
      "decide",
      200,
      JSON.stringify({
        status: "legiwatch_decided",
        deliveryId: item.deliveryId,
        proposalId: item.proposal.proposalId,
        result: {
          ...result,
          request: { ...result.request, expectedVersion: 3 },
        },
      }),
      { request, proposal: item.proposal },
    ),
  ).rejects.toThrow();
  const fetcher = vi.fn();
  const access = createIntentsAccess(
    "synthetic-session",
    new AbortController().signal,
    fetcher,
  );
  const journal = intentDecisionRecovery(
    { ...viewer, conversationId },
    item.proposal.proposalId,
    () => {
      throw Error("Synthetic retired identity");
    },
  );
  await expect(
    journal.decide(
      access,
      request,
      item.proposal,
      new AbortController().signal,
    ),
  ).rejects.toThrow("retired identity");
  expect(fetcher).not.toHaveBeenCalled();
});

it("refreshes local proposal expiry at deadline and removes its timer and visibility listener on retirement", () => {
  vi.useFakeTimers();
  const item = legiwatchFixture();
  const events = Object.assign(new EventTarget(), {
    visibilityState: "visible",
  });
  vi.stubGlobal("document", events);
  const list = {
    status: "ready" as const,
    items: [item],
    next: null,
    loadingMore: false,
  };
  useIntentExpiry(list, "synthetic-current-view", Date.now);
  const cleanup = clock.effect?.();
  vi.advanceTimersByTime(59999);
  expect(clock.ticks).toBe(0);
  vi.advanceTimersByTime(1);
  expect(clock.ticks).toBe(1);
  events.dispatchEvent(new Event("visibilitychange"));
  expect(clock.ticks).toBe(2);
  if (typeof cleanup === "function") cleanup();
  events.dispatchEvent(new Event("visibilitychange"));
  expect(clock.ticks).toBe(2);
  expect(vi.getTimerCount()).toBe(0);
});

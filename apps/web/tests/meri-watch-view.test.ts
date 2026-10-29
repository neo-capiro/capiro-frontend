import { expect, it } from "vitest";
import {
  receiveIntentsResponse,
  type IntentsItem,
} from "@capiro/meri-client/intents";
import { intentRows } from "../src/features/meri/conversation/intents/intent-view";
import { intentDecisionSettled } from "../src/features/meri/conversation/intents/research-share-view";
import {
  watchFixture,
  watchResult,
  watchDecision,
  watchDecisionResponse,
} from "./meri-watch-fixture";
import { canonicalSha256 } from "./meri-action-wire-fixtures";
import { conversationId, viewer } from "./meri-legiwatch-fixture";
const read = (item: IntentsItem) =>
  receiveIntentsResponse(
    "list",
    200,
    JSON.stringify({ conversationId, intents: [item], next: null }),
    { request: { conversationId } },
  );
it("all four real owners retain their distinct action, state, identity and nullable version", async () => {
  for (const [family, operation, state, delivery] of [
    ["legiwatch_keyword", "pause", "paused", true],
    ["business_development_prospect", "unsubscribe", "ended", false],
    ["defense_budget_target", "unsubscribe", "unsubscribed", false],
    ["client_watchlist", "pause", "paused", false],
  ] as const) {
    const item = watchResult(
      watchFixture(family, operation),
      "succeeded",
      state,
      delivery,
    );
    await read(item);
    const row = intentRows([item], Date.now(), viewer)[0]!;
    expect(row.result).toContainEqual({
      label: "Recorded state",
      value: state,
    });
    expect(row.fields).toContainEqual({
      label: "Target reference",
      value: item.proposal.request.targetKey,
    });
    expect(row.result).toContainEqual({
      label: "Delivery preference",
      value: delivery ? "Enabled" : "Disabled",
    });
    if (
      family === "business_development_prospect" ||
      family === "defense_budget_target"
    )
      expect(row.result).toContainEqual({
        label: "Recorded version",
        value: "Not reported by owner",
      });
    if (
      family === "business_development_prospect" ||
      family === "defense_budget_target"
    )
      expect(
        row.fields.find((f) => f.label === "Version check")?.value,
      ).toContain("does not publish a version");
    if (family === "client_watchlist")
      expect(row.fields.find((f) => f.label === "Effect")?.value).toContain(
        "Keep the watchlist, topics and terms",
      );
    expect(row.detail).toContain("not proof");
  }
});
it("delivery-only requests and needs-review/already-in-state receipts do not claim activation or delivery", async () => {
  const item = watchResult(
    watchFixture("legiwatch_keyword", "set_delivery"),
    "succeeded",
    "needs_review",
    false,
  );
  if (item.result === "unavailable" || !item.result.receipt)
    throw Error("fixture");
  item.result.receipt.alreadyInState = true;
  await read(item);
  const row = intentRows([item], Date.now(), viewer)[0]!;
  expect(row.status).toBe("Watch needs review");
  expect(row.fields).toContainEqual({
    label: "Requested delivery preference",
    value: "Disabled",
  });
  expect(row.fields.find((f) => f.label === "Effect")?.value).toContain(
    "Change only",
  );
  expect(row.result).toContainEqual({
    label: "State change",
    value: "Owner confirmed the state already held",
  });
});
it("public receiver refuses unsupported owner verbs and substituted receipt target/operation/current scope", async () => {
  const invalid = watchFixture("client_watchlist", "unsubscribe");
  await expect(read(invalid)).rejects.toThrow();
  const noPause = watchFixture("defense_budget_target", "pause");
  await expect(read(noPause)).rejects.toThrow();
  const item = watchResult(watchFixture(), "succeeded");
  for (const mutate of [
    (v: typeof item) => {
      if (v.result !== "unavailable" && v.result.receipt)
        v.result.receipt.targetKey = "other-target";
    },
    (v: typeof item) => {
      if (v.result !== "unavailable" && v.result.receipt)
        v.result.receipt.operation = "resume";
    },
    (v: typeof item) => {
      if (v.result !== "unavailable")
        v.result.context.contextRevision = "d".repeat(64);
    },
  ]) {
    const wrong = structuredClone(item);
    mutate(wrong);
    await expect(read(wrong)).rejects.toThrow();
  }
  const stale = structuredClone(item);
  // Detach only the proposal request: structuredClone preserves this fixture's
  // shared request reference across its proposal, result and receipt.
  stale.proposal.request = { ...stale.proposal.request, expectedVersion: 5 };
  const { commandSha256: originalDigest, ...bound } = stale.proposal;
  stale.proposal.commandSha256 = canonicalSha256(bound);
  expect(stale.proposal.commandSha256).not.toBe(originalDigest);
  await expect(read(stale)).rejects.toThrow();
});
it("withheld/unreadable watches and UNKNOWN do not settle the journal or invent a receipt", async () => {
  const item = watchFixture();
  const withheld: IntentsItem = {
    kind: item.kind,
    state: item.state,
    operation: item.operation,
    deliveryId: item.deliveryId,
    createdAt: item.createdAt,
    withheld: true,
  };
  await read(withheld);
  expect(intentRows([withheld], Date.now(), viewer)[0]?.fields).toEqual([]);
  for (const status of [
    "outcome_unknown",
    "failed_retryable",
    "executing",
  ] as const) {
    const next = watchResult(item, status),
      response = watchDecisionResponse(next);
    await receiveIntentsResponse("decide", 200, JSON.stringify(response), {
      request: watchDecision(next),
      proposal: next.proposal,
    });
    expect(intentDecisionSettled(response)).toBe(false);
    expect(intentRows([next], Date.now(), viewer)[0]?.result).toEqual([]);
  }
  expect(
    intentRows([{ ...item, result: "unavailable" }], Date.now(), viewer)[0]
      ?.decision,
  ).toBe("closed");
});

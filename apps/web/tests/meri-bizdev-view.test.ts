import { expect, it } from "vitest";
import {
  receiveIntentsResponse,
  type IntentsItem,
} from "@capiro/meri-client/intents";
import { intentRows } from "../src/features/meri/conversation/intents/intent-view";
import { intentDecisionSettled } from "../src/features/meri/conversation/intents/research-share-view";
import {
  bizdevFixture,
  bizdevResult,
  bizdevDecision,
  bizdevDecisionResponse,
} from "./meri-bizdev-fixture";
import { conversationId, viewer } from "./meri-legiwatch-fixture";

const read = (item: IntentsItem) =>
  receiveIntentsResponse(
    "list",
    200,
    JSON.stringify({ conversationId, intents: [item], next: null }),
    { request: { conversationId } },
  );
it("actual public receiver presents all five exact sections and private versus linked scope", async () => {
  for (const linked of [false, true]) {
    const item = bizdevFixture("proposed", linked);
    await read(item);
    const row = intentRows([item], Date.now(), viewer)[0]!;
    expect(row.decision).toBe("approvable");
    expect(
      row.fields.find((f) => f.label === "Company and firm implication")?.value,
    ).toBe(item.proposal.request.sections.companyAndFirmImplication.text);
    expect(
      row.fields.find(
        (f) =>
          f.label ===
          "Company and firm implication citation indexes (zero-based)",
      )?.value,
    ).toBe("1, 0, 1");
    for (const section of Object.values(item.proposal.request.sections))
      expect(row.fields.some((f) => f.value === section.text)).toBe(true);
    expect(row.fields.find((f) => f.label === "Scope")?.value).toBe(
      linked
        ? `Client ${item.proposal.context.linkedClientId}`
        : "Private to the current actor",
    );
  }
});
it("only exact saved version receipts display saved; substituted successor and context are refused", async () => {
  const item = bizdevResult(bizdevFixture(), "succeeded");
  await read(item);
  const row = intentRows([item], Date.now(), viewer)[0]!;
  expect(row.status).toBe("Brief version saved");
  expect(row.detail).toContain("does not publish or send");
  expect(row.result).toContainEqual({ label: "Saved version", value: "3" });
  const wrong = structuredClone(item);
  if (wrong.result === "unavailable" || !wrong.result.receipt)
    throw Error("fixture");
  wrong.result.receipt.version.versionNumber = 4;
  await expect(read(wrong)).rejects.toThrow();
  const changed = structuredClone(item);
  if (changed.result === "unavailable") throw Error("fixture");
  changed.result.context.scopeVersion = "d".repeat(64);
  await expect(read(changed)).rejects.toThrow();
});
it("withheld and unreadable results stay closed; UNKNOWN is unsettled and has no saved receipt", async () => {
  const item = bizdevFixture();
  const withheld: IntentsItem = {
    kind: item.kind,
    state: item.state,
    operation: item.operation,
    deliveryId: item.deliveryId,
    createdAt: item.createdAt,
    withheld: true,
  };
  await read(withheld);
  const row = intentRows([withheld], Date.now(), viewer)[0]!;
  expect(row.fields).toEqual([]);
  expect(row.proposal).toBeNull();
  for (const status of [
    "outcome_unknown",
    "failed_retryable",
    "executing",
  ] as const) {
    const next = bizdevResult(item, status);
    const response = bizdevDecisionResponse(next);
    await receiveIntentsResponse("decide", 200, JSON.stringify(response), {
      request: bizdevDecision(next),
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

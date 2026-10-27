import { expect, it } from "vitest";
import { receiveIntentsResponse } from "@capiro/meri-client/intents";
import { intentRows } from "../src/features/meri/conversation/intents/intent-view";
import { intentDecisionSettled } from "../src/features/meri/conversation/intents/research-share-view";
import { canonicalSha256 } from "./meri-action-wire-fixtures";
import { conversationId, viewer } from "./meri-legiwatch-fixture";
import {
  legislativeDocumentFixture,
  legislativeDecision,
  legislativeDecisionResponse,
  type LegislativeItem,
} from "./meri-legislative-document-fixture";

async function receive(item: LegislativeItem) {
  const page = await receiveIntentsResponse(
    "list",
    200,
    JSON.stringify({ conversationId, intents: [item], next: null }),
    { request: { conversationId } },
  );
  if (!("intents" in page)) throw Error("Fixture refused");
  return intentRows(page.intents, Date.now(), viewer)[0]!;
}
it("receives the actual closed briefing request with omitted optional scope, all150 citations and exact literal text", async () => {
  const item = legislativeDocumentFixture("proposed", true);
  if (!("template" in item.proposal.request) || item.result === "unavailable")
    throw Error("fixture");
  const first = item.proposal.request.citations[0];
  item.proposal.request.citations = [
    first,
    ...Array.from({ length: 149 }, (_, i) => ({
      ...first,
      id: `source-${i + 1}`,
    })),
  ];
  const { commandSha256: old, ...bound } = item.proposal;
  void old;
  item.proposal.commandSha256 = canonicalSha256(bound);
  const row = await receive(item);
  expect(row.decision).toBe("approvable");
  expect(row.fields).toContainEqual({
    label: "Analysis",
    value: "Literal <script>source</script> analysis",
  });
  expect(row.fields).toContainEqual({
    label: "Citation 150 quote",
    value: "text",
  });
  expect(row.fields).toContainEqual({
    label: "Time zone",
    value: "America/New_York",
  });
});
it.each(["complete", "selection_only"] as const)(
  "shows truthful %s research receipt and preserves cross-session evidence",
  async (effect) => {
    const item = legislativeDocumentFixture("succeeded", false, effect),
      row = await receive(item);
    expect(row.status).toBe(
      effect === "complete" ? "Document draft saved" : "Selection saved",
    );
    expect(row.fields).toContainEqual({
      label: "Comparison session",
      value: "2026-special",
    });
    expect(row.fields).toContainEqual({
      label: "Source document 1",
      value: "document-1 · revision revision-2 · session 2026-special",
    });
    expect(row.result.some((f) => f.label === "Document reference")).toBe(
      effect === "complete",
    );
    const response = await receiveIntentsResponse(
      "decide",
      200,
      JSON.stringify(legislativeDecisionResponse(item)),
      { request: legislativeDecision(item), proposal: item.proposal },
    );
    if ("error" in response) throw Error("fixture");
    expect(intentDecisionSettled(response)).toBe(true);
  },
);
it("unknown/executing never settle a saved decision or claim a Document; withheld and expiry stay closed", async () => {
  for (const status of [
    "outcome_unknown",
    "executing",
    "approved",
    "failed_retryable",
  ] as const) {
    const item = legislativeDocumentFixture(status),
      row = await receive(item);
    expect(row.decision).toBe("closed");
    expect(row.result).toEqual([]);
    expect(intentDecisionSettled(legislativeDecisionResponse(item))).toBe(
      false,
    );
  }
  const item = legislativeDocumentFixture();
  expect(
    intentRows(
      [
        {
          state: "prepared",
          kind: item.kind,
          deliveryId: item.deliveryId,
          createdAt: item.createdAt,
          operation: item.operation,
          withheld: true,
        },
      ],
      Date.now(),
      viewer,
    )[0]?.fields,
  ).toEqual([]);
  expect(
    intentRows([item], Date.parse(item.proposal.expiresAt), viewer)[0]?.status,
  ).toBe("Expired");
});
it("public receiver refuses unbound, contradictory, expanded or fake document receipts", async () => {
  const source = legislativeDocumentFixture("succeeded");
  const mutations: Array<Array<[string[], unknown]>> = [
    [[["result", "operation"], "prepare_legiwatch_briefing"]],
    [[["result", "context", "membershipRevision"], "d".repeat(64)]],
    [[["result", "receipt", "request", "analysis"], "changed"]],
    [[["result", "receipt", "location"], "https://example.invalid/draft-1"]],
    [[["result", "receipt", "location"], "/workspace/draft/other-draft-1"]],
    [[["result", "effect"], "selection_only"]],
    [
      [["result", "receipt", "state"], "selection_only"],
      [["result", "effect"], "selection_only"],
    ],
    [
      [["result", "status"], "outcome_unknown"],
      [["result", "effect"], "unknown"],
    ],
    [[["proposal", "request", "unreviewed"], "extra"]],
    [[["proposal", "request", "documents", "0", "sessionKey"], "x".repeat(61)]],
  ];
  for (const changes of mutations) {
    const bad = structuredClone(source);
    for (const [path, value] of changes) {
      let target = bad as unknown as Record<string, unknown>;
      for (const key of path.slice(0, -1))
        target = target[key] as Record<string, unknown>;
      target[path.at(-1)!] = value;
    }
    await expect(receive(bad)).rejects.toThrow();
  }
});

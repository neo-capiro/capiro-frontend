import { expect, it } from "vitest";
import { receiveIntentsResponse } from "@capiro/meri-client/intents";
import type {
  IntentsItem,
  IntentsLegiwatchProposal,
} from "@capiro/meri-client/intents";
import { intentRows } from "../src/features/meri/conversation/intents/intent-view";
import { intentDecisionSettled } from "../src/features/meri/conversation/intents/research-share-view";
import {
  clientRecordFixture,
  clientDecision,
  clientDecisionResponse,
} from "./meri-client-record-fixture";
import {
  legiwatchFixture,
  conversationId,
  viewer,
} from "./meri-legiwatch-fixture";
import { canonicalSha256 } from "./meri-action-wire-fixtures";

async function rows(items: IntentsItem[]) {
  const page = await receiveIntentsResponse(
    "list",
    200,
    JSON.stringify({ conversationId, intents: items, next: null }),
    { request: { conversationId } },
  );
  if (!("intents" in page)) throw Error("Synthetic page refused");
  return intentRows(page.intents, Date.now(), viewer);
}
it("shows every retained profile value, explicit empty replacement and a truthful partial receipt", async () => {
  const [row] = await rows([clientRecordFixture("succeeded")]);
  expect(row?.status).toBe("Partially updated");
  expect(row?.tone).toBe("warning");
  expect(row?.decision).toBe("closed");
  expect(row?.fields).toEqual(
    expect.arrayContaining([
      { label: "Issue Codes", value: "Replace with an empty list" },
      { label: "People 1 · Email", value: "person@example.invalid" },
      { label: "Facilities 1 · City", value: "Tampa" },
    ]),
  );
  expect(row?.result).toContainEqual({
    label: "Row Errors 1",
    value: "Synthetic office could not be updated",
  });
  expect(row?.detail).toContain("not an atomic version-checked change");
});
it("renders creation and its exact registry choice without claiming enrichment completion", async () => {
  const [row] = await rows([clientRecordFixture("succeeded", true)]);
  expect(row?.status).toBe("Client created");
  expect(row?.result).toContainEqual({
    label: "Lda Match · Lda Client Id",
    value: "42",
  });
  expect(row?.detail).toContain("enrichment completion is not confirmed");
});
it.each(["not_updated", "unchanged"] as const)(
  "distinguishes %s from an updated profile",
  async (outcome) => {
    const item = clientRecordFixture("succeeded");
    if (
      item.result === "unavailable" ||
      !item.result.receipt ||
      item.result.receipt.outcome === "created"
    )
      throw Error("fixture");
    item.proposal.request = {
      operation: "update_client_profile",
      input: {
        clientId: item.result.receipt.clientId,
        people: [{ name: "Synthetic Person" }],
      },
    };
    const { commandSha256: _digest, ...bound } = item.proposal;
    void _digest;
    item.proposal.commandSha256 = canonicalSha256(bound);
    item.result.request = item.proposal.request;
    Object.assign(item.result.receipt, {
      request: item.proposal.request,
      outcome,
      fieldsWritten: [],
      peopleUpdated: [],
      skipped: ["Synthetic Person"],
      rowErrors: outcome === "not_updated" ? ["No row changed"] : [],
    });
    expect((await rows([item]))[0]?.status).toBe(
      outcome === "not_updated" ? "No changes confirmed" : "Already present",
    );
  },
);
it("keeps unknown/retryable statuses unsettled and terminal rejection distinct", async () => {
  for (const status of [
    "outcome_unknown",
    "failed_retryable",
    "executing",
    "approved",
  ] as const) {
    const item = clientRecordFixture(status);
    const response = await receiveIntentsResponse(
      "decide",
      200,
      JSON.stringify(clientDecisionResponse(item)),
      { request: clientDecision(item), proposal: item.proposal },
    );
    if (!("status" in response)) throw Error("fixture");
    expect(intentDecisionSettled(response)).toBe(false);
  }
  expect((await rows([clientRecordFixture("dismissed")]))[0]?.status).toBe(
    "Rejected",
  );
});
it("withholds fields and closes foreign/expired client proposals", async () => {
  const item = clientRecordFixture();
  const { proposal: _p, result: _r, ...publicBase } = item;
  void _p;
  void _r;
  const [withheld] = await rows([{ ...publicBase, withheld: true }]);
  expect(withheld?.fields).toEqual([]);
  expect(withheld?.proposal).toBeNull();
  expect(
    intentRows([item], Date.now(), { ...viewer, actorId: "other" })[0]
      ?.decision,
  ).toBe("closed");
  expect(
    intentRows([item], Date.parse(item.proposal.expiresAt), viewer)[0]?.status,
  ).toBe("Expired");
});
it("shows exact relevance evidence and reports a pending suggestion, never assignment or watch activation", async () => {
  const seed = legiwatchFixture();
  const request: Extract<
    IntentsLegiwatchProposal["request"],
    { previewHash: string }
  > = {
    clientId: null,
    folderId: seed.proposal.request.folderId,
    jurisdiction: "US",
    sessionKey: "119",
    fields: ["title"],
    billId: "hr1-119",
    explanation: "Synthetic relevance",
    documentId: "hr1-119:title",
    start: 0,
    end: 6,
    quote: "A😀漢字B",
    previewHash: "a".repeat(64),
    requestKey: "synthetic-key",
  };
  const { commandSha256: _digest, ...prior } = seed.proposal;
  void _digest;
  const bound = {
    ...prior,
    operation: "save_legiwatch_relevance" as const,
    request,
  };
  const proposal = { ...bound, commandSha256: canonicalSha256(bound) };
  const item: IntentsItem = {
    ...seed,
    operation: { id: bound.operation, version: "0.2.0" },
    proposal,
    result: {
      ...seed.result,
      request,
      status: "succeeded",
      receipt: {
        request,
        outcome: "suggested",
        payload: {
          binding: canonicalSha256([request.previewHash, request.requestKey]),
          suggestionId: "00000000-0000-4000-8000-000000000007",
          version: 1,
          origin: "semantic",
          state: "pending",
        },
      },
    },
  };
  const [row] = await rows([item]);
  expect(row?.status).toBe("Suggestion saved");
  expect(row?.fields).toContainEqual({
    label: "Verified quote",
    value: "A😀漢字B",
  });
  expect(row?.fields).toContainEqual({
    label: "Source offsets (UTF-16)",
    value: "0–6",
  });
  expect(row?.detail).toContain(
    "no bill was assigned and no watch was activated",
  );
  expect(row?.result).toContainEqual({
    label: "Saved suggestion",
    value: request.folderId.replace(/6$/, "7"),
  });
});

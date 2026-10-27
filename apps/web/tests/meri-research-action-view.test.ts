import { expect, it } from "vitest";
import {
  receiveIntentsResponse,
  type IntentsItem,
} from "@capiro/meri-client/intents";
import { intentRows } from "../src/features/meri/conversation/intents/intent-view";
import { intentDecisionSettled } from "../src/features/meri/conversation/intents/research-share-view";
import {
  researchActionFixture,
  researchActionResult,
} from "./meri-research-action-fixture";
import { conversationId, viewer } from "./meri-legiwatch-fixture";

const read = (item: IntentsItem) =>
  receiveIntentsResponse(
    "list",
    200,
    JSON.stringify({ conversationId, intents: [item], next: null }),
    { request: { conversationId } },
  );

it("actual public receiver admits a prepared Research Portfolio action and the row shows the exact retained request", async () => {
  const item = researchActionFixture();
  await read(item);
  const row = intentRows([item], Date.now(), viewer)[0]!;
  expect(row.decision).toBe("approvable");
  expect(row.title).toBe("Create a Research Portfolio snapshot");
  expect(row.fields).toContainEqual({ label: "Name", value: "Q1 review 界" });
  expect(row.fields).toContainEqual({ label: "Expected Revision", value: "3" });
  expect(row.fields).toContainEqual({
    label: "Scope",
    value: "Private to the current actor",
  });
  expect(JSON.stringify(row.fields)).not.toContain("meri-rp-");
  expect(row.fields.some((f) => f.label === "Conversation Id")).toBe(false);
});

it("management actions list their parameters without the derived idempotency key and the selected client is named", async () => {
  const manage = researchActionFixture("manage_research_portfolio");
  await read(manage);
  const row = intentRows([manage], Date.now(), viewer)[0]!;
  expect(row.fields).toContainEqual({
    label: "Action",
    value: manage.proposal.preview.label,
  });
  expect(row.fields).toContainEqual({ label: "Parameters", value: "1" });
  expect(row.fields).toContainEqual({
    label: "Parameter Expected Revision",
    value: "3",
  });
  expect(JSON.stringify(row.fields)).not.toContain("idempotencyKey");
  const save = researchActionFixture(
    "save_research_portfolio_output_to_client",
  );
  await read(save);
  const saved = intentRows([save], Date.now(), viewer)[0]!;
  expect(saved.fields).toContainEqual({
    label: "Prepared for",
    value: "Synthetic client",
  });
  expect(saved.fields.find((f) => f.label === "Scope")?.value).toContain(
    "client ",
  );
});

it("a succeeded result shows Core's bounded receipt and settles; uncertain and foreign states never approve", async () => {
  const done = researchActionResult(researchActionFixture(), "succeeded", {
    ok: true,
    snapshotId: "00000000-0000-4000-8000-000000000051",
    portfolioRevision: 3,
    client: { name: "Synthetic client" },
  });
  await read(done);
  const row = intentRows([done], Date.now(), viewer)[0]!;
  expect(row.status).toBe("Action completed");
  expect(row.decision).toBe("closed");
  expect(row.result).toContainEqual({
    label: "Snapshot Id",
    value: "00000000-0000-4000-8000-000000000051",
  });
  expect(row.result).toContainEqual({
    label: "Client",
    value: "Synthetic client",
  });
  expect(row.result.some((f) => f.label === "Ok")).toBe(false);
  const leaked = researchActionResult(researchActionFixture(), "proposed", {
    ok: true,
  });
  await expect(read(leaked)).rejects.toThrow();
  const unknown = researchActionResult(
    researchActionFixture(),
    "outcome_unknown",
  );
  await read(unknown);
  expect(intentRows([unknown], Date.now(), viewer)[0]!.status).toBe(
    "Result uncertain",
  );
  const foreign = researchActionFixture();
  const other = intentRows([foreign], Date.now(), {
    ...viewer,
    actorId: "someone-else",
  })[0]!;
  expect(other.decision).toBe("closed");
  expect(other.status).toBe("Needs the original approver");
  const expired = researchActionFixture();
  expect(
    intentRows(
      [expired],
      Date.parse(expired.proposal.expiresAt) + 1,
      viewer,
    )[0]!.status,
  ).toBe("Expired");
  expect(
    intentDecisionSettled({
      status: "research_action_decided",
      deliveryId: done.deliveryId,
      proposalId: done.proposal.proposalId,
      proposalStatus: "succeeded",
    }),
  ).toBe(true);
  expect(
    intentDecisionSettled({
      status: "research_action_decided",
      deliveryId: done.deliveryId,
      proposalId: done.proposal.proposalId,
      proposalStatus: "outcome_unknown",
    }),
  ).toBe(false);
});

it("the decide receiver correlates a research action decision with the retained proposal", async () => {
  const item = researchActionFixture();
  const request = {
    conversationId,
    deliveryId: item.deliveryId,
    proposalId: item.proposal.proposalId,
    commandSha256: item.proposal.commandSha256,
    decision: "approved" as const,
  };
  const reply = {
    status: "research_action_decided",
    deliveryId: item.deliveryId,
    proposalId: item.proposal.proposalId,
    proposalStatus: "succeeded",
    resultSummary: {
      ok: true,
      snapshotId: "00000000-0000-4000-8000-000000000051",
    },
  };
  await receiveIntentsResponse("decide", 200, JSON.stringify(reply), {
    request,
    proposal: item.proposal,
  });
  await expect(
    receiveIntentsResponse(
      "decide",
      200,
      JSON.stringify({ ...reply, proposalStatus: "proposed" }),
      { request, proposal: item.proposal },
    ),
  ).rejects.toThrow();
  await expect(
    receiveIntentsResponse(
      "decide",
      200,
      JSON.stringify({
        ...reply,
        proposalId: "00000000-0000-4000-8000-000000000099",
      }),
      { request, proposal: item.proposal },
    ),
  ).rejects.toThrow();
});

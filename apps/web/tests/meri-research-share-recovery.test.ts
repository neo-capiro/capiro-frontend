import { expect, it, vi } from "vitest";
import { receiveIntentsResponse } from "@capiro/meri-client/intents";
import { prepared, conversationId } from "./meri-research-share-fixture";
import { db, installPlatform, local } from "./command-recovery-platform";
import { createIntentsAccess } from "../src/shared/meri-intents/access";
import { intentDecisionRecovery } from "../src/features/meri/conversation/intents/decision-recovery";
import { intentRows } from "../src/features/meri/conversation/intents/intent-view";
installPlatform();

async function fixture() {
  const list = await receiveIntentsResponse(
    "list",
    200,
    JSON.stringify({ conversationId, intents: [prepared()], next: null }),
    { request: { conversationId } },
  );
  if (!("intents" in list)) throw new Error("Synthetic list was refused");
  const item = list.intents[0]!;
  if (
    item.state !== "prepared" ||
    item.kind !== "research_share" ||
    !("proposal" in item)
  )
    throw new Error("Invalid synthetic proposal");
  const request = {
    conversationId,
    deliveryId: item.deliveryId,
    proposalId: item.proposal.proposalId,
    commandSha256: item.proposal.commandSha256,
    decision: "approved" as const,
  };
  const journal = intentDecisionRecovery(
    { tenantId: "tenant", actorId: "actor", conversationId },
    item.proposal.proposalId,
    () => undefined,
  );
  return { list, item, request, journal };
}

it("keeps a research decision after an unknown outcome and settles only the current canonical result", async () => {
  const f = await fixture();
  let status = "outcome_unknown";
  const fetcher = vi.fn(async () =>
    Response.json({
      status: "research_share_decided",
      deliveryId: f.item.deliveryId,
      proposalId: f.item.proposal.proposalId,
      proposalStatus: status,
    }),
  );
  const access = createIntentsAccess(
    "synthetic-session",
    new AbortController().signal,
    fetcher,
  );
  await f.journal.decide(
    access,
    f.request,
    f.item.proposal,
    new AbortController().signal,
  );
  expect(await f.journal.load()).toEqual(f.request);
  status = "succeeded";
  await f.journal.decide(
    access,
    f.request,
    f.item.proposal,
    new AbortController().signal,
  );
  expect(await f.journal.load()).toBeNull();
  expect(fetcher.mock.calls).toHaveLength(2);
});

it("delivers an admitted one-time address before a failed local acknowledgement without persisting it", async () => {
  const f = await fixture(),
    sharePath = `/share/${"c".repeat(64)}`;
  const fetcher = vi.fn(async () => {
    db.failWrite = true;
    return Response.json({
      status: "research_share_decided",
      deliveryId: f.item.deliveryId,
      proposalId: f.item.proposal.proposalId,
      proposalStatus: "succeeded",
      oneTimeResult: { sharePath, shownOnce: true },
    });
  });
  const accepted = vi.fn();
  const access = createIntentsAccess(
    "synthetic-session",
    new AbortController().signal,
    fetcher,
  );
  await expect(
    f.journal.decide(
      access,
      f.request,
      f.item.proposal,
      new AbortController().signal,
      accepted,
    ),
  ).rejects.toThrow();
  expect(accepted).toHaveBeenCalledWith(
    expect.objectContaining({ oneTimeResult: { sharePath, shownOnce: true } }),
  );
  expect(JSON.stringify([...db.records, ...local])).not.toContain(sharePath);
  expect(fetcher).toHaveBeenCalledTimes(1);
});

it("offers confirmation only to the proposal's own user and never adds an address to history", async () => {
  const f = await fixture();
  expect(
    intentRows(f.list.intents, Date.now(), {
      tenantId: "tenant",
      actorId: "actor",
    })[0]?.decision,
  ).toBe("approvable");
  expect(
    intentRows(f.list.intents, Date.now(), {
      tenantId: "tenant",
      actorId: "someone-else",
    })[0]?.decision,
  ).toBe("closed");
  expect(
    JSON.stringify(
      intentRows(f.list.intents, Date.now(), {
        tenantId: "tenant",
        actorId: "actor",
      }),
    ),
  ).not.toContain("/share/");
});

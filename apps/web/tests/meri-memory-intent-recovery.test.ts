import { expect, it, vi } from "vitest";
import { db, installPlatform, local } from "./command-recovery-platform";
import { receiveIntentsResponse } from "@capiro/meri-client/intents";
import { intentDecisionRecovery } from "../src/features/meri/conversation/intents/decision-recovery";
import type { IntentsAccess } from "../src/shared/meri-intents/access";
import { memoryIntent } from "./meri-memory-intent-fixture";

installPlatform();
const actor = {
  tenantId: "tenant",
  actorId: "actor",
  conversationId: "00000000-0000-4000-8000-000000000001",
};

function prepared() {
  const fixture = memoryIntent();
  const item = fixture.response.intents[0];
  const request = {
    conversationId: actor.conversationId,
    deliveryId: item.deliveryId,
    proposalId: item.proposal.proposalId,
    commandSha256: item.proposal.commandSha256,
    decision: "approved" as const,
  };
  const journal = () =>
    intentDecisionRecovery(actor, request.proposalId, () => undefined);
  const access = {
    decide: vi.fn<IntentsAccess["decide"]>(async () => ({
      kind: "unavailable",
      dispatched: true,
    })),
    list: vi.fn<IntentsAccess["list"]>(),
  };
  return { fixture, item, request, journal, access };
}

it("recovers one exact memory approval after a lost response using current submission readback", async () => {
  const { fixture, item, request, journal, access } = prepared();
  await journal().decide(
    access,
    request,
    item.proposal,
    new AbortController().signal,
  );
  expect(await journal().load()).toEqual(request);
  expect(
    JSON.stringify([...local.values(), ...db.records.values()]),
  ).not.toContain(item.proposal.command.arguments.content);

  const received = await receiveIntentsResponse(
    "list",
    200,
    JSON.stringify(fixture.response),
    { request: fixture.request },
  );
  if ("error" in received) throw Error("Unexpected refusal");
  const observed = received.intents[0]!;
  if (
    observed.state !== "prepared" ||
    observed.kind !== "proposal" ||
    "withheld" in observed
  )
    throw Error("Missing proposal");
  expect(observed.phase).toBe("completed");
  await journal().observed(observed.proposal, observed.deliveryId);
  expect(await journal().load()).toBeNull();
  expect(access.decide).toHaveBeenCalledTimes(1);
});

it("rejects a changed command or opposite choice while the original memory decision is unresolved", async () => {
  const { item, request, journal, access } = prepared();
  await journal().decide(
    access,
    request,
    item.proposal,
    new AbortController().signal,
  );
  await expect(
    journal().decide(
      access,
      { ...request, decision: "rejected" },
      item.proposal,
      new AbortController().signal,
    ),
  ).rejects.toThrow("different decision");
  await expect(
    journal().decide(
      access,
      request,
      { ...item.proposal, commandSha256: "f".repeat(64) },
      new AbortController().signal,
    ),
  ).rejects.toThrow("does not match");
  expect(access.decide).toHaveBeenCalledTimes(1);
  expect(await journal().load()).toEqual(request);
});

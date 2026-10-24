import { readFileSync } from "node:fs";
import { expect, it, vi } from "vitest";
import {
  barrier,
  db,
  installPlatform,
  local,
} from "./command-recovery-platform";
import { intentDecisionRecovery } from "../src/features/meri/conversation/intents/decision-recovery";
import {
  createIntentsAccess,
  type IntentsAccess,
} from "../src/shared/meri-intents/access";
import { decryptJournal } from "../src/shared/session/recovery/journal-crypto";

installPlatform();
const wire = (name: string) =>
  JSON.parse(
    readFileSync(
      new URL(`./fixtures/meri-intents/${name}.json`, import.meta.url),
      "utf8",
    ),
  );
const fixture = wire("decideRejected");
const actor = {
  tenantId: "tenant",
  actorId: "actor",
  conversationId: fixture.request.conversationId,
};
const signal = () => new AbortController().signal;
const recovery = (guard = () => undefined) =>
  intentDecisionRecovery(actor, fixture.request.proposalId, guard);
const unavailable = () => {
  const decide = vi.fn<IntentsAccess["decide"]>(async () => ({
    kind: "unavailable",
    dispatched: true,
  }));
  return { decide, list: vi.fn<IntentsAccess["list"]>() };
};
const record = async () => {
  const [scope, encrypted] = [...db.records.entries()][0]!;
  return decryptJournal(scope, encrypted);
};

it("encrypts the exact decision before HTTP and recovers it without dispatch after reload", async () => {
  const started = barrier(),
    release = barrier(),
    access = unavailable();
  access.decide.mockImplementationOnce(async (request) => {
    const saved = await record();
    expect(saved.state).toBe("pending");
    if (saved.state !== "pending") throw new Error("Missing saved request");
    expect(saved.data).toEqual({
      requestId: fixture.request.proposalId,
      request,
    });
    expect(JSON.stringify([...local.values()])).not.toContain("rejected");
    expect(JSON.stringify([...db.records.values()])).not.toContain("rejected");
    started.resolve();
    await release.promise;
    return { kind: "unavailable", dispatched: true };
  });
  const pending = recovery().decide(
    access,
    fixture.request,
    fixture.proposal,
    signal(),
  );
  await started.promise;
  expect(await recovery().load()).toEqual(fixture.request);
  expect(access.decide).toHaveBeenCalledTimes(1);
  release.resolve();
  await pending;
  expect(await recovery().load()).toEqual(fixture.request);
});

it("keeps one exact choice across tabs and rejects the opposite decision before HTTP", async () => {
  const access = unavailable();
  await recovery().decide(access, fixture.request, fixture.proposal, signal());
  await expect(
    recovery().decide(
      access,
      { ...fixture.request, decision: "approved" },
      fixture.proposal,
      signal(),
    ),
  ).rejects.toThrow("different decision");
  expect(access.decide).toHaveBeenCalledTimes(1);
  await recovery().decide(access, fixture.request, fixture.proposal, signal());
  expect(access.decide).toHaveBeenCalledTimes(2);
  expect(access.decide.mock.calls[1]?.[0]).toEqual(fixture.request);
});

it("serializes competing first decisions and retains the first choice", async () => {
  const access = unavailable();
  const results = await Promise.allSettled([
    recovery().decide(access, fixture.request, fixture.proposal, signal()),
    recovery().decide(
      access,
      { ...fixture.request, decision: "approved" },
      fixture.proposal,
      signal(),
    ),
  ]);
  expect(results.map((result) => result.status)).toEqual([
    "fulfilled",
    "rejected",
  ]);
  expect(access.decide).toHaveBeenCalledTimes(1);
  expect(await recovery().load()).toEqual(fixture.request);
});

it("holds before dispatch on failed or incomplete storage", async () => {
  const access = unavailable();
  db.failWrite = true;
  await expect(
    recovery().decide(access, fixture.request, fixture.proposal, signal()),
  ).rejects.toThrow("recovery is unavailable");
  expect(access.decide).not.toHaveBeenCalled();
  db.failWrite = false;
  await expect(recovery().load()).rejects.toThrow("recovery is unavailable");
  await expect(
    recovery().decide(access, fixture.request, fixture.proposal, signal()),
  ).rejects.toThrow("recovery is unavailable");
  expect(access.decide).not.toHaveBeenCalled();
});

it("does not adopt a decision under another actor, tenant, conversation, or command", async () => {
  const access = unavailable();
  await recovery().decide(access, fixture.request, fixture.proposal, signal());
  for (const other of [
    { ...actor, actorId: "other" },
    { ...actor, tenantId: "other" },
    { ...actor, conversationId: "00000000-0000-4000-8000-000000000099" },
  ]) {
    const journal = intentDecisionRecovery(
      other,
      fixture.request.proposalId,
      () => undefined,
    );
    expect(await journal.load()).toBeNull();
    await expect(
      journal.decide(access, fixture.request, fixture.proposal, signal()),
    ).rejects.toThrow();
  }
  expect(() =>
    recovery().matches(
      fixture.request,
      { ...fixture.proposal, commandSha256: "0".repeat(64) },
      fixture.request.deliveryId,
    ),
  ).toThrow("does not match");
  expect(() =>
    recovery().matches(
      fixture.request,
      fixture.proposal,
      `sdk:${"2".repeat(64)}`,
    ),
  ).toThrow("does not match");
  expect(access.decide).toHaveBeenCalledTimes(1);
});

it("retains an uncertain request through public UNKNOWN and other refusals", async () => {
  for (const name of ["decideUnknown", "decideExpired"]) {
    db.records.clear();
    local.clear();
    const current = wire(name);
    const access = createIntentsAccess(
      `action_session_${"a".repeat(43)}`,
      signal(),
      vi.fn(
        async () =>
          new Response(JSON.stringify(current.response), {
            status: current.httpStatus,
            headers: { "content-type": "application/json" },
          }),
      ),
    );
    const reply = await recovery().decide(
      access,
      current.request,
      current.proposal,
      signal(),
    );
    expect(reply.kind).toBe("refused");
    expect(await recovery().load()).toEqual(current.request);
  }
});

it("settles only an admitted current decision response and cannot send that proposal again", async () => {
  const fetcher = vi.fn(
    async () =>
      new Response(JSON.stringify(fixture.response), {
        status: fixture.httpStatus,
        headers: { "content-type": "application/json" },
      }),
  );
  const access = createIntentsAccess(
    `action_session_${"a".repeat(43)}`,
    signal(),
    fetcher,
  );
  expect(
    (
      await recovery().decide(
        access,
        fixture.request,
        fixture.proposal,
        signal(),
      )
    ).kind,
  ).toBe("ok");
  expect((await record()).state).toBe("acknowledged");
  expect(await recovery().load()).toBeNull();
  await expect(
    recovery().decide(access, fixture.request, fixture.proposal, signal()),
  ).rejects.toThrow();
  expect(fetcher).toHaveBeenCalledTimes(1);
});

it("keeps the original marker on authority loss and reconciles through a current durable list without another POST", async () => {
  let live = true;
  const access = unavailable();
  access.decide.mockImplementationOnce(async () => {
    live = false;
    return { kind: "ok", value: fixture.response };
  });
  const guarded = recovery(() => {
    if (!live) throw new DOMException("scope changed", "AbortError");
  });
  await expect(
    guarded.decide(access, fixture.request, fixture.proposal, signal()),
  ).rejects.toThrow("scope changed");
  expect(await recovery().load()).toEqual(fixture.request);
  await recovery().observed(fixture.proposal, fixture.request.deliveryId);
  expect((await record()).state).toBe("acknowledged");
  expect(access.decide).toHaveBeenCalledTimes(1);
});

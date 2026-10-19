import "./command-recovery-platform";
import { expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import wire from "./objective-generation-wire-fixtures.json";
import { objective } from "./browser/fixtures";
import { installPlatform, db, barrier } from "./command-recovery-platform";
import type { ApiClient } from "../src/shared/portfolio/api/http";
import { ObjectiveGenerationSession } from "../src/features/portfolio/objectives/objective-generation-session";
import { createGenerationRecovery } from "../src/features/portfolio/objectives/objective-generation-recovery";
import type { ObjectiveGenerationRequest } from "../src/shared/capiro/operations/objective-generation";
import { decryptJournal } from "../src/shared/session/recovery/journal-crypto";

installPlatform();
function setup() {
  const selected = {
    clientId: wire.request.body.clientId,
    id: wire.request.body.objective.objectiveId,
    version: 7,
  };
  const cache = new QueryClient();
  const actor = { tenantId: "synthetic-tenant", userId: "synthetic-actor" };
  const identity = {
    user: { id: actor.userId, email: null },
    tenant: { id: actor.tenantId, name: "Synthetic" },
    role: "standard_user",
  };
  cache.setQueryData(["identity"], identity);
  const control = {
    lostReply: false,
    objectiveVersion: 7,
    status: "queued",
    foreignJob: false,
    deny: false,
    pause: undefined as undefined | Promise<void>,
  };
  const writes: ObjectiveGenerationRequest[] = [];
  let receipt = structuredClone(wire.accepted.body.objectiveGeneration);
  const api: ApiClient = {
    async request(_service, path, schema, options) {
      options?.signal?.throwIfAborted();
      let value: unknown;
      if (path === "me") {
        await control.pause;
        options?.signal?.throwIfAborted();
        value = {
          ...identity,
          role: control.deny ? "readonly" : identity.role,
        };
      } else if (path.endsWith("/objectives")) {
        value = [
          {
            ...objective,
            id: selected.id,
            clientId: selected.clientId,
            version: control.objectiveVersion,
            status: "ready",
          },
        ];
      } else if (path === "strategies/objective-drafts") {
        const request = structuredClone(
          options!.body,
        ) as ObjectiveGenerationRequest;
        writes.push(request);
        receipt = {
          ...receipt,
          requestId: request.requestId,
          source: {
            ...receipt.source,
            clientId: request.clientId,
            objectiveId: request.objective.objectiveId,
            objectiveVersion: request.objective.objectiveVersion,
          },
        };
        if (control.lostReply) {
          control.lostReply = false;
          throw new TypeError("synthetic lost reply");
        }
        value = { ...wire.accepted.body, objectiveGeneration: receipt };
      } else if (path.startsWith("strategies/draft-jobs/")) {
        const template =
          control.status === "completed"
            ? wire.completedPoll.body
            : control.status === "failed"
              ? wire.incompleteContextPoll.body
              : wire.pendingPoll.body;
        value = {
          ...structuredClone(template),
          objectiveGeneration: {
            ...structuredClone(template.objectiveGeneration),
            requestId: receipt.requestId,
            source: {
              ...receipt.source,
              clientId: control.foreignJob
                ? wire.request.body.requestId
                : selected.clientId,
            },
          },
        };
      } else throw new Error(`Unexpected synthetic path: ${path}`);
      return schema.parse(value);
    },
  };
  const port = () => createGenerationRecovery(api, cache, actor, selected);
  const session = () => new ObjectiveGenerationSession(api, selected, port());
  return { selected, cache, actor, control, writes, port, session };
}

it("retains the same request across a lost reply and a new view without an automatic POST", async () => {
  const s = setup(),
    first = s.session();
  await first.hydrate();
  expect(first.snapshot().ready).toBe(true);
  expect(s.writes).toHaveLength(0);
  s.control.lostReply = true;
  await first.submit("appropriations");
  expect(first.snapshot().uncertain).toBe(true);
  const original = structuredClone(s.writes[0]);
  if (!original) throw new Error("Expected the reserved generation write.");
  const reopened = s.session();
  await reopened.hydrate();
  expect(s.writes).toHaveLength(1);
  expect(reopened.snapshot().request).toEqual(original);
  await reopened.submit("appropriations");
  expect(s.writes).toEqual([original, original]);
  expect(reopened.snapshot().accepted?.status).toBe("queued");
  // The canonical fence exposes only a nonsecret request UUID. Its selector and
  // intent payload remain encrypted under the nonextractable browser key.
  expect(JSON.stringify([...db.records.values()])).not.toContain(
    original.clientId,
  );
  expect(JSON.stringify([...db.records.values()])).not.toContain(original.type);
});
it("serializes two views so the second reads the admitted job instead of creating another request", async () => {
  const s = setup(),
    a = s.session(),
    b = s.session();
  await Promise.all([a.hydrate(), b.hydrate()]);
  await Promise.all([a.submit("appropriations"), b.submit("appropriations")]);
  expect(s.writes).toHaveLength(1);
  expect(a.snapshot().request).toEqual(b.snapshot().request);
  expect(b.snapshot().accepted?.jobId).toBe(a.snapshot().accepted?.jobId);
});
it("does not replace retained intent with another Strategy type", async () => {
  const s = setup(),
    a = s.session();
  await a.hydrate();
  s.control.lostReply = true;
  await a.submit("appropriations");
  const b = s.session();
  await b.hydrate();
  await b.submit("regulatory");
  expect(s.writes).toHaveLength(1);
  expect(b.snapshot().error).toMatch(/original Strategy type/);
});
it("rechecks current Core actor and saved Objective before dispatch", async () => {
  for (const kind of ["actor", "version"] as const) {
    const s = setup(),
      a = s.session();
    await a.hydrate();
    if (kind === "actor") s.control.deny = true;
    else s.control.objectiveVersion = 8;
    await a.submit("appropriations");
    expect(s.writes).toHaveLength(0);
    expect(a.snapshot().error).toBeTruthy();
  }
});
it("does not dispatch after its view is disposed during authority verification", async () => {
  const s = setup(),
    a = s.session();
  await a.hydrate();
  const held = barrier();
  s.control.pause = held.promise;
  const pending = a.submit("appropriations");
  a.suspend();
  held.resolve();
  await pending;
  expect(s.writes).toHaveLength(0);
  expect(a.snapshot().verified).toBe(false);
});
it("keeps a storage failure held instead of dispatching an unretained request", async () => {
  const s = setup(),
    a = s.session();
  await a.hydrate();
  db.failWrite = true;
  await a.submit("appropriations");
  expect(s.writes).toHaveLength(0);
  expect(a.snapshot().error).toMatch(/recovery is unavailable/);
  db.failWrite = false;
  const reopened = s.session();
  await reopened.hydrate();
  expect(reopened.snapshot().ready).toBe(false);
  expect(reopened.snapshot().error).toMatch(/recovery is unavailable/);
});
it("conceals a foreign polled receipt and does not release the journal", async () => {
  const s = setup(),
    a = s.session();
  await a.hydrate();
  await a.submit("appropriations");
  s.control.foreignJob = true;
  await a.refresh();
  expect(a.snapshot().verified).toBe(false);
  expect(a.snapshot().error).toMatch(/does not match/);
  expect(a.canReset()).toBe(false);
  expect((await s.port().load())?.accepted?.status).toBe("queued");
});
it("acknowledges only a freshly read completed result before allowing an explicit new request", async () => {
  const s = setup(),
    a = s.session();
  await a.hydrate();
  await a.submit("appropriations");
  const original = a.snapshot().request!.requestId;
  s.control.status = "completed";
  await a.refresh();
  expect(a.canReset()).toBe(true);
  await a.reset();
  expect(await s.port().load()).toBeNull();
  await a.submit("regulatory");
  expect(s.writes[1]!.requestId).not.toBe(original);
  expect(s.writes[1]!.type).toBe("regulatory");
});
it("retains confirmed failure distinctly and refuses to retire an unconfirmed outcome", async () => {
  const s = setup(),
    a = s.session();
  await a.hydrate();
  await a.submit("appropriations");
  s.control.status = "failed";
  await a.refresh();
  expect(a.canReset()).toBe(true);
  const value = a.snapshot().accepted!,
    request = a.snapshot().request!;
  const unknown = structuredClone(value);
  unknown.objectiveGeneration.failure = {
    code: "OBJECTIVE_GENERATION_OUTCOME_UNCONFIRMED",
    message:
      "The saved outcome could not be confirmed. Refresh this attempt before starting another.",
  };
  await expect(s.port().retire(unknown, request)).rejects.toThrow(
    /must be confirmed/,
  );
  await a.reset();
  const [scope, encrypted] = [...db.records][0]!;
  expect(await decryptJournal(scope, encrypted)).toMatchObject({
    state: "refused",
    code: "OBJECTIVE_CONTEXT_INCOMPLETE",
  });
  expect(await s.port().load()).toBeNull();
});
it("rejects a replacement verified actor cache before any recovery or write", async () => {
  const s = setup(),
    a = s.session();
  await a.hydrate();
  s.cache.setQueryData(["identity"], {
    user: { id: "replacement", email: null },
    tenant: { id: s.actor.tenantId, name: "Synthetic" },
    role: "standard_user",
  });
  await a.submit("appropriations");
  expect(s.writes).toHaveLength(0);
  expect(a.snapshot().error).toMatch(/current session/);
});

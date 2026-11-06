import "./command-recovery-platform";
import { expect, it } from "vitest";
import { db, local, barrier } from "./command-recovery-platform";
import { decryptJournal } from "../src/shared/session/recovery/journal-crypto";
import { previewBackendRejection } from "../src/shared/preview/backend-policy.server";
import { requireInitialStrategyIntakeSource } from "../src/features/portfolio/objectives/objective-strategy-intake-source";
import {
  setup,
  id,
  actor,
  client,
  objective,
  source,
} from "./objective-strategy-intake-fixture";

it.each(["hydrate", "refresh"] as const)(
  "%s cannot erase a known intake when recovery storage disappears",
  async (read) => {
    const s = setup(),
      session = s.session();
    await session.hydrate();
    s.control.lostReply = true;
    await session.submit("appropriations");
    const original = structuredClone(session.snapshot().retained);
    expect(s.writes).toHaveLength(1);
    db.records.clear();
    local.clear();
    await session[read]();
    expect(session.snapshot().retained).toEqual(original);
    expect(session.snapshot().error).toBeTruthy();
    await session.submit("appropriations");
    expect(s.writes).toHaveLength(1);
    expect(s.starts).not.toHaveBeenCalled();
  },
);

it("accepts a current ready source even when an ordinary GET says outcome unconfirmed", () => {
  expect(requireInitialStrategyIntakeSource(source, objective, client)).toEqual(
    source,
  );
  for (const changed of [
    { ...source, control: { ...source.control, version: 1 } },
    { ...source, objective: { ...source.objective, status: "draft" } },
    {
      ...source,
      requestedSource: {
        ...source.requestedSource,
        revision: { id: id(8), version: 6 },
      },
    },
  ])
    expect(() =>
      requireInitialStrategyIntakeSource(changed, objective, client),
    ).toThrow();
});

it("preserves the explicit read-only deployment boundary", () => {
  const held = previewBackendRejection(
    { CAPIRO_PREVIEW_READ_ONLY: "true" },
    new Request(
      "https://preview.test/api/capiro/objectives.governedStrategy.intake",
      {
        method: "POST",
      },
    ),
  );
  expect(held?.status).toBe(503);
});

it("persists accepted intake before start and never starts again on hydrate", async () => {
  const s = setup();
  const first = s.session();
  await first.hydrate();
  expect(s.starts).not.toHaveBeenCalled();
  await first.submit("appropriations");
  expect(s.starts).toHaveBeenCalledTimes(1);
  expect(first.snapshot().retained?.started).toEqual({
    state: "requested",
    generationJobId: id(20),
  });
  const reopened = s.session();
  await reopened.hydrate();
  expect(s.starts).toHaveBeenCalledTimes(1);
  expect(s.writes).toHaveLength(1);
  expect(reopened.snapshot().job?.jobId).toBe(id(20));
});

it("lost start response preserves accepted job across reload and explicitly retries only that job", async () => {
  const s = setup();
  const first = s.session();
  await first.hydrate();
  s.control.lostStart = true;
  await first.submit("appropriations");
  expect(first.snapshot().retained?.accepted?.generationJobId).toBe(id(20));
  expect(first.snapshot().retained?.started).toBeUndefined();
  const reopened = s.session();
  await reopened.hydrate();
  expect(s.starts).toHaveBeenCalledTimes(1);
  expect(s.writes).toHaveLength(1);
  await reopened.submit("appropriations");
  expect(s.starts.mock.calls.map(([jobId]) => jobId)).toEqual([id(20), id(20)]);
  expect(s.writes).toHaveLength(1);
});

it("withholds mismatched canonical completed source but retains the exact accepted job", async () => {
  const s = setup();
  const first = s.session();
  await first.hydrate();
  s.control.complete = true;
  s.control.wrongRevision = true;
  await first.submit("appropriations");
  expect(first.snapshot().retained?.started).toBeTruthy();
  expect(first.snapshot().job).toBeUndefined();
  expect(first.snapshot().error).toMatch(/source changed/);
  s.control.wrongRevision = false;
  await first.refresh();
  expect(first.snapshot().job?.status).toBe("completed");
  expect(s.starts).toHaveBeenCalledTimes(1);
  expect(s.writes).toHaveLength(1);
});

it("never creates a new intent from a changed Objective or requested ready source", async () => {
  for (const changed of ["objective", "source"] as const) {
    const s = setup();
    const session = s.session();
    await session.hydrate();
    expect(session.snapshot().newSourceVerified).toBe(true);
    if (changed === "objective") s.control.objectiveVersion = 8;
    else s.control.source.requestedSource.revision.id = id(8);
    await session.submit("appropriations");
    expect(s.writes).toHaveLength(0);
    expect(session.snapshot().retained).toBeNull();
    expect(session.snapshot().newSourceVerified).toBe(false);
  }
});

it("persists the exact v2 wrapper before POST and replays it after a lost response", async () => {
  const s = setup();
  const first = s.session();
  await first.hydrate();
  expect(first.snapshot().ready).toBe(true);
  s.control.lostReply = true;
  await first.submit("appropriations");
  expect(first.snapshot().error).toMatch(/outcome is unconfirmed/);
  const original = structuredClone(s.writes[0]);
  if (!original) throw new Error("Expected a retained write");
  expect(original.body.command.requestId).not.toBe(
    original.body.selection.generationRequestId,
  );
  const reopened = s.session();
  await reopened.hydrate();
  expect(reopened.snapshot().retained?.request).toEqual(original);
  expect(s.writes).toHaveLength(1);
  await reopened.submit("coalition");
  expect(s.writes).toHaveLength(1);
  expect(reopened.snapshot().error).toMatch(/original Strategy type/);
  await reopened.submit("appropriations");
  expect(s.writes).toEqual([original, original]);
  expect(reopened.snapshot().retained?.accepted?.selection.type).toBe(
    "appropriations",
  );
  await reopened.submit("appropriations");
  expect(s.writes).toHaveLength(2);
  const [scope, encrypted] = [...db.records][0]!;
  const decoded = await decryptJournal(scope, encrypted);
  expect(decoded).toMatchObject({
    state: "pending",
    requestId: original.body.command.requestId,
  });
  expect(JSON.stringify([...db.records.values()])).not.toContain(
    "appropriations",
  );
});

it("serializes concurrent tabs under one saved request and one POST", async () => {
  const s = setup();
  const a = s.session();
  const b = s.session();
  await Promise.all([a.hydrate(), b.hydrate()]);
  await Promise.all([a.submit("procurement"), b.submit("procurement")]);
  expect(s.writes).toHaveLength(1);
  expect(a.snapshot().retained?.request).toEqual(
    b.snapshot().retained?.request,
  );
});

it("retains one intent across 409 or 503 and replays it even after the current source changes", async () => {
  for (const status of [409, 503]) {
    const s = setup();
    const a = s.session();
    await a.hydrate();
    s.control.status = status;
    await a.submit("regulatory");
    expect(s.writes).toHaveLength(1);
    expect(a.snapshot().retained).not.toBeNull();
    s.control.source.requestedSource.canonicalBindingVersion = 4;
    await a.submit("regulatory");
    expect(s.writes).toEqual([s.writes[0], s.writes[0]]);
    s.control.role = "readonly";
    await a.submit("regulatory");
    expect(s.writes).toHaveLength(2);
    s.control.role = "standard_user";
    s.control.clientStatus = "archived";
    await a.submit("regulatory");
    expect(s.writes).toHaveLength(2);
  }
});

it("keeps a replaced selection echo from becoming accepted", async () => {
  const s = setup();
  const a = s.session();
  await a.hydrate();
  s.control.replaceEcho = true;
  await a.submit("authorization");
  expect(a.snapshot().retained?.accepted).toBeUndefined();
  expect(s.writes).toHaveLength(1);
});

it("refuses to dispatch when encrypted recovery storage fails", async () => {
  const other = setup();
  const b = other.session();
  await b.hydrate();
  db.failWrite = true;
  await b.submit("authorization");
  expect(other.writes).toHaveLength(0);
  expect(b.snapshot().error).toMatch(/recovery is unavailable/);
});

it("disposal during authority verification cannot dispatch intake or start", async () => {
  const s = setup(),
    session = s.session();
  await session.hydrate();
  const held = barrier();
  s.control.pause = held.promise;
  const pending = session.submit("appropriations");
  session.suspend();
  held.resolve();
  await pending;
  expect(s.writes).toHaveLength(0);
  expect(s.starts).not.toHaveBeenCalled();
});
it("replacement actor cannot recover or start the original actor's saved job", async () => {
  const s = setup(),
    session = s.session();
  await session.hydrate();
  s.control.lostStart = true;
  await session.submit("appropriations");
  s.cache.setQueryData(["identity"], {
    user: { id: "replacement" },
    tenant: { id: actor.tenantId },
    role: "standard_user",
  });
  await session.submit("appropriations");
  expect(s.writes).toHaveLength(1);
  expect(s.starts).toHaveBeenCalledTimes(1);
});

it("pins completed Strategy output identity across reload before exposing a link", async () => {
  const s = setup(),
    session = s.session();
  await session.hydrate();
  s.control.complete = true;
  await session.submit("appropriations");
  expect(session.snapshot().job?.status).toBe("completed");
  s.control.wrongResult = true;
  const reopened = s.session();
  await reopened.hydrate();
  expect(reopened.snapshot().job).toBeUndefined();
  expect(reopened.snapshot().error).toMatch(/result changed/);
  expect(s.writes).toHaveLength(1);
  expect(s.starts).toHaveBeenCalledTimes(1);
});

it.each(["standard_user", "user_admin", "capiro_admin"])(
  "accepts the canonical Core writer role %s",
  async (role) => {
    const s = setup();
    s.control.role = role;
    const original = s.cache.getQueryData<Record<string, unknown>>([
      "identity",
    ]);
    s.cache.setQueryData(["identity"], { ...original, role });
    const session = s.session();
    await session.hydrate();
    await session.submit("appropriations");
    expect(s.writes).toHaveLength(1);
    expect(s.starts).toHaveBeenCalledTimes(1);
  },
);

it("does not add an active-only restriction to Core's non-archived client admission", async () => {
  const s = setup();
  s.control.clientStatus = "inactive";
  s.current.client = { ...s.current.client, status: "inactive" };
  const session = s.session();
  await session.hydrate();
  await session.submit("appropriations");
  expect(s.writes).toHaveLength(1);
});

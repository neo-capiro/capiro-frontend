import "./command-recovery-platform";
import { expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { objective as fixtureObjective } from "./browser/fixtures";
import { db, installPlatform } from "./command-recovery-platform";
import { decryptJournal } from "../src/shared/session/recovery/journal-crypto";
import { createCapiroApi } from "../src/shared/capiro/http";
import { capiroOperations } from "../src/shared/capiro/registry";
import type { ApiClient } from "../src/shared/portfolio/api/http";
import { createStrategyIntakeRecovery } from "../src/features/portfolio/objectives/objective-strategy-intake-recovery";
import { ObjectiveStrategyIntakeSession } from "../src/features/portfolio/objectives/objective-strategy-intake-session";
import { governedStrategyIntakeEnabled } from "../src/features/portfolio/objectives/ObjectiveStrategyIntake";
import { previewBackendRejection } from "../src/shared/preview/backend-policy.server";
import { requireInitialStrategyIntakeSource } from "../src/features/portfolio/objectives/objective-strategy-intake-source";
import type { GovernedObjectiveStrategyIntakeRequest } from "../src/shared/capiro/operations/objective-governed-strategy-intake";
import {
  governedObjectiveGenerationObservation,
  type GovernedObjectiveGenerationObservation,
} from "../src/shared/capiro/operations/objective-governed-generation";

installPlatform();
const id = (n: number) =>
  `00000000-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;
const actor = { tenantId: "synthetic-tenant", userId: "synthetic-actor" };
const client = { id: id(1), status: "active" };
const objective = {
  ...fixtureObjective,
  id: id(2),
  clientId: client.id,
  status: "ready" as const,
  version: 7,
  readyAt: "2026-10-17T11:00:00.000Z",
};
const source = governedObjectiveGenerationObservation.parse({
  schemaVersion: 1,
  clientId: client.id,
  objective: {
    id: objective.id,
    revision: { id: id(3), version: 7 },
    status: "ready",
  },
  workAction: "objective.strategy.draft",
  requestedSource: {
    revision: { id: id(3), version: 7 },
    canonicalBindingVersion: 3,
  },
  control: {
    version: 0,
    currentAuthorizationRequestId: null,
    cancelledAt: null,
  },
  consent: null,
  reconciliation: "outcome_unconfirmed",
  accounting: null,
  commandReceipt: null,
  observedAt: "2026-10-17T12:00:00.000Z",
});

function setup() {
  const cache = new QueryClient();
  const identity = {
    user: { id: actor.userId, email: null },
    tenant: { id: actor.tenantId, name: "Synthetic" },
    role: "standard_user",
  };
  cache.setQueryData(["identity"], identity);
  const current = { objective, client };
  const control = {
    lostReply: false,
    status: 200,
    role: "standard_user",
    clientStatus: "active",
    objectiveVersion: 7,
    source: structuredClone(source) as GovernedObjectiveGenerationObservation,
    replaceEcho: false,
  };
  const writes: GovernedObjectiveStrategyIntakeRequest[] = [];
  const core: ApiClient = {
    async request(_service, path, schema, options) {
      options?.signal?.throwIfAborted();
      const value: unknown =
        path === "me"
          ? { ...identity, role: control.role }
          : path === `clients/${client.id}`
            ? {
                id: client.id,
                name: "Synthetic client",
                profileStatus: "ACTIVE",
                status: control.clientStatus,
              }
            : path === `clients/${client.id}/objectives`
              ? [{ ...objective, version: control.objectiveVersion }]
              : (() => {
                  throw new Error(`Unexpected Core path: ${path}`);
                })();
      return schema.parse(value);
    },
  };
  const fetcher = vi.fn<typeof fetch>(async (url, init) => {
    const key = new URL(String(url), "https://example.invalid").pathname;
    if (key.endsWith("/objectives.governedGeneration.read"))
      return Response.json(control.source);
    if (!key.endsWith("/objectives.governedStrategy.intake"))
      throw new Error(`Unexpected Capiro operation: ${key}`);
    const request = JSON.parse(
      String(init?.body),
    ) as GovernedObjectiveStrategyIntakeRequest;
    writes.push(request);
    // The browser's encrypted record must precede the first network write.
    expect(db.records.size).toBe(1);
    if (control.status !== 200)
      return Response.json(
        { message: "Synthetic admission held." },
        { status: control.status },
      );
    const receipt = {
      schemaVersion: 2,
      commandReceipt: {
        schemaVersion: 1,
        receiptId: id(5),
        requestId: request.body.command.requestId,
        payloadDigest: "a".repeat(64),
        clientId: client.id,
        objectiveId: objective.id,
        command: "retry",
        workAction: "objective.strategy.draft",
        commandRevision: source.objective.revision,
        sourceRevision: source.requestedSource.revision,
        rootIntentId: id(6),
        controlVersionBefore: 0,
        controlVersionAfter: 1,
        targetAuthorizationRequestId: null,
        authorizationRequestId: id(7),
        consent: {
          id: id(7),
          confirmedAt: "2026-10-17T12:00:00.000Z",
          expiresAt: "2026-10-17T12:15:00.000Z",
        },
        outcome: "reconsent_recorded",
        committedAt: "2026-10-17T12:00:01.000Z",
      },
      selection: control.replaceEcho
        ? { ...request.body.selection, type: "coalition" }
        : request.body.selection,
    };
    control.source = {
      ...control.source,
      control: {
        ...control.source.control,
        version: 1,
        currentAuthorizationRequestId: id(7),
      },
      consent: { ...receipt.commandReceipt.consent, expired: false },
      observedAt: "2026-10-17T12:00:02.000Z",
    };
    if (control.lostReply) {
      control.lostReply = false;
      throw new TypeError("Synthetic lost response");
    }
    return Response.json(receipt);
  });
  const strategy = createCapiroApi(capiroOperations, { fetcher });
  const session = () =>
    new ObjectiveStrategyIntakeSession(
      strategy,
      current.objective,
      current.client,
      createStrategyIntakeRecovery(
        core,
        cache,
        actor,
        current.objective,
        () => current,
      ),
    );
  return { cache, current, control, writes, fetcher, session };
}

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

it("leaves the new UI off and the preview POST held", () => {
  expect(governedStrategyIntakeEnabled).toBe(false);
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

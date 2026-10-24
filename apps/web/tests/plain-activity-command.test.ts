import "./command-recovery-platform";
import { expect, it, vi } from "vitest";
import { installPlatform } from "./command-recovery-platform";
import { activityCommandInputSchema } from "../src/features/portfolio/client-profile/quick-log/command-contracts";
import { createApiClient } from "../src/shared/portfolio/api/http";
import {
  createActivityCommand,
  readActivityCommand,
  resumeActivityCommand,
} from "../src/features/portfolio/client-profile/quick-log/command-actions";
import {
  readCommandUndoSnapshot,
  type CommandUndoSnapshot,
} from "../src/features/portfolio/client-profile/quick-log/command-undo";
import {
  undoQuickLog,
  undoDigest,
} from "../src/features/portfolio/client-profile/quick-log/actions";
import {
  recoveryScope,
  retainedCommandContract,
} from "../src/features/portfolio/client-profile/quick-log/command-recovery";
import {
  readRecovery,
  reserveRecovery,
} from "../src/shared/session/recovery/journal";
import {
  commandActor,
  commandClientId,
  commandInput,
  commandReceipt,
} from "./activity-command-fixtures";

const input = {
  requestId: commandInput.requestId,
  activity: commandInput.activity,
};
const receipt = commandReceipt(input);
const context = { actor: commandActor, clientId: commandClientId, input };
const row = {
  ...input.activity,
  body: input.activity.body || null,
  id: receipt.activity.id,
  personId: null,
  occurredAt: "2026-10-24T10:00:00Z",
  dueAt: null,
  sourceType: "activity_command",
  sourceId: receipt.commandId,
  origin: "recorded",
  pinned: false,
  settledAt: null,
};
function fixture(response = receipt) {
  const calls: { path: string; method: string; body: unknown }[] = [];
  let rows: unknown[] = [row];
  let version = 0;
  const api = createApiClient(async (path, init) => {
    const method = init?.method ?? "GET";
    calls.push({
      path: String(path),
      method,
      body: init?.body ? JSON.parse(String(init.body)) : null,
    });
    if (String(path).endsWith("/undo")) {
      const current = rows.find(
        (value) => (value as typeof row).id === receipt.activity.id,
      );
      const revision = `2026-10-24T10:00:00.${String(version).padStart(6, "0")}Z`;
      const identity = {
        schemaVersion: 1,
        commandId: receipt.commandId,
        creationRequestId: receipt.requestId,
        tenantId: receipt.tenantId,
        actorUserId: receipt.actorUserId,
        clientId: commandClientId,
        activityId: receipt.activity.id,
      };
      if (method === "POST") {
        const submitted = JSON.parse(String(init?.body));
        if (submitted.expectedRevision !== revision)
          return new Response(
            JSON.stringify({ message: "The activity changed" }),
            { status: 409 },
          );
        const snapshot = {
          ...row,
          clientId: commandClientId,
          tenantId: receipt.tenantId,
          actorUserId: receipt.actorUserId,
          createdByUserId: receipt.actorUserId,
          creationRequestId: receipt.requestId,
          commandId: receipt.commandId,
          revision,
        };
        return new Response(
          JSON.stringify({
            ...identity,
            status: "removed",
            undo: {
              requestId: submitted.requestId,
              payloadDigest: await undoDigest({ snapshot, input: submitted }),
              removedAt: "2026-10-24T11:00:00.123456Z",
            },
          }),
          { status: 200 },
        );
      }
      return new Response(
        JSON.stringify(
          current
            ? { ...identity, status: "available", revision, activity: current }
            : { ...identity, status: "unavailable" },
        ),
        { status: 200 },
      );
    }
    return new Response(
      JSON.stringify(
        String(path).endsWith("activity?limit=500")
          ? rows
          : method === "DELETE"
            ? { ok: true }
            : response,
      ),
      { status: 200 },
    );
  });
  return {
    api,
    calls,
    rows: (value: unknown[]) => {
      rows = value;
      version++;
    },
  };
}
const signal = () => new AbortController().signal;
const guard = () => {};
const attempt = (snapshot: CommandUndoSnapshot) => ({
  snapshot,
  input: {
    schemaVersion: 1 as const,
    requestId: crypto.randomUUID(),
    activityId: snapshot.id,
    expectedRevision: snapshot.revision,
  },
});
installPlatform();

it("uses the existing command POST without any follow-up, assignee read or ordinary activity POST", async () => {
  const h = fixture();
  expect(
    await createActivityCommand(h.api, context, signal(), guard, guard),
  ).toEqual(receipt);
  expect(h.calls).toEqual([
    {
      path: `/api/backend/core/clients/${commandClientId}/activity-commands`,
      method: "POST",
      body: input,
    },
  ]);
});
it("recovers a plain activity with only its exact receipt GET", async () => {
  const h = fixture();
  expect(await readActivityCommand(h.api, context, signal(), guard)).toEqual(
    receipt,
  );
  expect(h.calls).toEqual([
    {
      path: `/api/backend/core/clients/${commandClientId}/activity-commands/${input.requestId}`,
      method: "GET",
      body: null,
    },
  ]);
});
it("never accepts a follow-up result for a plain command or resumes nonexistent follow-up work", async () => {
  const h = fixture(commandReceipt());
  await expect(
    readActivityCommand(h.api, context, signal(), guard),
  ).rejects.toThrow("unexpected response");
  const dispatched = vi.fn();
  await expect(
    resumeActivityCommand(h.api, context, receipt, signal(), guard, dispatched),
  ).rejects.toThrow("before resuming");
  expect(dispatched).not.toHaveBeenCalled();
});
it("keeps the original plain input across reload and a competing reservation in the existing scope", async () => {
  const scope = recoveryScope(commandActor, commandClientId) + ":plain-unit";
  const retained = { input, known: {} };
  await reserveRecovery(
    scope,
    input.requestId,
    retained,
    retainedCommandContract,
    guard,
  );
  const competing = {
    input: {
      ...input,
      requestId: crypto.randomUUID(),
      activity: { ...input.activity, body: "Different body" },
    },
    known: {},
  };
  expect(
    await reserveRecovery(
      scope,
      competing.input.requestId,
      competing,
      retainedCommandContract,
      guard,
    ),
  ).toEqual(retained);
  expect(await readRecovery(scope, retainedCommandContract, guard)).toEqual(
    retained,
  );
});
it("prepares Undo only for the exact command-owned current row and rechecks it before deletion", async () => {
  const h = fixture();
  h.rows([
    { ...row, id: crypto.randomUUID(), title: "Unrelated later item" },
    row,
  ]);
  const undo = await readCommandUndoSnapshot(
    h.api,
    context,
    receipt,
    signal(),
    guard,
  );
  expect(undo).toMatchObject({
    id: receipt.activity.id,
    sourceId: receipt.commandId,
    sourceType: "activity_command",
    tenantId: commandActor.tenantId,
    createdByUserId: commandActor.userId,
  });
  await undoQuickLog(h.api, attempt(undo!), commandActor, guard, signal());
  expect(h.calls.at(-1)).toMatchObject({
    method: "POST",
    path: `/api/backend/core/clients/${commandClientId}/activity-commands/${receipt.requestId}/undo`,
  });
});
it.each([
  { sourceId: crypto.randomUUID() },
  { sourceType: null },
  { origin: "derived" },
  { title: "Changed" },
  { body: "Changed" },
  { pinned: true },
  { settledAt: "2026-10-24T12:00:00Z" },
  { personId: crypto.randomUUID() },
  { dueAt: "2026-10-25T12:00:00Z" },
])("does not offer Undo for a changed current snapshot %j", async (change) => {
  const h = fixture();
  h.rows([{ ...row, ...change }]);
  expect(
    await readCommandUndoSnapshot(h.api, context, receipt, signal(), guard),
  ).toBeUndefined();
  expect(h.calls.every((call) => call.method === "GET")).toBe(true);
});
it("does not mistake a missing activity for a missing historical creation command", async () => {
  const h = fixture();
  h.rows([]);
  expect(await readActivityCommand(h.api, context, signal(), guard)).toEqual(
    receipt,
  );
  expect(
    await readCommandUndoSnapshot(h.api, context, receipt, signal(), guard),
  ).toBeUndefined();
});
it("rejects foreign command identity before preparing any Undo snapshot", async () => {
  const h = fixture();
  await expect(
    readCommandUndoSnapshot(
      h.api,
      context,
      { ...receipt, actorUserId: crypto.randomUUID() },
      signal(),
      guard,
    ),
  ).rejects.toThrow();
  expect(h.calls).toEqual([]);
});

it("retains rich commitment details and equivalent timestamp instants for prospective Undo", async () => {
  const rich = activityCommandInputSchema.parse({
    ...input,
    activity: {
      ...input.activity,
      kind: "commitment",
      occurredAt: "2025-01-15T10:30:00-05:00",
      dueAt: "2025-01-20T23:59:59-05:00",
      direction: "we_owe",
      counterparty: "Client counsel",
      objectiveId: "90000000-0000-4000-8000-000000000001",
      objectiveVersion: 3,
    },
  });
  const objective = {
    objectiveId: rich.activity.objectiveId,
    objectiveVersion: 3,
    objectiveRevisionId: "90000000-0000-4000-8000-000000000002",
    availability: "current",
  };
  const current = {
    ...row,
    ...rich.activity,
    occurredAt: "2025-01-15T15:30:00.000Z",
    dueAt: "2025-01-21T04:59:59.000Z",
    objective,
  };
  const h = fixture();
  h.rows([current]);
  const undo = await readCommandUndoSnapshot(
    h.api,
    { ...context, input: rich },
    receipt,
    signal(),
    guard,
  );
  expect(undo).toMatchObject({ direction: "we_owe", objective });
  h.rows([
    {
      ...current,
      objective: {
        ...objective,
        objectiveRevisionId: "90000000-0000-4000-8000-000000000003",
      },
    },
  ]);
  await expect(
    undoQuickLog(h.api, attempt(undo!), commandActor, guard, signal()),
  ).rejects.toThrow("activity changed");
  expect(h.calls.at(-1)?.method).toBe("POST");
});

it("rejects commitment-only details on a plain note before dispatch", () => {
  expect(
    activityCommandInputSchema.safeParse({
      ...input,
      activity: { ...input.activity, direction: "we_owe" },
    }).success,
  ).toBe(false);
});

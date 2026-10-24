import "./command-recovery-platform";
import { expect, it } from "vitest";
import { installPlatform, db, local } from "./command-recovery-platform";
import {
  commandActor as actor,
  commandClientId as clientId,
  commandInput,
  commandReceipt,
} from "./activity-command-fixtures";
import { createApiClient } from "../src/shared/portfolio/api/http";
import {
  runQuickLogUndo,
  undoDigest,
  undoQuickLog,
} from "../src/features/portfolio/client-profile/quick-log/actions";
import {
  undoRecoveryContract,
  undoRecoveryScope,
  type CommandUndoSnapshot,
  type UndoAttempt,
} from "../src/features/portfolio/client-profile/quick-log/command-undo";
import { readRecovery } from "../src/shared/session/recovery/journal";

installPlatform();
const creation = commandReceipt({
  requestId: commandInput.requestId,
  activity: commandInput.activity,
});
const snapshot: CommandUndoSnapshot = {
  id: creation.activity.id,
  clientId,
  tenantId: actor.tenantId,
  actorUserId: actor.userId,
  createdByUserId: actor.userId,
  kind: "note",
  title: "Synthetic saved note",
  body: "Private synthetic text",
  personId: null,
  occurredAt: "2026-10-24T10:00:00Z",
  dueAt: null,
  pinned: false,
  settledAt: null,
  sourceType: "activity_command",
  sourceId: creation.commandId,
  commandId: creation.commandId,
  creationRequestId: creation.requestId,
  revision: "2026-10-24T10:00:00.123456Z",
};
const identity = {
  schemaVersion: 1,
  commandId: creation.commandId,
  creationRequestId: creation.requestId,
  tenantId: actor.tenantId,
  actorUserId: actor.userId,
  clientId,
  activityId: snapshot.id,
};
const available = {
  ...identity,
  status: "available",
  revision: snapshot.revision,
  activity: { ...snapshot, origin: "recorded" },
};
const guard = () => {};
const signal = () => new AbortController().signal;
const scope = undoRecoveryScope(actor, clientId);
function fixture() {
  const state = {
    result: available as Record<string, unknown>,
    lose: "" as "" | "before" | "after",
    invalid: false,
    denied: false,
    conflict: false,
    calls: [] as { method: string; body: unknown }[],
    writes: 0,
  };
  const api = createApiClient(async (path, init) => {
    const method = init?.method ?? "GET";
    if (String(path).endsWith("/me"))
      return new Response(
        JSON.stringify({
          user: { id: actor.userId, email: null },
          tenant: { id: actor.tenantId, name: "Synthetic" },
          role: "standard_user",
        }),
      );
    if (String(path).endsWith(`/clients/${clientId}`))
      return new Response(JSON.stringify({ id: clientId }));
    expect(String(path)).toBe(
      `/api/backend/core/clients/${clientId}/activity-commands/${creation.requestId}/undo`,
    );
    state.calls.push({
      method,
      body: init?.body ? JSON.parse(String(init.body)) : null,
    });
    if (state.denied)
      return new Response(JSON.stringify({ message: "denied" }), {
        status: 403,
      });
    if (method === "POST") {
      if (state.lose === "before") throw Error("Synthetic loss before commit");
      if (state.conflict)
        return new Response(JSON.stringify({ message: "Activity changed" }), {
          status: 409,
        });
      const input = JSON.parse(String(init?.body));
      expect(
        await readRecovery(scope, undoRecoveryContract, guard),
      ).toMatchObject({ input });
      state.writes++;
      state.result = {
        ...identity,
        status: "removed",
        undo: {
          requestId: input.requestId,
          payloadDigest: await undoDigest({ snapshot, input }),
          removedAt: "2026-10-24T11:00:00.987654Z",
        },
      };
      if (state.lose === "after") throw Error("Synthetic loss after commit");
    }
    return new Response(
      JSON.stringify(
        state.invalid
          ? { ...state.result, actorUserId: crypto.randomUUID() }
          : state.result,
      ),
    );
  });
  return {
    api,
    state,
    run: (kind: "read" | "send" | "acknowledge", candidate = snapshot) =>
      runQuickLogUndo(api, actor, clientId, kind, signal(), guard, candidate),
  };
}
it("recovers response loss after commit without re-dispatch, then re-reads before acknowledgment", async () => {
  const h = fixture();
  h.state.lose = "after";
  await expect(h.run("send")).rejects.toThrow("loss after");
  const retained = await readRecovery(scope, undoRecoveryContract, guard);
  expect(retained?.snapshot).toMatchObject({
    id: snapshot.id,
    revision: snapshot.revision,
    commandId: snapshot.commandId,
  });
  expect(retained?.snapshot).not.toHaveProperty("body");
  expect(retained?.snapshot).not.toHaveProperty("title");
  expect(JSON.stringify([...local.values()])).not.toContain(snapshot.body);
  expect(JSON.stringify([...db.records.values()])).not.toContain(snapshot.body);
  expect((await h.run("read")).result?.status).toBe("removed");
  expect((await h.run("send")).result?.status).toBe("removed");
  expect(h.state.writes).toBe(1);
  expect(h.state.calls.filter((c) => c.method === "POST")).toHaveLength(1);
  h.state.invalid = true;
  await expect(h.run("acknowledge")).rejects.toThrow();
  expect(await readRecovery(scope, undoRecoveryContract, guard)).toEqual(
    retained,
  );
  h.state.invalid = false;
  await h.run("acknowledge");
  expect(await readRecovery(scope, undoRecoveryContract, guard)).toBeNull();
});
it("retains loss before commit and deliberately retries only the exact original input", async () => {
  const h = fixture();
  h.state.lose = "before";
  await expect(h.run("send")).rejects.toThrow("loss before");
  const retained = await readRecovery(scope, undoRecoveryContract, guard);
  expect((await h.run("read")).result?.status).toBe("available");
  h.state.lose = "";
  await h.run("send", { ...snapshot, title: "A different offered activity" });
  const posts = h.state.calls.filter((c) => c.method === "POST");
  expect(posts.map((c) => c.body)).toEqual([retained?.input, retained?.input]);
  expect(h.state.writes).toBe(1);
});
it("serializes two tabs/clicks into one write and one retained request", async () => {
  const h = fixture();
  const [first, second] = await Promise.all([h.run("send"), h.run("send")]);
  expect(first).toEqual(second);
  expect(h.state.writes).toBe(1);
});
it.each(["unavailable", "revision"])(
  "refuses %s before reserving or sending a new attempt",
  async (reason) => {
    const h = fixture();
    h.state.result =
      reason === "unavailable"
        ? { ...identity, status: "unavailable" }
        : { ...available, revision: "2026-10-24T10:00:00.123457Z" };
    await expect(h.run("send")).rejects.toThrow("changed or is unavailable");
    expect(await readRecovery(scope, undoRecoveryContract, guard)).toBeNull();
    expect(h.state.writes).toBe(0);
  },
);
it("keeps a concurrent edit refusal explicit and retained, without a fresh key", async () => {
  const h = fixture();
  h.state.conflict = true;
  await expect(h.run("send")).rejects.toThrow("Activity changed");
  const retained = await readRecovery(scope, undoRecoveryContract, guard);
  h.state.result = { ...identity, status: "unavailable" };
  expect((await h.run("read")).result?.status).toBe("unavailable");
  await expect(h.run("acknowledge")).rejects.toThrow("remains unconfirmed");
  expect(await readRecovery(scope, undoRecoveryContract, guard)).toEqual(
    retained,
  );
});
it("rejects foreign receipts, wrong digests and current authority loss without clearing recovery", async () => {
  const h = fixture();
  h.state.lose = "after";
  await expect(h.run("send")).rejects.toThrow();
  const retained = await readRecovery(scope, undoRecoveryContract, guard);
  h.state.invalid = true;
  await expect(h.run("read")).rejects.toThrow();
  h.state.invalid = false;
  const completed = structuredClone(h.state.result);
  h.state.result = {
    ...completed,
    undo: { ...(completed.undo as object), payloadDigest: "0".repeat(64) },
  };
  await expect(h.run("acknowledge")).rejects.toThrow("different attempt");
  h.state.result = completed;
  h.state.denied = true;
  await expect(h.run("read")).rejects.toThrow("denied");
  expect(await readRecovery(scope, undoRecoveryContract, guard)).toEqual(
    retained,
  );
});
it("refuses storage failure, foreign actor and aborted dispatch before POST", async () => {
  const h = fixture();
  db.failWrite = true;
  await expect(h.run("send")).rejects.toThrow("recovery is unavailable");
  expect(h.state.calls.filter((c) => c.method === "POST")).toHaveLength(0);
  const attempt: UndoAttempt = {
    snapshot,
    input: {
      schemaVersion: 1,
      requestId: crypto.randomUUID(),
      activityId: snapshot.id,
      expectedRevision: snapshot.revision,
    },
  };
  await expect(
    undoQuickLog(
      h.api,
      attempt,
      { ...actor, userId: crypto.randomUUID() },
      guard,
      signal(),
    ),
  ).rejects.toThrow("session");
  const controller = new AbortController();
  controller.abort();
  await expect(
    undoQuickLog(h.api, attempt, actor, guard, controller.signal),
  ).rejects.toThrow();
  expect(h.state.calls.filter((c) => c.method === "POST")).toHaveLength(0);
});

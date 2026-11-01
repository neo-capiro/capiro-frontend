import "./command-recovery-platform";
import { expect, it } from "vitest";
import { installPlatform, db } from "./command-recovery-platform";
import { createApiClient } from "../src/shared/portfolio/api/http";
import { readRecovery } from "../src/shared/session/recovery/journal";
import {
  createContract,
  createScope,
  runContactCreate,
} from "../src/features/portfolio/prospects/contacts/create-command";

installPlatform();
const actor = {
  tenantId: "00000000-0000-4000-8000-000000000001",
  userId: "00000000-0000-4000-8000-000000000002",
};
const prospectId = "00000000-0000-4000-8000-000000000003";
const values = {
  name: "Synthetic contact",
  title: "",
  email: "",
  phone: "",
  notes: "Synthetic private notes",
};
const guard = () => {};
const current = () =>
  readRecovery(createScope(actor, prospectId), createContract, guard);
function fixture() {
  const state = {
    posts: [] as Record<string, unknown>[],
    lose: false,
    rows: 0,
    status: 0,
    patch: {} as Record<string, unknown>,
    receipts: new Map<string, Record<string, unknown>>(),
  };
  const api = createApiClient(async (_url, options) => {
    if (state.status) return Response.json({}, { status: state.status });
    const body = JSON.parse(String(options?.body));
    state.posts.push(body);
    if (!state.receipts.has(body.requestId)) {
      state.rows++;
      state.receipts.set(body.requestId, {
        ...body,
        prospectId,
        id: "00000000-0000-4000-8000-000000000004",
        version: 1,
        createdAt: "2026-11-01T00:00:00Z",
        updatedAt: "2026-11-01T00:00:00Z",
      });
    }
    if (state.lose) {
      state.lose = false;
      throw new Error("Synthetic lost response after commit");
    }
    return Response.json({
      ...state.receipts.get(body.requestId),
      ...state.patch,
    });
  });
  const run = (
    action: Parameters<typeof runContactCreate>[3],
    signal = new AbortController().signal,
  ) =>
    runContactCreate(api, actor, prospectId, action, guard, signal, () => {});
  return { state, run, save: () => run({ kind: "save", values }) };
}

it("persists before dispatch and settles a matching native receipt", async () => {
  const f = fixture();
  expect(await f.save()).toMatchObject({ prospectId, name: values.name });
  expect(f.state.rows).toBe(1);
  expect(await current()).toBeNull();
});
it("recovers after remount without creating another request or row", async () => {
  const f = fixture();
  f.state.lose = true;
  await expect(f.save()).rejects.toThrow("lost response");
  const hydrated = await current();
  expect(hydrated).not.toBeNull();
  await expect(f.save()).rejects.toThrow("earlier contact");
  expect(f.state.posts).toHaveLength(1);
  await f.run({ kind: "retry", expected: structuredClone(hydrated!) });
  expect(f.state.posts).toHaveLength(2);
  expect(f.state.posts[1]).toEqual(f.state.posts[0]);
  expect(f.state.rows).toBe(1);
  expect(await current()).toBeNull();
});
it.each([400, 403, 404, 409, 422, 503])(
  "preserves an unknown command after later HTTP %s",
  async (status) => {
    const f = fixture();
    f.state.lose = true;
    await expect(f.save()).rejects.toThrow();
    const retained = await current();
    f.state.status = status;
    await expect(
      f.run({ kind: "retry", expected: retained! }),
    ).rejects.toThrow();
    expect(await current()).toEqual(retained);
  },
);
it("does not send if storage cannot retain the command", async () => {
  const f = fixture();
  db.failWrite = true;
  await expect(f.save()).rejects.toThrow();
  expect(f.state.posts).toHaveLength(0);
});
it("retains an editable first definite refusal and captures corrections before dispatch", async () => {
  const f = fixture();
  f.state.status = 403;
  await expect(f.save()).rejects.toThrow();
  const refused = await current();
  expect(refused?.editable).toBe(true);
  f.state.status = 0;
  const corrected = { ...values, name: "Corrected contact" };
  await f.run({ kind: "save", values: corrected, expected: refused! });
  expect(f.state.posts[0]).toMatchObject({
    name: corrected.name,
    requestId: refused!.requestId,
  });
  expect(await current()).toBeNull();
});
it("freezes a corrected submission that becomes unknown before a subsequent refusal", async () => {
  const f = fixture();
  f.state.status = 403;
  await expect(f.save()).rejects.toThrow();
  const refused = await current();
  f.state.status = 0;
  f.state.lose = true;
  await expect(
    f.run({
      kind: "save",
      values: { ...values, title: "Corrected" },
      expected: refused!,
    }),
  ).rejects.toThrow();
  const unknown = await current();
  expect(unknown?.editable).toBe(false);
  f.state.status = 403;
  await expect(f.run({ kind: "retry", expected: unknown! })).rejects.toThrow();
  expect(await current()).toEqual(unknown);
});
it("does not start a new request from a stale editable tab after settlement", async () => {
  const f = fixture();
  f.state.status = 403;
  await expect(f.save()).rejects.toThrow();
  const refused = await current();
  f.state.status = 0;
  await f.run({ kind: "save", values, expected: refused! });
  await expect(
    f.run({ kind: "save", values, expected: refused! }),
  ).rejects.toThrow();
  expect(f.state.posts).toHaveLength(1);
  expect(f.state.rows).toBe(1);
});
it("does not settle a wrong-prospect or wrong-request receipt", async () => {
  for (const patch of [
    { prospectId: actor.userId },
    { requestId: actor.userId },
  ]) {
    const f = fixture();
    const retained = await current();
    f.state.patch = patch;
    await expect(
      retained ? f.run({ kind: "retry", expected: retained }) : f.save(),
    ).rejects.toThrow();
    expect(await current()).not.toBeNull();
  }
});
it("accepts the current version from replay after a later edit", async () => {
  const f = fixture();
  f.state.lose = true;
  await expect(f.save()).rejects.toThrow();
  const retained = await current();
  f.state.patch = { name: "Edited later", version: 4 };
  expect(await f.run({ kind: "retry", expected: retained! })).toMatchObject({
    version: 4,
  });
  expect(await current()).toBeNull();
});
it("fences stale tab payloads and actor/prospect journals", async () => {
  const f = fixture();
  f.state.lose = true;
  await expect(f.save()).rejects.toThrow();
  const retained = await current();
  await expect(
    f.run({
      kind: "retry",
      expected: { ...retained!, values: { ...values, name: "Changed" } },
    }),
  ).rejects.toThrow("changed");
  expect(f.state.posts).toHaveLength(1);
  expect(
    await readRecovery(
      createScope({ ...actor, userId: prospectId }, prospectId),
      createContract,
      guard,
    ),
  ).toBeNull();
  expect(
    await readRecovery(createScope(actor, actor.userId), createContract, guard),
  ).toBeNull();
});
it("refuses an aborted retry without dispatching or forgetting the attempt", async () => {
  const f = fixture();
  f.state.lose = true;
  await expect(f.save()).rejects.toThrow();
  const retained = await current();
  const controller = new AbortController();
  controller.abort();
  await expect(
    f.run({ kind: "retry", expected: retained! }, controller.signal),
  ).rejects.toThrow();
  expect(f.state.posts).toHaveLength(1);
  expect(await current()).toEqual(retained);
});

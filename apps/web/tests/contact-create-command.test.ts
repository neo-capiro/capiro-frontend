import "./command-recovery-platform";
import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import { installPlatform, db } from "./command-recovery-platform";
import { createApiClient } from "../src/shared/portfolio/api/http";
import { readRecovery } from "../src/shared/session/recovery/journal";
import {
  contactCreateContract,
  contactCreateScope,
  runContactCreate,
  type ContactCreateAttempt,
} from "../src/features/portfolio/relationships/contact-create-command";
installPlatform();
const actor = {
  tenantId: "00000000-0000-4000-8000-000000000001",
  userId: "00000000-0000-4000-8000-000000000002",
};
const clientId = "00000000-0000-4000-8000-000000000003";
const personId = "00000000-0000-4000-8000-000000000004";
const values = {
  name: "  Synthetic contact  ",
  title: "Director",
  email: null,
  phone: "",
  role: "",
  notes: "Private synthetic draft",
};
const scope = contactCreateScope(actor, clientId);
const guard = () => {};
const current = () => readRecovery(scope, contactCreateContract, guard);
function fixture() {
  const state = {
    posts: [] as ContactCreateAttempt["input"][],
    rows: 0,
    receipts: new Map<string, Record<string, unknown>>(),
    lose: "" as "" | "before" | "after",
    status: 0,
    patch: {} as Record<string, unknown>,
    failAck: false,
    afterCommit: () => {},
  };
  const api = createApiClient(async (url, options) => {
    if (state.status)
      return Response.json(
        { message: "Synthetic denial" },
        { status: state.status },
      );
    const send = options?.method === "POST";
    let result: Record<string, unknown> | undefined;
    if (send) {
      const input = JSON.parse(
        String(options?.body),
      ) as ContactCreateAttempt["input"];
      state.posts.push(input);
      if (state.lose === "before") {
        state.lose = "";
        throw Error("Synthetic lost request");
      }
      const digest = createHash("sha256")
        .update(
          JSON.stringify([
            "client-person-create",
            1,
            actor.tenantId,
            actor.userId,
            clientId,
            input.requestId,
            input.name,
            input.title,
            input.email,
            input.phone,
            input.role,
            input.notes,
            input.lastContact,
          ]),
        )
        .digest("hex");
      result = state.receipts.get(input.requestId);
      if (result && result.payloadDigest !== digest)
        return Response.json({}, { status: 409 });
      if (!result) {
        state.rows++;
        result = {
          schemaVersion: 1,
          status: "completed",
          ...actor,
          actorUserId: actor.userId,
          clientId,
          requestId: input.requestId,
          payloadDigest: digest,
          personId,
          createdAt: "2026-10-24T12:00:00.000Z",
          available: true,
        };
        delete result.userId;
        state.receipts.set(input.requestId, result);
      }
      state.afterCommit();
      if (state.lose === "after") {
        state.lose = "";
        throw Error("Synthetic lost response");
      }
    } else result = state.receipts.get(String(url).split("/").at(-1)!);
    if (!result) return Response.json({}, { status: 404 });
    if (state.failAck) db.failWrite = true;
    return Response.json({ ...result, ...state.patch });
  });
  const run = (
    action: Parameters<typeof runContactCreate>[3],
    signal = new AbortController().signal,
  ) => runContactCreate(api, actor, clientId, action, guard, signal, () => {});
  return { state, run, save: () => run({ kind: "save", values }) };
}
it("saves normalized input, validates the scoped digest, and releases Add contact after completion", async () => {
  const f = fixture();
  expect(await f.save()).toMatchObject({ personId, available: true });
  expect(f.state.posts[0]).toMatchObject({
    ...values,
    name: "Synthetic contact",
    lastContact: null,
  });
  expect(await current()).toBeNull();
  await f.save();
  expect(f.state.rows).toBe(2);
  expect(f.state.posts[1]!.requestId).not.toBe(f.state.posts[0]!.requestId);
});
it("retains lost-before-commit intent across rehydration and retries its exact key and body", async () => {
  const f = fixture();
  f.state.lose = "before";
  await expect(f.save()).rejects.toThrow();
  const restored = (await current())!;
  await expect(
    f.run({ kind: "check", expected: restored }),
  ).rejects.toMatchObject({ status: 404 });
  expect(await current()).toEqual(restored);
  await expect(f.save()).rejects.toMatchObject({ status: 409 });
  await f.run({ kind: "retry", expected: restored });
  expect(f.state.posts).toEqual([restored.input, restored.input]);
  expect(f.state.rows).toBe(1);
  expect(await current()).toBeNull();
});
it("recovers a lost committed response by lookup without a second POST", async () => {
  const f = fixture();
  f.state.lose = "after";
  await expect(f.save()).rejects.toThrow();
  await f.run({ kind: "check", expected: (await current())! });
  expect(f.state.rows).toBe(1);
  expect(f.state.posts).toHaveLength(1);
  expect(await current()).toBeNull();
});
it.each(["tenantId", "actorUserId", "clientId", "requestId", "payloadDigest"])(
  "retains the original attempt on mismatched %s",
  async (field) => {
    const f = fixture();
    f.state.patch = {
      [field]: field === "payloadDigest" ? "a".repeat(64) : personId,
    };
    await expect(f.save()).rejects.toMatchObject({ status: 502 });
    expect(await current()).not.toBeNull();
    f.state.patch = {};
    await f.run({ kind: "check", expected: (await current())! });
    expect(await current()).toBeNull();
  },
);
it("serializes two tabs while uncertain and never replaces retained A with another draft", async () => {
  const f = fixture();
  f.state.lose = "after";
  const results = await Promise.allSettled([f.save(), f.save()]);
  expect(results.map((r) => r.status)).toEqual(["rejected", "rejected"]);
  expect(f.state.posts).toHaveLength(1);
  const saved = (await current())!;
  await expect(
    f.run({
      kind: "retry",
      expected: { ...saved, input: { ...saved.input, name: "Draft B" } },
    }),
  ).rejects.toMatchObject({ status: 409 });
  expect(f.state.posts).toHaveLength(1);
  await f.run({ kind: "retry", expected: saved });
  expect(f.state.posts[1]).toEqual(saved.input);
  expect(f.state.rows).toBe(1);
});
it("retains denial and interrupted-session outcomes and recovers after session renewal", async () => {
  const f = fixture();
  const controller = new AbortController();
  f.state.afterCommit = () => controller.abort();
  await expect(
    f.run({ kind: "save", values }, controller.signal),
  ).rejects.toThrow();
  const saved = (await current())!;
  f.state.status = 403;
  await expect(f.run({ kind: "check", expected: saved })).rejects.toMatchObject(
    { status: 403 },
  );
  expect(await current()).toEqual(saved);
  f.state.status = 0;
  await f.run({ kind: "check", expected: saved });
  expect(await current()).toBeNull();
});
it("does not dispatch on storage failure and preserves committed completion if acknowledgement fails", async () => {
  const f = fixture();
  db.failWrite = true;
  await expect(f.save()).rejects.toThrow();
  expect(f.state.posts).toHaveLength(0);
});
it("recovers a failed acknowledgement without recreating the contact", async () => {
  const f = fixture();
  f.state.failAck = true;
  await expect(f.save()).rejects.toThrow();
  db.failWrite = false;
  f.state.failAck = false;
  await f.run({ kind: "check", expected: (await current())! });
  expect(f.state.rows).toBe(1);
  expect(await current()).toBeNull();
});
it("accepts historical completion after removal without restoring the contact", async () => {
  const f = fixture();
  f.state.lose = "after";
  await expect(f.save()).rejects.toThrow();
  f.state.patch = { available: false };
  expect(
    await f.run({ kind: "check", expected: (await current())! }),
  ).toMatchObject({ available: false });
  expect(f.state.posts).toHaveLength(1);
  expect(await current()).toBeNull();
});
it("rejects local invalid input before reserving an attempt", async () => {
  const f = fixture();
  await expect(
    f.run({ kind: "save", values: { ...values, name: " " } }),
  ).rejects.toThrow();
  expect(await current()).toBeNull();
  expect(f.state.posts).toHaveLength(0);
});

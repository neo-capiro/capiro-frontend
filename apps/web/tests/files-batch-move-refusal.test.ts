import "./command-recovery-platform";
import { db, installPlatform } from "./command-recovery-platform";
import { QueryClient } from "@tanstack/react-query";
import { expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { createApiClient } from "../src/shared/portfolio/api/http";
import { decryptJournal } from "../src/shared/session/recovery/journal-crypto";
import { batchMoveRecovery } from "../src/features/portfolio/files/batch-move-recovery";
import { attachmentSchema } from "../src/features/portfolio/files/contracts";
import {
  batchMoveCommand,
  batchMoveKey,
  moveFileBatch,
} from "../src/features/portfolio/files/batch-move";
import {
  assertFileReader,
  currentFileReader,
  currentFilesKey,
} from "../src/features/portfolio/files/file-reader";
import { clientId, file } from "./browser/fixtures";

installPlatform();
const testIdentity = {
  user: { id: "synthetic-user", email: "synthetic@example.test" },
  tenant: { id: "synthetic-tenant", name: "Synthetic" },
  role: "standard_user",
};
function setup(
  options: {
    lost?: boolean;
    patch?: object;
    httpStatus?: number;
    denyFresh?: boolean;
    freshIdentity?: object;
  } = {},
) {
  const cache = new QueryClient();
  cache.setQueryData(["identity"], testIdentity);
  const files = [attachmentSchema.parse({ ...file, metadataRevision: 3 })];
  cache.setQueryData(currentFilesKey(cache, clientId), files);
  const command = batchMoveCommand(clientId, files, "Reviewed");
  const digest = createHash("sha256")
    .update(JSON.stringify(command))
    .digest("hex");
  const refusal = {
    schemaVersion: 1,
    code: "FILE_BATCH_MOVE_REFUSED",
    requestId: command.requestId,
    clientId,
    payloadDigest: digest,
    status: 409,
    message: "Core refused this saved move.",
    ...options.patch,
  };
  const actor = currentFileReader(cache)!;
  const controller = new AbortController();
  const execution = {
    actor,
    signal: controller.signal,
    guard() {
      controller.signal.throwIfAborted();
      assertFileReader(cache, actor);
    },
  };
  const calls: string[] = [];
  const fetcher = vi.fn<typeof fetch>(async (url, init) => {
    const path = String(url);
    calls.push(`${init?.method} ${path}`);
    if (path.endsWith("/me"))
      return Response.json(options.freshIdentity ?? testIdentity);
    if (path.includes("engagement/attachments?"))
      return Response.json(options.denyFresh ? { message: "No access" } : [], {
        status: options.denyFresh ? 403 : 200,
      });
    if (options.lost && init?.method === "POST")
      throw new Error("lost response");
    return Response.json(refusal, { status: options.httpStatus ?? 409 });
  });
  const api = createApiClient(fetcher);
  const key = batchMoveKey(clientId, actor);
  const run = (input: Parameters<typeof moveFileBatch>[4]) =>
    moveFileBatch(api, cache, clientId, execution, input);
  return {
    cache,
    actor,
    controller,
    execution,
    command,
    refusal,
    api,
    key,
    run,
    calls,
    fetcher,
    recovery: batchMoveRecovery(clientId, actor, execution.guard),
  };
}

it.each([false, true])(
  "retains terminal refusal across reload and explicitly retires only after fresh reads (lost initial=%s)",
  async (lost) => {
    const s = setup({ lost });
    await expect(s.run({ command: s.command })).rejects.toThrow();
    if (lost) await expect(s.run({ recover: "receipt" })).rejects.toThrow();
    expect((await s.recovery.load())?.refusal).toEqual(s.refusal);
    const reloaded = new QueryClient();
    reloaded.setQueryData(s.key, await s.recovery.load());
    const heldCalls = s.calls.length;
    await expect(
      moveFileBatch(s.api, reloaded, clientId, s.execution, {
        recover: "retry",
      }),
    ).rejects.toThrow(/refused/);
    expect(s.calls).toHaveLength(heldCalls);
    await moveFileBatch(s.api, reloaded, clientId, s.execution, {
      recover: "retire-refusal",
    });
    expect(s.calls.slice(-2).map((call) => call.split(" ")[0])).toEqual([
      "GET",
      "GET",
    ]);
    expect(s.calls.at(-2)).toContain("/me");
    expect(s.calls.at(-1)).toContain("engagement/attachments?");
    expect(await s.recovery.load()).toBeNull();
    const [scope, encrypted] = [...db.records][0]!;
    expect(await decryptJournal(scope, encrypted)).toMatchObject({
      state: "refused",
      code: "FILE_BATCH_MOVE_REFUSED",
      requestId: s.command.requestId,
    });
    expect(reloaded.getQueryData(s.key)).toBeNull();
    // The older view reconciles only this exact durable disposition; no HTTP or repeated write.
    const settledCalls = s.calls.length;
    await expect(s.run({ recover: "receipt" })).rejects.toThrow();
    expect(s.calls).toHaveLength(settledCalls);
    expect(s.cache.getQueryData(s.key)).toBeNull();
  },
);

it.each([
  { patch: { requestId: "10000000-0000-4000-8000-000000000099" } },
  { patch: { clientId: "10000000-0000-4000-8000-000000000099" } },
  { patch: { payloadDigest: "a".repeat(64) } },
  { patch: { status: 400 } },
  { patch: { schemaVersion: 2 } },
  { patch: { extra: true } },
  { patch: { message: "x".repeat(501) } },
  { httpStatus: 500 },
])(
  "a malformed or unbound refusal cannot retire uncertainty %j",
  async (options) => {
    const s = setup(options);
    await expect(s.run({ command: s.command })).rejects.toThrow();
    expect((await s.recovery.load())?.refusal).toBeUndefined();
    const count = s.calls.length;
    await expect(s.run({ recover: "retire-refusal" })).rejects.toThrow();
    expect(s.calls).toHaveLength(count);
    expect(await s.recovery.load()).toMatchObject({ command: s.command });
  },
);

it("fresh authority/file failure preserves the saved refusal without POST", async () => {
  const s = setup({ denyFresh: true });
  await expect(s.run({ command: s.command })).rejects.toThrow();
  await expect(s.run({ recover: "retire-refusal" })).rejects.toThrow(
    "No access",
  );
  expect((await s.recovery.load())?.refusal).toEqual(s.refusal);
  expect(s.calls.filter((call) => call.startsWith("POST"))).toHaveLength(1);
});

it.each([
  { ...testIdentity, user: { id: "replacement", email: "other@example.test" } },
  { ...testIdentity, role: "read_only" },
])(
  "fresh Core identity or writer loss cannot retire a saved refusal",
  async (freshIdentity) => {
    const s = setup({ freshIdentity });
    await expect(s.run({ command: s.command })).rejects.toThrow();
    await expect(s.run({ recover: "retire-refusal" })).rejects.toThrow(
      /current Core session/,
    );
    expect((await s.recovery.load())?.refusal).toEqual(s.refusal);
    expect(s.calls).toHaveLength(2);
  },
);

it("actor loss after refused disposition is durable does not restore the original cache or adopt into another scope", async () => {
  const s = setup();
  await expect(s.run({ command: s.command })).rejects.toThrow();
  db.beforeRead = async () => {
    for (const [scope, encrypted] of db.records) {
      if ((await decryptJournal(scope, encrypted)).state === "refused")
        s.controller.abort();
    }
  };
  await expect(s.run({ recover: "retire-refusal" })).rejects.toThrow();
  expect(s.cache.getQueryData(s.key)).toBeNull();
});

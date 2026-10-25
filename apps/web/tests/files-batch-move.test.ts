import "./command-recovery-platform";
import { installPlatform, db, local } from "./command-recovery-platform";
import { decryptJournal } from "../src/shared/session/recovery/journal-crypto";
import { batchMoveRecovery } from "../src/features/portfolio/files/batch-move-recovery";
import { createHash } from "node:crypto";
import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { createApiClient } from "../src/shared/portfolio/api/http";
import { assertClientWriter } from "../src/shared/portfolio/auth/client-writer";
import {
  assertFileReader,
  currentFileReader,
  currentFilesKey,
} from "../src/features/portfolio/files/file-reader";
import {
  batchMoveCommand,
  batchMoveKey,
  moveFileBatch,
  type BatchMoveCommand,
} from "../src/features/portfolio/files/batch-move";
import {
  attachmentSchema,
  clientFilesSchema,
} from "../src/features/portfolio/files/contracts";
import { clientId, file as fixture } from "./browser/fixtures";

installPlatform();
const file = attachmentSchema.parse(fixture);
const files = [
  { ...file, metadataRevision: 3 },
  { ...file, id: "60000000-0000-4000-8000-000000000002", metadataRevision: 9 },
];
const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), { status });
const receipt = (command: BatchMoveCommand) => ({
  schemaVersion: 1,
  requestId: command.requestId,
  clientId,
  payloadDigest: createHash("sha256")
    .update(JSON.stringify(command))
    .digest("hex"),
  outcome: "moved",
  committedAt: "2026-10-24T12:00:00Z",
  files: command.files.map((entry) => ({
    id: entry.id,
    previousRevision: entry.expectedRevision,
    revision: entry.expectedRevision + 1,
    folder: command.folder,
  })),
});
function setup(
  respond?: (
    command: BatchMoveCommand,
    method: string,
  ) => Response | Promise<Response>,
) {
  const cache = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  cache.setQueryData(["identity"], {
    user: { id: "synthetic-user", email: "synthetic@example.test" },
    tenant: { id: "synthetic-tenant", name: "Synthetic" },
    role: "standard_user",
  });
  cache.setQueryData(currentFilesKey(cache, clientId), files);
  const actor = currentFileReader(cache)!;
  const controller = new AbortController();
  const execution = {
    actor,
    signal: controller.signal,
    guard() {
      controller.signal.throwIfAborted();
      assertFileReader(cache, actor);
      assertClientWriter(cache, actor);
    },
  };
  const command = batchMoveCommand(
    clientId,
    [...files].reverse(),
    " Reviewed ",
  );
  const fetcher = vi.fn(
    async (_url: RequestInfo | URL, options?: RequestInit) => {
      const body = options?.body ? JSON.parse(String(options.body)) : command;
      return respond
        ? respond(body, options?.method ?? "GET")
        : json(receipt(body));
    },
  );
  const api = createApiClient(fetcher);
  const run = (
    input: { command: BatchMoveCommand } | { recover: "receipt" | "retry" },
  ) => moveFileBatch(api, cache, clientId, execution, input);
  const key = batchMoveKey(clientId, actor);
  return {
    command,
    actor,
    execution,
    api,
    cache,
    fetcher,
    controller,
    key,
    run,
    save: () => run({ command }),
  };
}
describe("Core atomic file move caller", () => {
  it("retains producer revisions and sends one sorted normalized command for the exact selection", async () => {
    expect(
      clientFilesSchema(clientId)
        .parse(files)
        .map((file) => file.metadataRevision),
    ).toEqual([3, 9]);
    const s = setup();
    await s.save();
    expect(s.fetcher).toHaveBeenCalledTimes(1);
    expect(s.fetcher.mock.calls[0]?.[0]).toBe(
      `/api/backend/core/clients/${clientId}/files/batch-moves`,
    );
    expect(JSON.parse(String(s.fetcher.mock.calls[0]?.[1]?.body))).toEqual(
      s.command,
    );
    expect(s.command.folder).toBe("Reviewed");
    expect(s.cache.getQueryData(s.key)).toBeNull();
  });
  it.each(["missing", "stale", "client"])(
    "refuses %s selection before dispatch",
    async (boundary) => {
      const s = setup();
      s.cache.setQueryData(
        currentFilesKey(s.cache, clientId),
        boundary === "missing"
          ? files.slice(0, 1)
          : files.map((file, i) =>
              i
                ? file
                : {
                    ...file,
                    ...(boundary === "stale"
                      ? { metadataRevision: 4 }
                      : { clientId: "10000000-0000-4000-8000-000000000099" }),
                  },
            ),
      );
      await expect(s.save()).rejects.toMatchObject({ status: 409 });
      expect(s.fetcher).not.toHaveBeenCalled();
    },
  );
  it("refuses unknown revisions, duplicates, excess count and another client when preparing", () => {
    for (const selection of [
      [file],
      [files[0]!, files[0]!],
      Array.from({ length: 101 }, () => files[0]!),
      [{ ...files[0]!, clientId: "other" }],
    ])
      expect(() => batchMoveCommand(clientId, selection, null)).toThrow();
  });
  it.each(["ids", "folder", "revision", "digest", "client", "request"])(
    "does not accept a contradictory %s receipt",
    async (kind) => {
      const s = setup((command) => {
        const value = receipt(command);
        if (kind === "ids") value.files.reverse();
        if (kind === "folder") value.files[0]!.folder = "Wrong";
        if (kind === "revision") value.files[0]!.previousRevision++;
        if (kind === "digest") value.payloadDigest = "a".repeat(64);
        if (kind === "client")
          value.clientId = "10000000-0000-4000-8000-000000000099";
        if (kind === "request")
          value.requestId = "10000000-0000-4000-8000-000000000099";
        return json(value);
      });
      await expect(s.save()).rejects.toMatchObject({ status: 502 });
      expect(s.cache.getQueryData(s.key)).toMatchObject({
        status: "unknown",
        command: s.command,
      });
      await expect(s.save()).rejects.toMatchObject({ status: 409 });
      expect(s.fetcher).toHaveBeenCalledTimes(1);
    },
  );
  it("a lost response retains exact command; GET404 cannot clear uncertainty and retry reuses it after revisions advance", async () => {
    let count = 0;
    const s = setup((command, method) => {
      count++;
      if (count === 1) throw new Error("lost response");
      return method === "GET"
        ? json({ message: "No receipt yet" }, 404)
        : json(receipt(command));
    });
    await expect(s.save()).rejects.toThrow("lost response");
    await expect(s.run({ recover: "receipt" })).rejects.toMatchObject({
      status: 404,
    });
    expect(s.cache.getQueryData(s.key)).toMatchObject({ status: "unknown" });
    s.cache.setQueryData(
      currentFilesKey(s.cache, clientId),
      files.map((file) => ({
        ...file,
        metadataRevision: file.metadataRevision + 1,
      })),
    );
    await s.run({ recover: "retry" });
    expect(s.fetcher.mock.calls[2]?.[1]?.body).toBe(
      s.fetcher.mock.calls[0]?.[1]?.body,
    );
    expect(s.fetcher.mock.calls[1]?.[0]).toBe(
      `/api/backend/core/clients/${clientId}/files/batch-moves/${s.command.requestId}`,
    );
    expect(s.cache.getQueryData(s.key)).toBeNull();
  });
  it("a complete GET receipt settles the original move without another write", async () => {
    let first = true;
    const s = setup((command) => {
      if (first) {
        first = false;
        throw new Error("lost");
      }
      return json(receipt(command));
    });
    await expect(s.save()).rejects.toThrow();
    await s.run({ recover: "receipt" });
    expect(s.fetcher.mock.calls.map((call) => call[1]?.method)).toEqual([
      "POST",
      "GET",
    ]);
    expect(s.cache.getQueryData(s.key)).toBeNull();
  });
  it("locks the attempt before asynchronous hashing or dispatch", async () => {
    const s = setup();
    const first = s.save();
    await expect(s.save()).rejects.toMatchObject({ status: 409 });
    await first;
    expect(s.fetcher).toHaveBeenCalledTimes(1);
  });
  it.each(["abort", "actor"])(
    "does not settle a late receipt after %s replacement",
    async (boundary) => {
      let release!: (value: Response) => void;
      const s = setup(
        () =>
          new Promise((resolve) => {
            release = resolve;
          }),
      );
      const saving = s.save();
      await vi.waitFor(() => expect(release).toBeTypeOf("function"));
      if (boundary === "abort") s.controller.abort();
      else
        s.cache.setQueryData(["identity"], {
          user: { id: "replacement", email: "synthetic@example.test" },
          tenant: { id: "synthetic-tenant", name: "Synthetic" },
          role: "standard_user",
        });
      release(json(receipt(s.command)));
      await expect(saving).rejects.toBeInstanceOf(Error);
      expect(s.cache.getQueryData(s.key)).toMatchObject({
        status: "unknown",
        command: s.command,
      });
      expect(
        s.cache.getQueryData(
          batchMoveKey(clientId, {
            tenantId: "synthetic-tenant",
            userId: "replacement",
          }),
        ),
      ).toBeUndefined();
    },
  );
  it("an untyped refusal retains the exact command because it cannot retire earlier uncertainty", async () => {
    const s = setup(() => json({ message: "A selected file changed" }, 409));
    await expect(s.save()).rejects.toMatchObject({ status: 409 });
    expect(s.cache.getQueryData(s.key)).toMatchObject({
      status: "unknown",
      command: s.command,
    });
  });
});

it("hard reload restores the exact encrypted command before any new move and needs no current file revision for receipt lookup", async () => {
  const first = setup(() => {
    throw new Error("lost");
  });
  await expect(first.save()).rejects.toThrow();
  const second = setup();
  second.cache.setQueryData(currentFilesKey(second.cache, clientId), []);
  const recovery = batchMoveRecovery(
    clientId,
    second.actor,
    second.execution.guard,
  );
  expect(await recovery.load()).toMatchObject({
    command: first.command,
    status: "unknown",
  });
  await expect(second.save()).rejects.toMatchObject({ status: 409 });
  expect(second.fetcher).not.toHaveBeenCalled();
  const api = createApiClient(async () => json(receipt(first.command)));
  await moveFileBatch(api, second.cache, clientId, second.execution, {
    recover: "receipt",
  });
  expect(await recovery.load()).toBeNull();
  expect(JSON.stringify([...db.records.values()])).not.toContain("Reviewed");
});
it("retains a received late validated receipt only under its original actor across reload", async () => {
  let release!: (v: Response) => void;
  const first = setup(
    () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  );
  const pending = first.save();
  await vi.waitFor(() => expect(release).toBeTypeOf("function"));
  first.cache.setQueryData(["identity"], {
    user: { id: "other" },
    tenant: { id: "synthetic-tenant" },
    role: "standard_user",
  });
  release(json(receipt(first.command)));
  await expect(pending).rejects.toThrow();
  const second = setup();
  const saved = await batchMoveRecovery(
    clientId,
    second.actor,
    second.execution.guard,
  ).load();
  expect(saved?.receipt).toEqual(receipt(first.command));
  const [scope, encrypted] = [...db.records][0]!;
  expect(await decryptJournal(scope, encrypted)).toMatchObject({
    state: "pending",
    data: { command: first.command, receipt: receipt(first.command) },
  });
});
it("storage failure stops dispatch and keeps recovery blocked", async () => {
  const s = setup();
  db.failWrite = true;
  await expect(s.save()).rejects.toThrow(/recovery is unavailable/);
  expect(s.fetcher).not.toHaveBeenCalled();
  db.failWrite = false;
  await expect(
    batchMoveRecovery(clientId, s.actor, s.execution.guard).load(),
  ).rejects.toThrow(/recovery is unavailable/);
});

it("a second view clears its original cached hold only after the same command was durably acknowledged", async () => {
  const first = setup(() => {
    throw new Error("lost");
  });
  await expect(first.save()).rejects.toThrow("lost");
  const second = setup();
  await moveFileBatch(
    createApiClient(async () => json(receipt(first.command))),
    second.cache,
    clientId,
    second.execution,
    { recover: "receipt" },
  );
  first.fetcher.mockClear();
  await expect(first.run({ recover: "receipt" })).rejects.toMatchObject({
    status: 409,
  });
  expect(first.fetcher).not.toHaveBeenCalled();
  expect(first.cache.getQueryData(first.key)).toBeNull();
});

it("a stale exact-retry click adopts a different durable move without dispatching it", async () => {
  const first = setup(() => {
    throw new Error("lost first");
  });
  await expect(first.save()).rejects.toThrow("lost first");
  const second = setup();
  await moveFileBatch(
    createApiClient(async () => json(receipt(first.command))),
    second.cache,
    clientId,
    second.execution,
    { recover: "receipt" },
  );
  const third = setup(() => {
    throw new Error("lost next");
  });
  await expect(third.save()).rejects.toThrow("lost next");
  first.fetcher.mockClear();
  await expect(first.run({ recover: "retry" })).rejects.toThrow(
    /changed in another view/,
  );
  expect(first.fetcher).not.toHaveBeenCalled();
  expect(first.cache.getQueryData(first.key)).toMatchObject({
    status: "unknown",
    command: third.command,
  });
  const fetcher = vi.fn<typeof fetch>(async () => json(receipt(third.command)));
  await moveFileBatch(
    createApiClient(fetcher),
    first.cache,
    clientId,
    first.execution,
    { recover: "retry" },
  );
  expect(JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body))).toEqual(
    third.command,
  );
});

it.each(["absent", "inconsistent"])(
  "%s storage never proves a cached uncertain move was acknowledged",
  async (state) => {
    const s = setup(() => {
      throw new Error("lost");
    });
    await expect(s.save()).rejects.toThrow();
    db.records.clear();
    if (state === "absent") local.clear();
    s.fetcher.mockClear();
    await expect(s.run({ recover: "receipt" })).rejects.toThrow();
    expect(s.fetcher).not.toHaveBeenCalled();
    expect(s.cache.getQueryData(s.key)).toMatchObject({
      status: "unknown",
      command: s.command,
    });
  },
);

it("another command's acknowledgment never clears the cached original command", async () => {
  const first = setup(() => {
    throw new Error("lost");
  });
  await expect(first.save()).rejects.toThrow();
  const second = setup();
  await moveFileBatch(
    createApiClient(async () => json(receipt(first.command))),
    second.cache,
    clientId,
    second.execution,
    { recover: "receipt" },
  );
  await second.save();
  first.fetcher.mockClear();
  await expect(first.run({ recover: "receipt" })).rejects.toThrow();
  expect(first.fetcher).not.toHaveBeenCalled();
  expect(first.cache.getQueryData(first.key)).toMatchObject({
    status: "unknown",
    command: first.command,
  });
});

it.each(["abort", "actor"])(
  "does not restore an acknowledged cache entry if %s authority is lost after its durable write",
  async (boundary) => {
    const s = setup();
    db.beforeRead = async () => {
      for (const [scope, encrypted] of db.records) {
        if ((await decryptJournal(scope, encrypted)).state !== "acknowledged")
          continue;
        if (boundary === "abort") s.controller.abort();
        else
          s.cache.setQueryData(["identity"], {
            user: { id: "replacement", email: "synthetic@example.test" },
            tenant: { id: "synthetic-tenant", name: "Synthetic" },
            role: "standard_user",
          });
      }
    };
    await expect(s.save()).rejects.toThrow();
    expect(s.cache.getQueryData(s.key)).toBeNull();
    expect(
      s.cache.getQueryData(
        batchMoveKey(clientId, {
          tenantId: "synthetic-tenant",
          userId: "replacement",
        }),
      ),
    ).toBeUndefined();
    expect(s.fetcher).toHaveBeenCalledTimes(1);
  },
);

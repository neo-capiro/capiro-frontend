import {
  installPlatform,
  db,
  local,
  barrier,
} from "./command-recovery-platform";
import { QueryClient } from "@tanstack/react-query";
import { createHash } from "node:crypto";
import { expect, it, vi } from "vitest";
import { createApiClient } from "../src/shared/portfolio/api/http";
import {
  assertFileReader,
  currentFileReader,
  currentFilesKey,
} from "../src/features/portfolio/files/file-reader";
import { attachmentSchema } from "../src/features/portfolio/files/contracts";
import {
  fileAccessCommand,
  fileAccessDigest,
  fileAccessKey,
  fileAccessOutcomeSchema,
  type FileAccessCommand,
  type FileAccessOutcome,
} from "../src/features/portfolio/files/file-access-command";
import { fileAccessRecovery } from "../src/features/portfolio/files/file-access-recovery";
import {
  saveFileAccess,
  type FileAccessInput,
} from "../src/features/portfolio/files/folder-access";
import { clientId, file } from "./browser/fixtures";
installPlatform();
const files = [
  attachmentSchema.parse({ ...file, folder: "Reports", metadataRevision: 3 }),
  attachmentSchema.parse({
    ...file,
    id: "60000000-0000-4000-8000-000000000002",
    folder: "Reports",
    metadataRevision: 9,
  }),
];
const identity = {
  user: { id: "synthetic-user", email: null },
  tenant: { id: "synthetic-tenant", name: "Synthetic" },
  role: "standard_user",
};
function setup(
  respond?: (
    command: FileAccessCommand,
    url: string,
    method: string,
  ) => Response | Promise<Response>,
) {
  const cache = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  cache.setQueryData(["identity"], identity);
  cache.setQueryData(currentFilesKey(cache, clientId), files);
  const actor = currentFileReader(cache)!;
  const abort = new AbortController();
  const execution = {
    actor,
    signal: abort.signal,
    guard() {
      abort.signal.throwIfAborted();
      assertFileReader(cache, actor);
    },
  };
  const command = fileAccessCommand(
    clientId,
    "folder-access",
    "Reports",
    [...files].reverse(),
    "restricted",
    [],
  );
  const outcome = (cmd = command, refused = false): FileAccessOutcome => ({
    schemaVersion: 1,
    tenantId: actor.tenantId,
    actorUserId: actor.userId,
    requestId: cmd.requestId,
    clientId,
    payloadDigest: createHash("sha256")
      .update(
        JSON.stringify(["file-access", 1, actor.tenantId, actor.userId, cmd]),
      )
      .digest("hex"),
    operation: cmd.operation,
    status: refused ? "refused" : "completed",
    result: refused
      ? null
      : {
          files: cmd.files.map((entry) => ({
            id: entry.id,
            previousRevision: entry.expectedRevision,
            revision: entry.expectedRevision + 1,
          })),
        },
    refusal: refused
      ? { code: "FILE_ACCESS_REFUSED", message: "Review current files." }
      : null,
    createdAt: "2026-10-25T00:00:00.000Z",
  });
  const fetcher = vi.fn(
    async (url: RequestInfo | URL, options?: RequestInit) => {
      if (String(url).endsWith("/me")) return Response.json(identity);
      if (String(url).includes("/engagement/attachments"))
        return Response.json([]);
      const cmd = options?.body ? JSON.parse(String(options.body)) : command;
      return respond
        ? respond(cmd, String(url), options?.method ?? "GET")
        : Response.json(outcome(cmd));
    },
  );
  const api = createApiClient(fetcher),
    key = fileAccessKey(clientId, actor);
  const recovery = fileAccessRecovery(clientId, actor, execution.guard);
  const run = (input: FileAccessInput) =>
    saveFileAccess(api, cache, clientId, execution, input);
  return {
    cache,
    actor,
    abort,
    execution,
    command,
    outcome,
    fetcher,
    api,
    key,
    recovery,
    run,
    save: () => run({ command }),
  };
}
it("sends exactly the reviewed sorted file/revision manifest and actor-bound canonical digest", async () => {
  const s = setup();
  expect(await fileAccessDigest(s.command, s.actor)).toBe(
    s.outcome().payloadDigest,
  );
  const received = await s.save();
  expect(received.status).toBe("completed");
  expect(s.fetcher.mock.calls[0]?.[0]).toBe(
    `/api/backend/core/clients/${clientId}/files/access/folder`,
  );
  expect(s.fetcher.mock.calls[0]?.[1]?.method).toBe("PATCH");
  expect(JSON.parse(String(s.fetcher.mock.calls[0]?.[1]?.body))).toEqual(
    s.command,
  );
  expect(s.cache.getQueryData(s.key)).toBeNull();
  expect(await s.recovery.load()).toBeNull();
});
it("uses the existing single-file access route with the same durable protocol", async () => {
  const s = setup();
  const command = fileAccessCommand(
    clientId,
    "file-access",
    "Reports",
    files.slice(0, 1),
    "all",
    [],
  );
  await s.run({ command });
  expect(s.fetcher.mock.calls[0]?.[0]).toBe(
    `/api/backend/core/clients/${clientId}/files/${files[0]!.id}/access`,
  );
});
it.each(["missing", "revision", "folder", "client"])(
  "refuses a changed %s review before dispatch",
  async (field) => {
    const s = setup();
    s.cache.setQueryData(
      currentFilesKey(s.cache, clientId),
      field === "missing"
        ? []
        : files.map((row) => ({
            ...row,
            ...(field === "revision"
              ? { metadataRevision: 99 }
              : field === "folder"
                ? { folder: "Changed" }
                : { clientId: crypto.randomUUID() }),
          })),
    );
    await expect(s.save()).rejects.toMatchObject({ status: 409 });
    expect(s.fetcher).not.toHaveBeenCalled();
    expect(await s.recovery.load()).toBeNull();
  },
);
it("bounds the explicit manifest, revisions, viewers and original folder before dispatch", () => {
  for (const selected of [
    [],
    Array.from({ length: 101 }, () => files[0]!),
    [files[0]!, files[0]!],
    [{ ...files[0]!, metadataRevision: undefined }],
    [{ ...files[0]!, metadataRevision: 2_147_483_647 }],
    [{ ...files[0]!, folder: "Other" }],
  ])
    expect(() =>
      fileAccessCommand(
        clientId,
        "folder-access",
        "Reports",
        selected,
        "all",
        [],
      ),
    ).toThrow();
  expect(() =>
    fileAccessCommand(clientId, "file-access", "Reports", files, "all", []),
  ).toThrow();
  expect(() =>
    fileAccessCommand(
      clientId,
      "folder-access",
      "Reports",
      files,
      "restricted",
      ["not-a-member-id"],
    ),
  ).toThrow();
  const id = crypto.randomUUID();
  expect(() =>
    fileAccessCommand(
      clientId,
      "folder-access",
      "Reports",
      files,
      "restricted",
      [id, id],
    ),
  ).toThrow();
});
it.each([
  "actor",
  "tenant",
  "client",
  "request",
  "digest",
  "operation",
  "file",
  "revision",
  "status",
])("retains uncertainty on a contradictory %s outcome", async (field) => {
  const s = setup((cmd) => {
    const value = s.outcome(cmd);
    if (field === "actor") value.actorUserId = "other";
    if (field === "tenant") value.tenantId = "other";
    if (field === "client") value.clientId = crypto.randomUUID();
    if (field === "request") value.requestId = crypto.randomUUID();
    if (field === "digest") value.payloadDigest = "f".repeat(64);
    if (field === "operation") value.operation = "file-access";
    if (field === "file") value.result!.files.reverse();
    if (field === "revision") value.result!.files[0]!.previousRevision++;
    if (field === "status") value.status = "refused";
    return Response.json(value);
  });
  await expect(s.save()).rejects.toMatchObject({ status: 502 });
  expect(await s.recovery.load()).toMatchObject({
    command: s.command,
    status: "unknown",
  });
});
it("lost acknowledgment survives cache replacement and reads historical outcome even with no visible files", async () => {
  let lost = true;
  const s = setup((cmd) => {
    if (lost) {
      lost = false;
      throw new Error("lost acknowledgment");
    }
    return Response.json(s.outcome(cmd));
  });
  await expect(s.save()).rejects.toThrow();
  s.cache.removeQueries({ queryKey: s.key });
  s.cache.setQueryData(currentFilesKey(s.cache, clientId), []);
  expect(await s.recovery.load()).toMatchObject({ command: s.command });
  await s.run({ recover: "receipt" });
  expect(s.fetcher.mock.calls.at(-1)?.[0]).toBe(
    `/api/backend/core/clients/${clientId}/files/access/commands/${s.command.requestId}`,
  );
  expect(s.fetcher.mock.calls.at(-1)?.[1]?.method).toBe("GET");
  expect(await s.recovery.load()).toBeNull();
});
it.each([400, 403, 404, 409, 500])(
  "an untyped HTTP%s never clears the saved command",
  async (status) => {
    const s = setup(() =>
      Response.json({ message: "Unconfirmed" }, { status }),
    );
    await expect(s.save()).rejects.toMatchObject({ status });
    await expect(s.run({ recover: "receipt" })).rejects.toMatchObject({
      status,
    });
    expect(await s.recovery.load()).toMatchObject({ command: s.command });
  },
);
it("retries the exact immutable command and refuses another write or corrupted storage", async () => {
  const s = setup(() => {
    throw new Error("lost");
  });
  await expect(s.save()).rejects.toThrow();
  await expect(s.run({ recover: "retry" })).rejects.toThrow();
  expect(s.fetcher.mock.calls.map((call) => call[1]?.body)).toEqual([
    JSON.stringify(s.command),
    JSON.stringify(s.command),
  ]);
  await expect(
    s.run({ command: { ...s.command, requestId: crypto.randomUUID() } }),
  ).rejects.toThrow();
  db.records.clear();
  await expect(s.run({ recover: "receipt" })).rejects.toThrow();
  expect(s.fetcher).toHaveBeenCalledTimes(2);
});
it("keeps a durable refusal immutable and retires only after explicit current authority and file reads", async () => {
  const s = setup((cmd) => Response.json(s.outcome(cmd, true)));
  expect((await s.save()).status).toBe("refused");
  await expect(s.run({ recover: "retry" })).rejects.toThrow("Core refused");
  const retained = (await s.recovery.load())!;
  await expect(
    s.recovery.received({ ...retained, outcome: s.outcome() }),
  ).rejects.toThrow();
  await s.run({ recover: "retire" });
  expect(s.fetcher.mock.calls.slice(1).map((call) => String(call[0]))).toEqual([
    "/api/backend/core/me",
    `/api/backend/core/engagement/attachments?clientId=${clientId}`,
  ]);
  expect(await s.recovery.load()).toBeNull();
  expect(await s.recovery.settled(s.command.requestId)).toBe(true);
});
it("does not retire a refusal if the current authority read fails", async () => {
  const s = setup((cmd) => Response.json(s.outcome(cmd, true)));
  await s.save();
  s.fetcher.mockImplementationOnce(async () =>
    Response.json({ message: "Denied" }, { status: 403 }),
  );
  await expect(s.run({ recover: "retire" })).rejects.toMatchObject({
    status: 403,
  });
  expect(await s.recovery.load()).not.toBeNull();
});
it("a stale retry reconciles a different durable command without dispatching it", async () => {
  const s = setup(() => {
    throw new Error("lost");
  });
  await expect(s.save()).rejects.toThrow();
  await s.recovery.acknowledge(s.command.requestId);
  const command = {
    ...s.command,
    requestId: crypto.randomUUID(),
    viewerMode: "all" as const,
  };
  const next = {
    command,
    digest: await fileAccessDigest(command, s.actor),
    status: "unknown" as const,
  };
  await s.recovery.reserve(next);
  await expect(s.run({ recover: "retry" })).rejects.toThrow(
    "changed in another view",
  );
  expect(s.fetcher).toHaveBeenCalledTimes(1);
  expect(s.cache.getQueryData(s.key)).toEqual(next);
});
it("only positive original settlement clears an old cache; missing storage remains held", async () => {
  const s = setup(() => {
    throw new Error("lost");
  });
  await expect(s.save()).rejects.toThrow();
  db.records.clear();
  local.clear();
  await expect(s.run({ recover: "receipt" })).rejects.toThrow();
  expect(s.cache.getQueryData(s.key)).toMatchObject({ command: s.command });
  await s.recovery.reserve({
    command: s.command,
    digest: await fileAccessDigest(s.command, s.actor),
    status: "unknown",
  });
  await s.recovery.acknowledge(s.command.requestId);
  await expect(s.run({ recover: "receipt" })).rejects.toThrow();
  expect(s.cache.getQueryData(s.key)).toBeNull();
});
it("preserves a validated late outcome only in the original actor journal", async () => {
  const gate = barrier();
  const s = setup(async (cmd) => {
    await gate.promise;
    return Response.json(s.outcome(cmd));
  });
  const request = s.save();
  await vi.waitFor(() => expect(s.fetcher).toHaveBeenCalledTimes(1));
  s.cache.setQueryData(["identity"], {
    ...identity,
    user: { ...identity.user, id: "other" },
  });
  gate.resolve();
  await expect(request).rejects.toMatchObject({ status: 403 });
  const original = fileAccessRecovery(clientId, s.actor, () => {});
  expect(await original.load()).toMatchObject({
    outcome: { status: "completed" },
  });
  expect(
    await fileAccessRecovery(
      clientId,
      currentFileReader(s.cache)!,
      () => {},
    ).load(),
  ).toBeNull();
});
it("accepts no-op revisions only for an otherwise exact outcome", async () => {
  const s = setup(),
    digest = await fileAccessDigest(s.command, s.actor),
    value = s.outcome();
  value.result!.files.forEach((file) => {
    file.revision = file.previousRevision;
  });
  expect(
    fileAccessOutcomeSchema({ command: s.command, digest }, s.actor).parse(
      value,
    ),
  ).toEqual(value);
});

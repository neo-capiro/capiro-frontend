import "./command-recovery-platform";
import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import {
  readRecovery,
  reserveRecovery,
  readRecoveryDisposition,
} from "../src/shared/session/recovery/journal";
import {
  fileDeletionRecoveryContract,
  fileDeletionScope,
  fileDeletionCommandSchema,
  fileDeletionBodySchema,
  fileDeletionReceiptSchema,
} from "../src/features/portfolio/files/deletion-contract";
import {
  deleteClientFile,
  type FileDeletionAction,
} from "../src/features/portfolio/files/deletion";
import {
  actor,
  id,
  clientId,
  file,
  review,
  attempt,
  fixture,
  receiptFor,
  commandCalls,
} from "./files-delete-fixtures";
import {
  barrier,
  db,
  installPlatform,
  local,
} from "./command-recovery-platform";
installPlatform();
const guard = () => {},
  scope = fileDeletionScope(actor, clientId);
const submit: FileDeletionAction = { kind: "submit", review };
const held = () => readRecovery(scope, fileDeletionRecoveryContract, guard);
const run = (
  f: ReturnType<typeof fixture>,
  action: FileDeletionAction,
  observe: Parameters<typeof deleteClientFile>[6] = () => {},
  signal = new AbortController().signal,
  assert = guard,
) => deleteClientFile(f.api, actor, clientId, action, signal, assert, observe);
async function retain() {
  const saved = await attempt();
  await reserveRecovery(
    scope,
    saved.command.requestId,
    saved,
    fileDeletionRecoveryContract,
    guard,
  );
  return saved;
}
it("matches Core canonical body order with route attachmentId last", async () => {
  const saved = await attempt();
  expect(Object.keys(saved.command)).toEqual([
    "schemaVersion",
    "requestId",
    "clientId",
    "expectedRevision",
    "attachmentId",
  ]);
  expect(saved.payloadDigest).toBe(
    createHash("sha256")
      .update(
        JSON.stringify([
          "client-file-delete",
          1,
          actor.tenantId,
          actor.userId,
          saved.command,
        ]),
      )
      .digest("hex"),
  );
  expect(fileDeletionBodySchema.safeParse(saved.command).success).toBe(false);
  expect(
    fileDeletionCommandSchema.safeParse({ ...saved.command, unknown: true })
      .success,
  ).toBe(false);
});
it("retains encrypted exact review before DELETE; lost ACK is recovered and acknowledged by matching GET after target removal", async () => {
  let saved: Awaited<ReturnType<typeof attempt>> | null = null;
  const f = fixture({
    receipt: async () => {
      expect(await held()).toEqual(saved);
      expect([...local.values()].join("")).not.toContain(file.fileName);
      expect(JSON.stringify([...db.records.values()])).not.toContain(
        file.fileName,
      );
      throw new TypeError("Lost ACK");
    },
  });
  await expect(
    run(f, submit, (value) => {
      saved = value;
    }),
  ).rejects.toThrow("Lost ACK");
  const original = (await held())!,
    recovered = fixture({ files: [], receipt: () => receiptFor(original) });
  await run(recovered, { kind: "check", expected: original });
  expect(await held()).toEqual(original);
  await run(recovered, { kind: "acknowledge", expected: original });
  expect(await held()).toBeNull();
  expect(
    await readRecoveryDisposition(scope, original.command.requestId, guard),
  ).toMatchObject({ state: "acknowledged" });
  expect(commandCalls(recovered).map((call) => call.method)).toEqual([
    "GET",
    "GET",
  ]);
  expect(
    recovered.calls.some((call) => call.path.includes("attachments?")),
  ).toBe(false);
  expect(commandCalls(f)[0]!.body).toEqual({
    schemaVersion: 1,
    requestId: original.command.requestId,
    clientId,
    expectedRevision: 3,
  });
});
it.each([400, 401, 403, 404, 409, 422, 503])(
  "HTTP%s after dispatch is not a durable refusal; new submit stays held",
  async (status) => {
    const f = fixture({
      receipt: () => Response.json({ message: "Unconfirmed" }, { status }),
    });
    await expect(run(f, submit)).rejects.toThrow();
    const saved = await held();
    expect(saved).not.toBeNull();
    await expect(run(f, submit)).rejects.toThrow("saved file deletion");
    expect(commandCalls(f)).toHaveLength(1);
  },
);
it.each([{}, { ok: true }, { status: "completed" }])(
  "malformed acknowledgement %j never retires intent",
  async (value) => {
    const f = fixture({ receipt: () => value });
    await expect(run(f, submit)).rejects.toMatchObject({ status: 502 });
    expect(await held()).not.toBeNull();
  },
);
it.each(["pending", "missing"])(
  "explicit retry of %s reconciles then sends only identical retained DELETE",
  async (state) => {
    const saved = await retain(),
      f = fixture({
        files: [],
        receipt: (method) =>
          method === "DELETE"
            ? receiptFor(saved)
            : state === "pending"
              ? receiptFor(saved, "pending")
              : Response.json({ message: "Missing" }, { status: 404 }),
      });
    await run(f, { kind: "retry", expected: saved });
    expect(commandCalls(f).map((call) => call.method)).toEqual([
      "GET",
      "DELETE",
    ]);
    expect(commandCalls(f)[1]!.body).toEqual({
      schemaVersion: 1,
      requestId: saved.command.requestId,
      clientId,
      expectedRevision: 3,
    });
    expect(await held()).toEqual(saved);
  },
);
it("completed historical receipt suppresses replay even if target is absent", async () => {
  const saved = await retain(),
    f = fixture({ files: [], receipt: () => receiptFor(saved) });
  await run(f, { kind: "retry", expected: saved });
  expect(commandCalls(f).map((call) => call.method)).toEqual(["GET"]);
  expect(await held()).toEqual(saved);
});
it.each(["pending", "missing"])(
  "%s cannot acknowledge deletion or release a new command",
  async (state) => {
    const saved = await retain(),
      f = fixture({
        files: [],
        receipt: () =>
          state === "pending"
            ? receiptFor(saved, "pending")
            : Response.json({ message: "Missing" }, { status: 404 }),
      });
    await expect(
      run(f, { kind: "acknowledge", expected: saved }),
    ).rejects.toThrow();
    expect(await held()).toEqual(saved);
    expect(commandCalls(f).every((call) => call.method === "GET")).toBe(true);
  },
);
it.each([401, 403, 404, 409, 503])(
  "GET%s does not retire or infer success from a missing file",
  async (status) => {
    const saved = await retain(),
      f = fixture({
        files: [],
        receipt: () => Response.json({ message: "Unavailable" }, { status }),
      });
    await expect(run(f, { kind: "check", expected: saved })).rejects.toThrow();
    expect(await held()).toEqual(saved);
    expect(commandCalls(f).map((call) => call.method)).toEqual(["GET"]);
  },
);
it.each([
  "tenantId",
  "actorUserId",
  "requestId",
  "clientId",
  "attachmentId",
  "expectedRevision",
  "payloadDigest",
])("rejects a mismatched %s receipt", async (key) => {
  const saved = await retain(),
    f = fixture({
      receipt: () => ({
        ...receiptFor(saved),
        [key]:
          key === "expectedRevision"
            ? 4
            : key === "payloadDigest"
              ? "b".repeat(64)
              : id(90),
      }),
    });
  await expect(
    run(f, { kind: "acknowledge", expected: saved }),
  ).rejects.toThrow();
  expect(await held()).toEqual(saved);
});
it("requires both actual object and indexed-chunk absence in completed receipt", async () => {
  const saved = await attempt(),
    receipt = receiptFor(saved);
  expect(
    fileDeletionReceiptSchema.safeParse({
      ...receipt,
      result: { ...receipt.result, objectAbsent: false },
    }).success,
  ).toBe(false);
  expect(
    fileDeletionReceiptSchema.safeParse({
      ...receipt,
      result: { ...receipt.result, indexedChunksAbsent: false },
    }).success,
  ).toBe(false);
});
it.each(
  [
    [],
    [{ ...file, metadataRevision: 4 }],
    [{ ...file, lifecycleStatus: "delete_pending" }],
    [{ ...file, clientId: id(90) }],
    [file, file],
  ].map((files) => ({ files })),
)(
  "rejects unavailable/stale/noncanonical current list without dispatch",
  async ({ files }) => {
    const f = fixture({ files });
    await expect(run(f, submit)).rejects.toThrow();
    expect(commandCalls(f)).toHaveLength(0);
    expect(await held()).toBeNull();
  },
);
it.each([401, 403, 404, 503])(
  "current authorization%s hides retained data before observation and sends no command",
  async (status) => {
    const saved = await retain(),
      seen: unknown[] = [];
    const f = fixture({
      override: (path) =>
        path.includes("/clients/")
          ? Response.json({ message: "Unavailable" }, { status })
          : undefined,
    });
    await expect(
      run(f, { kind: "check", expected: saved }, (value) => seen.push(value)),
    ).rejects.toThrow("access");
    expect(seen).toEqual([]);
    expect(commandCalls(f)).toHaveLength(0);
    expect(await held()).toEqual(saved);
  },
);
it("post-receipt authority loss keeps intent and cannot acknowledge", async () => {
  const saved = await retain();
  let revoked = false;
  const f = fixture({
    receipt: () => {
      revoked = true;
      return receiptFor(saved);
    },
    override: (path) =>
      revoked && path.includes("/clients/")
        ? Response.json({ message: "Unavailable" }, { status: 404 })
        : undefined,
  });
  await expect(
    run(f, { kind: "acknowledge", expected: saved }),
  ).rejects.toThrow("access");
  expect(await held()).toEqual(saved);
});
it("404 wall denial on explicit retry never permits DELETE when current authority no longer holds", async () => {
  const saved = await retain();
  let revoked = false;
  const f = fixture({
    receipt: () => {
      revoked = true;
      return Response.json({ message: "Unavailable" }, { status: 404 });
    },
    override: (path) =>
      revoked && path.endsWith("/me")
        ? Response.json({ message: "Unavailable" }, { status: 403 })
        : undefined,
  });
  await expect(run(f, { kind: "retry", expected: saved })).rejects.toThrow(
    "access",
  );
  expect(commandCalls(f).map((call) => call.method)).toEqual(["GET"]);
  expect(await held()).toEqual(saved);
});
for (const method of ["DELETE", "GET"]) {
  it.each(["actor", "client-abort", "cache-clear"])(
    `late ${method} after %s replacement cannot publish completion`,
    async (boundary) => {
      const saved = method === "GET" ? await retain() : null,
        entered = barrier(),
        release = barrier(),
        controller = new AbortController();
      let current = true,
        original = saved;
      const f = fixture({
        receipt: async () => {
          entered.resolve();
          await release.promise;
          return receiptFor(original!);
        },
      });
      const pending = run(
        f,
        saved ? { kind: "check", expected: saved } : submit,
        (value) => {
          original = value;
        },
        controller.signal,
        () => {
          controller.signal.throwIfAborted();
          if (!current) throw new Error("Actor changed");
        },
      );
      const rejected = expect(pending).rejects.toThrow();
      await entered.promise;
      if (boundary === "client-abort") controller.abort();
      else current = false;
      release.resolve();
      await rejected;
      expect(await held()).toEqual(original);
      expect(
        await readRecovery(
          fileDeletionScope({ ...actor, userId: id(90) }, clientId),
          fileDeletionRecoveryContract,
          guard,
        ),
      ).toBeNull();
    },
  );
}
it("freezes file revision/name before awaiting authority", async () => {
  const entered = barrier(),
    release = barrier();
  let first = true,
    saved: Awaited<ReturnType<typeof attempt>> | null = null;
  const f = fixture({
      override: async (path) => {
        if (first && path.endsWith("/me")) {
          first = false;
          entered.resolve();
          await release.promise;
        }
        return undefined;
      },
      receipt: () => receiptFor(saved!),
    }),
    input = structuredClone(submit);
  const pending = run(f, input, (value) => {
    saved = value;
  });
  await entered.promise;
  if (input.kind === "submit") {
    input.review.metadataRevision = 8;
    input.review.fileName = "Changed";
  }
  release.resolve();
  await pending;
  expect((await held())?.command.expectedRevision).toBe(3);
  expect((await held())?.fileName).toBe(file.fileName);
});
it("storage failure and racing submissions cannot dispatch a duplicate command", async () => {
  db.failWrite = true;
  const f = fixture();
  await expect(run(f, submit)).rejects.toThrow("storage");
  expect(commandCalls(f)).toHaveLength(0);
});
it("cross-tab execution lock allows one submit; the second sees the retained first command", async () => {
  let saved: Awaited<ReturnType<typeof attempt>> | null = null;
  const f = fixture({ receipt: () => receiptFor(saved!) });
  const first = run(f, submit, (value) => {
    saved = value;
  });
  const second = run(f, submit);
  const rejected = expect(second).rejects.toThrow("saved file deletion");
  await first;
  await rejected;
  expect(commandCalls(f)).toHaveLength(1);
});
it("new current file data cannot retire the retained command or adopt a newer revision", async () => {
  const saved = await retain(),
    f = fixture({
      files: [{ ...file, metadataRevision: 4 }],
      receipt: () => receiptFor(saved, "pending"),
    });
  await run(f, { kind: "check", expected: saved });
  await expect(
    run(f, { kind: "submit", review: { ...review, metadataRevision: 4 } }),
  ).rejects.toThrow("saved file deletion");
  expect(await held()).toEqual(saved);
  expect(f.calls.some((call) => call.path.includes("attachments?"))).toBe(
    false,
  );
});

import { describe, expect, it } from "vitest";
import {
  createUploadAttemptReferences,
  type UploadAttemptScope,
} from "../../src/shared/meri-uploads/upload-attempt-storage";
import { createUploadController } from "../../src/shared/meri-uploads/upload-controller";
import { createUploadWire } from "../../src/shared/meri-uploads/upload-wire";
import {
  receiveUploadRequest,
  type UploadReceipt,
} from "../../src/shared/meri-uploads/facade";
const scope: UploadAttemptScope = {
  tenantId: "synthetic",
  actorId: "synthetic-actor",
  clientId: null,
  conversationId: "11111111-1111-4111-8111-111111111111",
};
const uploadId = "22222222-2222-4222-8222-222222222222";
const file = () =>
  new File(["synthetic original"], "private-name.txt", { type: "text/plain" });
const respond = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });
function storage() {
  const values = new Map<string, string>();
  return {
    values,
    get length() {
      return values.size;
    },
    key: (i: number) => [...values.keys()][i] ?? null,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
}
function server(lost: "initiate" | "put" | "remove" | null) {
  const calls: string[] = [];
  let receipt: UploadReceipt | undefined;
  let release: (() => void) | undefined;
  let hold = false;
  const fetcher: typeof fetch = async (input, init) => {
    const url = String(input);
    calls.push(url);
    const bytes = init?.body as Uint8Array;
    if (url.endsWith("/initiate")) {
      const q = receiveUploadRequest("initiate", bytes);
      const { requestId, ...original } = q;
      receipt = {
        uploadId,
        requestId,
        original: { ...original, versionId: null },
        storageStatus: "awaiting_upload",
        scanStatus: "pending",
        scanReason: null,
        extraction: { status: "pending", limitations: [] },
        originalBytesAvailable: false,
      };
      if (lost === "initiate") throw Error("lost reply");
      return respond(receipt);
    }
    if (url.includes("/original/")) {
      receipt = {
        ...receipt!,
        original: { ...receipt!.original, versionId: "synthetic-version" },
        storageStatus: "stored",
      };
      if (lost === "put") throw Error("lost reply");
      return respond(receipt);
    }
    if (url.endsWith("/status")) {
      const q = receiveUploadRequest("status", bytes);
      if (hold)
        await new Promise<void>((resolve) => {
          release = resolve;
        });
      if (
        !receipt ||
        ("requestId" in q
          ? q.requestId !== receipt.requestId
          : q.uploadId !== receipt.uploadId)
      )
        return respond(
          { error: { code: "UPLOAD_NOT_FOUND", outcome: "READ_UNAVAILABLE" } },
          404,
        );
      return respond(receipt);
    }
    if (url.endsWith("/remove")) {
      receipt = {
        ...receipt!,
        storageStatus: "removed",
        scanStatus: "unavailable",
        scanReason: "UPLOAD_REMOVED",
        extraction: { status: "unavailable", limitations: ["UPLOAD_REMOVED"] },
        originalBytesAvailable: false,
      };
      if (lost === "remove") throw Error("lost reply");
      return respond(receipt);
    }
    throw Error("unexpected route");
  };
  return {
    calls,
    fetcher,
    get receipt() {
      return receipt;
    },
    set receipt(value) {
      receipt = value;
    },
    hold() {
      hold = true;
    },
    release() {
      release?.();
    },
  };
}
function controller(
  store: ReturnType<typeof storage>,
  service: ReturnType<typeof server>,
  current = () => true,
  identity = scope,
) {
  const life = new AbortController();
  return createUploadController({
    wire: createUploadWire(
      "action_session_" + "A".repeat(43),
      life.signal,
      service.fetcher,
    ),
    isCurrent: current,
    recovery: createUploadAttemptReferences(identity, () => store),
  });
}
describe("durable upload attempt references", () => {
  it("keeps cancellation after initiate dispatch unknown even when fetch ignores abort", async () => {
    const store = storage(),
      service = server(null);
    const entered = Promise.withResolvers<void>(),
      finish = Promise.withResolvers<Response>();
    const fetcher: typeof fetch = async () => {
      entered.resolve();
      return finish.promise;
    };
    const instance = createUploadController({
      wire: createUploadWire(
        "action_session_" + "A".repeat(43),
        new AbortController().signal,
        fetcher,
      ),
      isCurrent: () => true,
      recovery: createUploadAttemptReferences(scope, () => store),
    });
    const adding = instance.add([file()]);
    await entered.promise;
    const requestId = instance.items()[0]!.requestId;
    instance.cancel(requestId);
    await adding;
    expect(instance.items()[0]).toMatchObject({
      state: "unknown",
      refusal: { uncertain: true },
    });
    await instance.remove(requestId);
    expect(store.values.size).toBe(1);
    finish.resolve(respond({}));
    instance.dispose();
    expect(controller(store, service).items()[0]).toMatchObject({
      requestId,
      state: "unknown",
    });
  });
  it("restores a lost initiate reply without bytes or authority and only checks on explicit request", async () => {
    const store = storage(),
      service = server("initiate"),
      first = controller(store, service);
    await first.add([file()]);
    const requestId = first.items()[0]!.requestId;
    expect(first.items()[0]!.state).toBe("unknown");
    first.cancel(requestId);
    await first.remove(requestId);
    expect(first.items()).toHaveLength(1);
    first.dispose();
    const saved = JSON.parse([...store.values.values()][0]!);
    expect(saved).toEqual({ version: 1, scope, requestId });
    expect(JSON.stringify(saved)).not.toContain("private-name");
    const restored = controller(store, service);
    expect(restored.items()[0]).toMatchObject({
      state: "unknown",
      uploadId: null,
      bytes: 0,
      sha256: "",
    });
    expect(restored.sendArgument()).toEqual([]);
    expect(service.calls).toHaveLength(1);
    await restored.check(requestId);
    expect(restored.items()[0]).toMatchObject({ state: "unknown", uploadId });
    expect(restored.sendArgument()).toEqual([]);
    expect(service.calls).toEqual([
      "/api/uploads/initiate",
      "/api/uploads/status",
    ]);
  });
  it("reconciles lost PUT and removal replies across separate controllers without replay", async () => {
    for (const lost of ["put", "remove"] as const) {
      const store = storage(),
        service = server(lost),
        first = controller(store, service);
      await first.add([file()]);
      const requestId = first.items()[0]!.requestId;
      if (lost === "remove") {
        await first.remove(requestId);
        expect(first.items()[0]!.state).toBe("unknown");
        expect(first.sendArgument()).toEqual([]);
      }
      first.dispose();
      const restored = controller(store, service);
      expect(restored.sendArgument()).toEqual([]);
      await restored.check(requestId);
      expect(restored.items()[0]!.state).toBe(
        lost === "put" ? "stored" : "removed",
      );
      expect(
        service.calls.filter((p) => p.includes("/original/")),
      ).toHaveLength(1);
      expect(store.values.size).toBe(lost === "put" ? 1 : 0);
    }
  });
  it("keeps no-record replies unresolved without creating a new attempt", async () => {
    const store = storage(),
      service = server("initiate"),
      first = controller(store, service);
    await first.add([file()]);
    first.dispose();
    const requestId = JSON.parse([...store.values.values()][0]!).requestId;
    const restored = controller(store, service);
    service.receipt = undefined;
    await restored.check(requestId);
    expect(restored.items()[0]).toMatchObject({
      state: "unknown",
      refusal: { code: "UPLOAD_NOT_FOUND" },
    });
    expect(store.values.size).toBe(1);
    expect(restored.sendArgument()).toEqual([]);
    expect(service.calls).toHaveLength(2);
  });
  it("isolates all identity dimensions and discards a late result after revocation", async () => {
    const store = storage(),
      service = server("put"),
      first = controller(store, service);
    await first.add([file()]);
    first.dispose();
    for (const changed of [
      { tenantId: "other" },
      { actorId: "other" },
      { clientId: uploadId },
      { conversationId: uploadId },
    ])
      expect(
        controller(store, service, () => true, {
          ...scope,
          ...changed,
        }).items(),
      ).toEqual([]);
    let current = true;
    const restored = controller(store, service, () => current);
    service.hold();
    const pending = restored.check(restored.items()[0]!.requestId);
    await new Promise((resolve) => setTimeout(resolve, 0));
    current = false;
    service.release();
    await pending;
    expect(restored.items()[0]!.state).toBe("unknown");
    expect(restored.sendArgument()).toEqual([]);
    expect(store.values.size).toBe(1);
  });
  it("refuses dispatch on denied, full, corrupt or nonretaining storage", async () => {
    for (const fault of ["denied", "full", "corrupt", "discard"] as const) {
      const store = storage(),
        service = server(null);
      if (fault === "corrupt") {
        const refs = createUploadAttemptReferences(scope, () => store);
        refs.retain(uploadId);
        store.values.set(
          [...store.values.keys()][0]!,
          '{"version":1,"credential":"forged"}',
        );
      } else if (fault === "discard") store.setItem = () => {};
      else
        store.setItem = () => {
          throw Error(fault);
        };
      const instance = controller(store, service);
      await instance.add([file()]);
      expect(service.calls).toEqual([]);
      expect(instance.items().at(-1)?.refusal?.code).toBe(
        "UPLOAD_RECOVERY_UNAVAILABLE",
      );
    }
  });
});

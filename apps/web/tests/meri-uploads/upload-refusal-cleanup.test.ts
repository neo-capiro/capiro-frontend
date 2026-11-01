// Independent review F1 counterexamples, retained as regressions.
import { it, expect, vi } from "vitest";
import { createUploadAttemptReferences } from "../../src/shared/meri-uploads/upload-attempt-storage";
import { createUploadController } from "../../src/shared/meri-uploads/upload-controller";
import { createUploadWire } from "../../src/shared/meri-uploads/upload-wire";

const scope = {
  tenantId: "synthetic",
  actorId: "synthetic-actor",
  clientId: null,
  conversationId: "11111111-1111-4111-8111-111111111111",
};
function storage() {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    key: (i: number) => [...map.keys()][i] ?? null,
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
  };
}
function harness() {
  const store = storage(),
    refs = createUploadAttemptReferences(scope, () => store);
  const fetcher = vi.fn<typeof fetch>(async () =>
    Response.json(
      { error: { code: "UPLOAD_NOT_FOUND", outcome: "READ_UNAVAILABLE" } },
      { status: 404 },
    ),
  );
  const create = () =>
    createUploadController({
      wire: createUploadWire(
        "action_session_" + "A".repeat(43),
        new AbortController().signal,
        fetcher,
      ),
      isCurrent: () => true,
      recovery: refs,
    });
  return { store, refs, fetcher, create };
}

it("does not promote a proven pre-dispatch invalid-file refusal to an unresolvable recovery locator after restart", async () => {
  const h = harness(),
    first = h.create();
  await first.add([new File([], "empty.txt", { type: "text/plain" })]);
  expect(h.fetcher).not.toHaveBeenCalled();
  expect(first.items()[0]).toMatchObject({ state: "refused" });
  expect(first.items()[0]?.refusal?.uncertain).not.toBe(true);
  first.dispose();
  const restored = h.create();
  const request = restored.items()[0]?.requestId;
  if (request) {
    await restored.check(request);
    await restored.remove(request);
  }
  // This locator was proven never dispatched; restart must not strand it as an unknown effect.
  expect(restored.items()).toEqual([]);
  expect(h.refs.list()).toEqual([]);
  restored.dispose();
});

it("does not permanently exhaust the eight-file composer after eight pre-dispatch refusals and restart", async () => {
  const h = harness(),
    first = h.create();
  await first.add(
    Array.from(
      { length: 8 },
      (_, i) => new File([], `empty-${i}.txt`, { type: "text/plain" }),
    ),
  );
  expect(h.fetcher).not.toHaveBeenCalled();
  expect(
    first
      .items()
      .every((item) => item.state === "refused" && !item.refusal?.uncertain),
  ).toBe(true);
  first.dispose();
  const restored = h.create();
  for (const item of restored.items()) {
    await restored.check(item.requestId);
    await restored.remove(item.requestId);
  }
  const before = h.fetcher.mock.calls.length;
  await restored.add([
    new File(["valid synthetic text"], "valid.txt", { type: "text/plain" }),
  ]);
  // A new valid attempt must reach its declaration, even if this fixture then refuses that request.
  expect(h.fetcher.mock.calls.length).toBe(before + 1);
  restored.dispose();
});

it("retires local size, byte-length and admission refusals without relying on an outcome code", async () => {
  const oversized = new File(["x"], "large.txt", { type: "text/plain" });
  Object.defineProperty(oversized, "size", { value: 10 * 1024 * 1024 + 1 });
  const mismatch = new File(["x"], "length.txt", { type: "text/plain" });
  vi.spyOn(mismatch, "arrayBuffer").mockResolvedValue(new ArrayBuffer(0));
  for (const file of [
    oversized,
    mismatch,
    new File(["x"], "unsupported.exe", { type: "text/plain" }),
  ]) {
    const h = harness(),
      first = h.create();
    await first.add([file]);
    expect(h.fetcher).not.toHaveBeenCalled();
    expect(first.items()[0]?.refusal?.neverDispatched).toBe(true);
    expect(h.refs.list()).toEqual([]);
    first.dispose();
    expect(h.create().items()).toEqual([]);
  }
});

it("retires cancellation before declaration and after abort during local file reading, even after disposal", async () => {
  const h = harness(),
    first = h.create();
  first.subscribe(() => {
    const item = first.items()[0];
    if (item?.state === "declaring") first.cancel(item.requestId);
  });
  await first.add([new File(["x"], "cancel.txt", { type: "text/plain" })]);
  expect(h.refs.list()).toEqual([]);
  expect(h.fetcher).not.toHaveBeenCalled();
  first.dispose();
  const second = h.create(),
    entered = Promise.withResolvers<void>(),
    read = Promise.withResolvers<ArrayBuffer>();
  const file = new File(["x"], "reading.txt", { type: "text/plain" });
  vi.spyOn(file, "arrayBuffer").mockImplementation(() => {
    entered.resolve();
    return read.promise;
  });
  const adding = second.add([file]);
  await entered.promise;
  second.dispose();
  await adding;
  expect(h.refs.list()).toEqual([]);
  expect(h.create().items()).toEqual([]);
  read.resolve(new Uint8Array([120]).buffer);
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(h.fetcher).not.toHaveBeenCalled();
});

it("reports thrown or ineffective cleanup and preserves the unresolved reference on restart", async () => {
  for (const fails of ["throws", "no-op"] as const) {
    const h = harness(),
      remove = h.store.removeItem;
    h.store.removeItem = () => {
      if (fails === "throws") throw Error("storage denied");
    };
    const first = h.create();
    await first.add([new File([], "empty.txt", { type: "text/plain" })]);
    expect(first.items()[0]).toMatchObject({
      state: "refused",
      refusal: { neverDispatched: true, recoveryCleanupFailed: true },
    });
    expect(h.fetcher).not.toHaveBeenCalled();
    expect(h.refs.list()).toHaveLength(1);
    const restored = h.create(),
      requestId = restored.items()[0]!.requestId;
    await restored.check(requestId);
    await restored.remove(requestId);
    expect(restored.items()[0]?.state).toBe("unknown");
    expect(h.refs.list()).toHaveLength(1);
    h.store.removeItem = remove;
    await first.remove(requestId);
    expect(h.refs.list()).toEqual([]);
    first.dispose();
    restored.dispose();
  }
});

it("never infers local non-dispatch from a server NOT_DISPATCHED outcome", async () => {
  const h = harness();
  h.fetcher.mockImplementation(async () =>
    Response.json(
      { error: { code: "UPLOAD_FORMAT", outcome: "NOT_DISPATCHED" } },
      { status: 400 },
    ),
  );
  const first = h.create();
  await first.add([new File(["x"], "valid.txt", { type: "text/plain" })]);
  expect(h.fetcher).toHaveBeenCalledTimes(1);
  expect(first.items()[0]?.refusal?.neverDispatched).toBeUndefined();
  expect(h.refs.list()).toHaveLength(1);
  first.dispose();
  expect(h.create().items()[0]?.state).toBe("unknown");
});

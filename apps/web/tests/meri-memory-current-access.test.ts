import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useOwnerMemoryInbox as inboxHook } from "../src/features/meri/memory-review/useOwnerMemoryInbox";
import { useOwnerCorrection as correctionHook } from "../src/features/meri/memory-review/useOwnerCorrection";
import { ownerDecisionHoldKey } from "../src/features/meri/memory-review/owner-decision-hold";
import { ownerCorrectionHoldKey } from "../src/features/meri/memory-review/owner-correction";

// Run the real hooks and wire decoders with controlled hook lifetimes, without a browser or service.
const hooks = vi.hoisted(() => ({
  auth: { userId: "synthetic-owner", orgId: "synthetic-tenant" },
  cursor: 0,
  slots: [] as unknown[],
  effects: [] as Array<() => void>,
  cleanups: new Map<number, () => void>(),
  writes: 0,
}));
vi.mock("@clerk/nextjs", () => ({ useAuth: () => hooks.auth }));
vi.mock("react", () => ({
  useState(initial: unknown) {
    const index = hooks.cursor++;
    if (!(index in hooks.slots)) hooks.slots[index] = initial;
    return [
      hooks.slots[index],
      (value: unknown) => {
        hooks.writes++;
        hooks.slots[index] =
          typeof value === "function" ? value(hooks.slots[index]) : value;
      },
    ];
  },
  useRef(initial: unknown) {
    const index = hooks.cursor++;
    if (!(index in hooks.slots)) hooks.slots[index] = { current: initial };
    return hooks.slots[index];
  },
  useEffect(effect: () => void | (() => void), dependencies: unknown[]) {
    const index = hooks.cursor++;
    const before = hooks.slots[index] as unknown[] | undefined;
    if (before && dependencies.every((value, i) => Object.is(value, before[i])))
      return;
    hooks.slots[index] = dependencies;
    hooks.effects.push(() => {
      hooks.cleanups.get(index)?.();
      const cleanup = effect();
      if (cleanup) hooks.cleanups.set(index, cleanup);
      else hooks.cleanups.delete(index);
    });
  },
}));
const id = "11111111-1111-4111-8111-111111111111";
const candidate = {
  id,
  kind: "addition" as const,
  key: "Synthetic preference",
  value: "Private synthetic memory",
  sourceType: "meri",
  createdAt: "2026-10-18T12:00:00.000Z",
};
const item = {
  id,
  title: "Synthetic preference",
  value: "Private synthetic memory",
  scope: "user_private" as const,
  clientId: null,
  updatedAt: "2026-10-18T12:00:00.000000Z",
};
const page = (
  kind: string,
  value = "Private synthetic memory",
  nextCursor: string | null = "next",
) =>
  kind === "inbox"
    ? { version: 1, candidates: [{ ...candidate, value }], nextCursor }
    : { schemaVersion: 1, items: [{ ...item, value }], nextCursor };
const storage = new Map<string, string>();
const fetcher = vi.fn<typeof fetch>();
function deferred() {
  let resolve!: (response: Response) => void;
  const promise = new Promise<Response>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
async function settle() {
  for (let i = 0; i < 12; i++) await Promise.resolve();
}
function render(kind: string) {
  hooks.cursor = 0;
  return kind === "inbox" ? inboxHook(true) : correctionHook(true);
}
function state(kind: string) {
  const view = render(kind);
  return "inbox" in view ? view.inbox : view.items;
}
function mutate(kind: string) {
  const view = render(kind);
  return "decide" in view
    ? view.decide(candidate, "approve")
    : view.propose(item, "Changed synthetic memory");
}
async function mount(kind: string) {
  fetcher.mockResolvedValueOnce(Response.json(page(kind)));
  render(kind);
  hooks.effects.splice(0).forEach((effect) => effect());
  await settle();
  expect(state(kind).state).toBe("ready");
}
beforeEach(() => {
  hooks.cursor = 0;
  hooks.slots = [];
  hooks.effects = [];
  hooks.cleanups.clear();
  hooks.writes = 0;
  hooks.auth = { userId: "synthetic-owner", orgId: "synthetic-tenant" };
  storage.clear();
  fetcher.mockReset();
  vi.stubGlobal("fetch", fetcher);
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    },
    addEventListener() {},
    removeEventListener() {},
  });
});
afterEach(() => {
  hooks.cleanups.forEach((cleanup) => cleanup());
  vi.unstubAllGlobals();
});

for (const kind of ["inbox", "correction"]) {
  it.each([401, 403])(
    `${kind}: denied pagination removes loaded content and actions (%s)`,
    async (status) => {
      await mount(kind);
      fetcher.mockResolvedValueOnce(Response.json({}, { status }));
      await render(kind).loadMore();
      expect(state(kind).state).toBe("error");
      expect(JSON.stringify(state(kind))).not.toContain(candidate.value);
      const calls = fetcher.mock.calls.length;
      await mutate(kind);
      expect(fetcher).toHaveBeenCalledTimes(calls);
    },
  );
  it.each([401, 403])(
    `${kind}: denied decision removes loaded content without forgetting other uncertain effects (%s)`,
    async (status) => {
      await mount(kind);
      const other = "22222222-2222-4222-8222-222222222222";
      const key =
        kind === "inbox" ? ownerDecisionHoldKey : ownerCorrectionHoldKey;
      storage.set(
        key(hooks.auth.userId, hooks.auth.orgId)!,
        JSON.stringify([other]),
      );
      fetcher.mockResolvedValueOnce(Response.json({}, { status }));
      await mutate(kind);
      expect(state(kind).state).toBe("error");
      expect(JSON.stringify(state(kind))).not.toContain(candidate.value);
      expect([...storage.values()].some((value) => value.includes(id))).toBe(
        false,
      );
      expect([...storage.values()].some((value) => value.includes(other))).toBe(
        true,
      );
    },
  );
  it(`${kind}: transient pagination failure preserves admitted content and retry`, async () => {
    await mount(kind);
    fetcher.mockResolvedValueOnce(Response.json({}, { status: 503 }));
    await render(kind).loadMore();
    expect(state(kind).state).toBe("ready");
    expect(JSON.stringify(state(kind))).toContain(candidate.value);
  });
  it(`${kind}: uncertain write keeps its durable marker`, async () => {
    await mount(kind);
    fetcher.mockRejectedValueOnce(new Error("lost response"));
    await mutate(kind);
    expect(state(kind).state).toBe("ready");
    expect([...storage.values()].some((value) => value.includes(id))).toBe(
      true,
    );
  });
  it(`${kind}: a stale version refusal preserves current content and releases only the declined attempt`, async () => {
    await mount(kind);
    fetcher.mockResolvedValueOnce(Response.json({}, { status: 409 }));
    await mutate(kind);
    expect(state(kind).state).toBe("ready");
    expect([...storage.values()].some((value) => value.includes(id))).toBe(
      false,
    );
  });
  it(`${kind}: denial fences an older successful page`, async () => {
    await mount(kind);
    const pending = deferred();
    fetcher.mockReturnValueOnce(pending.promise);
    const reading = render(kind).loadMore();
    fetcher.mockResolvedValueOnce(Response.json({}, { status: 403 }));
    await mutate(kind);
    pending.resolve(Response.json(page(kind, "Late private data", null)));
    await reading;
    expect(state(kind).state).toBe("error");
    expect(JSON.stringify(state(kind))).not.toContain("Late private data");
  });
  it.each(["userId", "orgId"] as const)(
    `${kind}: old decision denial cannot alter the new %s lifetime`,
    async (field) => {
      await mount(kind);
      const pending = deferred();
      fetcher.mockReturnValueOnce(pending.promise);
      const writing = mutate(kind);
      hooks.auth = { ...hooks.auth, [field]: "changed-synthetic-identity" };
      fetcher.mockResolvedValueOnce(
        Response.json(page(kind, "New owner content")),
      );
      expect(state(kind).state).toBe("loading");
      hooks.effects.splice(0).forEach((effect) => effect());
      await settle();
      expect(JSON.stringify(state(kind))).toContain("New owner content");
      pending.resolve(Response.json({}, { status: 403 }));
      await writing;
      expect(JSON.stringify(state(kind))).toContain("New owner content");
      expect([...storage.values()].some((value) => value.includes(id))).toBe(
        true,
      );
    },
  );
  it(`${kind}: unmounted write leaves receipt recovery intact without view updates`, async () => {
    await mount(kind);
    const pending = deferred();
    fetcher.mockReturnValueOnce(pending.promise);
    const writing = mutate(kind);
    hooks.cleanups.forEach((cleanup) => cleanup());
    hooks.cleanups.clear();
    const writes = hooks.writes;
    pending.resolve(Response.json({}, { status: 403 }));
    await writing;
    expect(hooks.writes).toBe(writes);
    expect([...storage.values()].some((value) => value.includes(id))).toBe(
      true,
    );
  });
}

it.each([401, 403])(
  "inbox: denied outcome read clears content but preserves the unresolved receipt (%s)",
  async (status) => {
    await mount("inbox");
    fetcher.mockRejectedValueOnce(new Error("lost decision response"));
    await mutate("inbox");
    fetcher.mockResolvedValueOnce(Response.json({}, { status }));
    const view = render("inbox");
    if (!("verifyUncertain" in view)) throw new Error("Expected inbox");
    await view.verifyUncertain();
    expect(state("inbox").state).toBe("error");
    expect([...storage.values()].some((value) => value.includes(id))).toBe(
      true,
    );
  },
);

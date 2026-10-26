import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useIntentList as listHook } from "../src/features/meri/conversation/intents/useIntentList";
import type { IntentsAccess } from "../src/shared/meri-intents/access";
import { nativeTaskIntent } from "./meri-intents-native-fixtures";

// Exercise the real hook with controlled render/effect lifetimes, matching the
// existing memory current-access tests without a browser or service.
const hooks = vi.hoisted(() => ({
  cursor: 0,
  slots: [] as unknown[],
  effects: [] as Array<() => void>,
  cleanups: new Map<number, () => void>(),
}));
vi.mock("react", () => ({
  useState(initial: unknown) {
    const index = hooks.cursor++;
    if (!(index in hooks.slots)) hooks.slots[index] = initial;
    return [
      hooks.slots[index],
      (value: unknown) => {
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
  useCallback(fn: unknown, dependencies: unknown[]) {
    const index = hooks.cursor++;
    const prior = hooks.slots[index] as
      | { dependencies: unknown[]; fn: unknown }
      | undefined;
    if (
      !prior ||
      !dependencies.every((value, i) => Object.is(value, prior.dependencies[i]))
    )
      hooks.slots[index] = { dependencies, fn };
    return (hooks.slots[index] as { fn: unknown }).fn;
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

const fixture = nativeTaskIntent(true);
const conversationId = fixture.request.conversationId;
const page = {
  ...fixture.response,
  next: fixture.response.intents[0].deliveryId,
};
let access: IntentsAccess;
let list: ReturnType<typeof vi.fn<IntentsAccess["list"]>>;
function render(current = access, id = conversationId) {
  hooks.cursor = 0;
  return listHook(current, id, undefined);
}
async function effects() {
  hooks.effects.splice(0).forEach((effect) => effect());
  for (let i = 0; i < 8; i++) await Promise.resolve();
}
async function mount() {
  list.mockResolvedValueOnce({ kind: "ok", value: page });
  render();
  await effects();
  expect(render().list.status).toBe("ready");
}
beforeEach(() => {
  hooks.cursor = 0;
  hooks.slots = [];
  hooks.effects = [];
  hooks.cleanups.clear();
  list = vi.fn();
  access = { list, decide: vi.fn() };
});
afterEach(() => hooks.cleanups.forEach((cleanup) => cleanup()));

it.each([
  "UNAUTHENTICATED",
  "ACCESS_DENIED",
  "MEMBERSHIP_REVOKED",
  "MEMBERSHIP_CHANGED",
])(
  "clears loaded task proposals and derived content on paging %s",
  async (code) => {
    await mount();
    list.mockResolvedValueOnce({
      kind: "refused",
      code,
      status:
        code === "MEMBERSHIP_CHANGED"
          ? 409
          : code === "UNAUTHENTICATED"
            ? 401
            : 403,
      outcome: null,
      field: null,
    });
    render().loadMore();
    await effects();
    expect(render().list).toEqual({ status: "unavailable" });
    expect(JSON.stringify(render().list)).not.toContain("Updated task");
  },
);

it.each(["transport", "service"])(
  "retains admitted task rows and retry cursor on a %s paging outage",
  async (kind) => {
    await mount();
    list.mockResolvedValueOnce(
      kind === "transport"
        ? { kind: "unavailable", dispatched: true }
        : {
            kind: "refused",
            status: 502,
            code: "PRODUCT_UNAVAILABLE",
            outcome: null,
            field: null,
          },
    );
    render().loadMore();
    await effects();
    expect(render().list).toEqual({
      status: "ready",
      items: page.intents,
      next: page.next,
      loadingMore: false,
    });
    list.mockResolvedValueOnce({
      kind: "ok",
      value: { ...page, intents: [], next: null },
    });
    render().loadMore();
    await effects();
    expect(render().list).toEqual({
      status: "ready",
      items: page.intents,
      next: null,
      loadingMore: false,
    });
  },
);

it("ignores an older successful page after a refresh denial", async () => {
  await mount();
  let finish!: (value: Awaited<ReturnType<IntentsAccess["list"]>>) => void;
  list.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  render().loadMore();
  list.mockResolvedValueOnce({
    kind: "refused",
    status: 403,
    code: "ACCESS_DENIED",
    outcome: null,
    field: null,
  });
  await render().refresh();
  finish({ kind: "ok", value: page });
  await effects();
  expect(render().list).toEqual({ status: "unavailable" });
});

it.each(["identity", "conversation"])(
  "ignores successful task content from the prior %s",
  async (kind) => {
    await mount();
    let finish!: (value: Awaited<ReturnType<IntentsAccess["list"]>>) => void;
    list.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    render().loadMore();
    const nextList = vi.fn<IntentsAccess["list"]>().mockResolvedValue({
      kind: "ok",
      value: { ...page, intents: [], next: null },
    });
    const nextAccess =
      kind === "identity" ? { ...access, list: nextList } : access;
    const nextId =
      kind === "conversation"
        ? "00000000-0000-4000-8000-000000000999"
        : conversationId;
    if (kind === "conversation") list.mockImplementationOnce(nextList);
    expect(render(nextAccess, nextId).list).toEqual({ status: "loading" });
    await effects();
    finish({ kind: "ok", value: page });
    await effects();
    expect(render(nextAccess, nextId).list).toEqual({
      status: "ready",
      items: [],
      next: null,
      loadingMore: false,
    });
  },
);

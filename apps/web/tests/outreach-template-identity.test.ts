import { beforeEach, expect, it, vi } from "vitest";
import { createCapiroApi } from "../src/shared/capiro/http";
import { capiroOperations } from "../src/shared/capiro/registry";
import { templateCreationKey } from "../src/features/modules/engagement/outreach/template-creation";

// Runs the actual hook's render/commit/cleanup boundaries with deterministic hooks.
// Transport, owner and schemas are real; this is not browser/React DOM acceptance.
const h = vi.hoisted(() => ({
  slots: [] as unknown[],
  cursor: 0,
  effects: new Map<number, { deps: unknown[]; cleanup?: () => void }>(),
  pending: [] as (() => void)[],
  api: undefined as unknown,
  user: "actor-a",
  tenant: "tenant-a",
  error: false,
}));
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useRef(value: unknown) {
    const i = h.cursor++;
    if (!(i in h.slots)) h.slots[i] = { current: value };
    return h.slots[i];
  },
  useState(value: unknown) {
    const i = h.cursor++;
    if (!(i in h.slots))
      h.slots[i] = typeof value === "function" ? value() : value;
    return [
      h.slots[i],
      (next: unknown) => {
        h.slots[i] = typeof next === "function" ? next(h.slots[i]) : next;
      },
    ];
  },
  useLayoutEffect(effect: () => void | (() => void), deps: unknown[]) {
    const i = h.cursor++;
    const old = h.effects.get(i);
    if (!old || deps.some((value, index) => value !== old.deps[index]))
      h.pending.push(() => {
        old?.cleanup?.();
        h.effects.set(i, { deps, cleanup: effect() || undefined });
      });
  },
}));
vi.mock("../src/shared/capiro/CapiroBoundary", () => ({
  useCapiro: () => h.api,
}));
vi.mock("../src/shared/portfolio/auth/identity", () => ({
  useIdentity: () => ({
    data: { user: { id: h.user }, tenant: { id: h.tenant } },
    isError: h.error,
  }),
}));
import { useCampaignTemplateCreation } from "../src/features/modules/engagement/outreach/useCampaignTemplateCreation";
const input = {
  name: "Synthetic template",
  prompt: "Only use synthetic fixture context.",
};
const id = "10000000-0000-4000-8000-000000000001";
let store: Map<string, string>;
beforeEach(() => {
  h.slots = [];
  h.cursor = 0;
  h.effects = new Map();
  h.pending = [];
  h.user = "actor-a";
  h.tenant = "tenant-a";
  h.error = false;
  store = new Map();
  vi.stubGlobal("window", {
    sessionStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
    },
  });
});
function renderHarness(callback = vi.fn()) {
  h.cursor = 0;
  return HookHarness(callback);
}
function HookHarness(
  callback: Parameters<typeof useCampaignTemplateCreation>[0],
) {
  return useCampaignTemplateCreation(callback);
}
function commit() {
  const jobs = h.pending;
  h.pending = [];
  for (const job of jobs) job();
}
it("suppresses stale hook state on actor replacement before effects, aborts old completion and does not select for the new actor", async () => {
  let finish!: (response: Response) => void;
  const fetcher = vi.fn(
    () =>
      new Promise<Response>((resolve) => {
        finish = resolve;
      }),
  );
  h.api = createCapiroApi(capiroOperations, { fetcher });
  const selected = vi.fn();
  renderHarness(selected);
  commit();
  const old = renderHarness(selected);
  const running = old.owner!.create(input);
  expect(fetcher).toHaveBeenCalledOnce();
  h.user = "actor-b";
  h.tenant = "tenant-b";
  const replaced = renderHarness(selected);
  expect(replaced.owner).toBeUndefined();
  expect(replaced.state.status).toBe("blocked");
  commit();
  finish(Response.json({ id }));
  await running;
  expect(selected).not.toHaveBeenCalled();
  expect(renderHarness(selected).state.status).toBe("ready");
  expect(store.has(templateCreationKey("tenant-a", "actor-a"))).toBe(true);
  expect(fetcher).toHaveBeenCalledOnce();
});
it("fences an API lifetime replacement even with unchanged canonical identity", async () => {
  let finish!: (response: Response) => void;
  const fetcher = vi.fn(
    () =>
      new Promise<Response>((resolve) => {
        finish = resolve;
      }),
  );
  h.api = createCapiroApi(capiroOperations, { fetcher });
  const selected = vi.fn();
  renderHarness(selected);
  commit();
  const running = renderHarness(selected).owner!.create(input);
  h.api = createCapiroApi(capiroOperations, { fetcher: vi.fn() });
  expect(renderHarness(selected).owner).toBeUndefined();
  commit();
  finish(Response.json({ id }));
  await running;
  expect(selected).not.toHaveBeenCalled();
  expect(renderHarness(selected).state.status).toBe("unknown");
});
it("withholds creation for unverifiable identity and never clears another actor journal", () => {
  const fetcher = vi.fn();
  h.api = createCapiroApi(capiroOperations, { fetcher });
  store.set(
    templateCreationKey("tenant-a", "actor-a"),
    JSON.stringify({ version: 1, status: "unknown" }),
  );
  h.error = true;
  expect(renderHarness().owner).toBeUndefined();
  commit();
  expect(fetcher).not.toHaveBeenCalled();
  expect(store.size).toBe(1);
  h.error = false;
  h.user = "";
  expect(renderHarness().owner).toBeUndefined();
  commit();
  expect(fetcher).not.toHaveBeenCalled();
});

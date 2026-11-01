import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { useConversationConnection } from "../src/features/meri/conversation/useConversationConnection";
import { syncMeriTabIdentity } from "../src/shared/meri-conversations/tab-journal";
// The existing controlled-hook pattern exercises real host/client/read callbacks without a browser.
const hooks = vi.hoisted(() => ({
  cursor: 0,
  slots: [] as any[],
  pending: [] as Array<() => void>,
  cleanups: new Map<number, () => void>(),
  dirty: false,
}));
const state = vi.hoisted(() => ({
  cache: null as any,
  status: "ready",
  reason: "expiry",
  hints: [] as any[],
  bind: true,
}));
vi.mock("react", async (original) => {
  const memo = (make: () => unknown, deps: unknown[]) => {
    const i = hooks.cursor++,
      old = hooks.slots[i];
    if (!old || !deps.every((v, n) => Object.is(v, old.deps[n])))
      hooks.slots[i] = { deps, value: make() };
    return hooks.slots[i].value;
  };
  return {
    ...(await original<typeof import("react")>()),
    useMemo: memo,
    useSyncExternalStore: (_subscribe: unknown, get: () => unknown) => get(),
    useLayoutEffect: () => {},
    useCallback: (fn: unknown, deps: unknown[]) => memo(() => fn, deps),
    useRef: (value: unknown) => {
      const i = hooks.cursor++;
      return (hooks.slots[i] ??= { current: value });
    },
    useState: (initial: unknown) => {
      const i = hooks.cursor++;
      if (!(i in hooks.slots))
        hooks.slots[i] = typeof initial === "function" ? initial() : initial;
      return [
        hooks.slots[i],
        (v: any) => {
          hooks.slots[i] = typeof v === "function" ? v(hooks.slots[i]) : v;
          hooks.dirty = true;
        },
      ];
    },
    useEffect: (run: () => void | (() => void), deps: unknown[]) => {
      const i = hooks.cursor++,
        old = hooks.slots[i];
      if (old && deps.every((v, n) => Object.is(v, old[n]))) return;
      hooks.slots[i] = deps;
      hooks.pending.push(() => {
        hooks.cleanups.get(i)?.();
        const cleanup = run();
        if (cleanup) hooks.cleanups.set(i, cleanup);
      });
    },
  };
});

vi.mock("@tanstack/react-query", async (original) => ({
  ...(await original<typeof import("@tanstack/react-query")>()),
  useQueryClient: () => state.cache,
}));
vi.mock("../src/shared/meri-conversations/host-controller", () => ({
  ConversationHostController: class {
    options: any;
    constructor(options: any) {
      this.options = options;
      state.hints.push(structuredClone(options.hints));
    }
    attach = () => () => {};
    setClientAvailable = () => {};
    connect = async () => {
      if (state.bind)
        this.options.onBound({
          ...account,
          selectedClientId: null,
          ...research,
          runId: id(5),
        });
    };
    subscribe = () => () => {};
    getSnapshot = () => ({ status: state.status });
    getExpirationReason = () => state.reason;
    getIssuanceStatus = () => null;
    revoke = () => {
      state.reason = "access-lost";
      state.status = "expired";
    };
  },
}));
const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const account = { tenantId: id(1), actorId: id(2) };
const research = {
  conversationId: id(4),
  scopeKind: "research_portfolio" as const,
  scope: {
    kind: "research_portfolio" as const,
    researchPortfolioId: id(3),
    researchPortfolioName: "Original",
    researchPortfolioRevision: 4,
    scopeVersion: "a".repeat(64),
  },
};
let connection: ReturnType<typeof useConversationConnection>;
function render() {
  hooks.cursor = 0;
  hooks.dirty = false;
  connection = useConversationConnection(
    account,
    null,
    () => 0,
    id(4),
    research,
  );
  hooks.pending.splice(0).forEach((run) => run());
}
beforeEach(() => {
  hooks.slots = [];
  hooks.pending = [];
  hooks.cleanups.clear();
  state.cache = new QueryClient();
  state.hints = [];
  state.status = "ready";
  state.reason = "expiry";
  state.bind = true;
  const data = new Map<string, string>();
  const storage = {
    get length() {
      return data.size;
    },
    key: (i: number) => [...data.keys()][i] ?? null,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => {
      data.set(k, v);
    },
    removeItem: (k: string) => {
      data.delete(k);
    },
  };
  vi.stubGlobal("window", { sessionStorage: storage });
  syncMeriTabIdentity("synthetic", storage);
});
afterEach(() => {
  hooks.cleanups.forEach((c) => c());
  vi.unstubAllGlobals();
});
it("actual opening/expiry renewal/explicit successor preserve the original captured Research subject", () => {
  render();
  expect(state.hints[0]).toEqual({ ...research, clientId: null });
  state.status = "expired";
  render();
  render();
  expect(state.hints.at(-1)).toEqual({
    ...research,
    clientId: null,
    runId: id(5),
  });
  state.status = "ready";
  render();
  connection.reopen({ target: { conversationId: id(4), runId: id(6) } });
  render();
  expect(state.hints.at(-1)).toEqual({
    ...research,
    clientId: null,
    runId: id(6),
  });
  expect(() =>
    connection.reopen({ target: { conversationId: id(9), runId: id(6) } }),
  ).toThrow("Research conversation target unavailable");
});
it("failed initial issuance retries the exact Research hint and never General", () => {
  state.bind = false;
  state.status = "unavailable";
  render();
  connection.retry();
  render();
  expect(state.hints).toHaveLength(2);
  expect(state.hints[1]).toEqual({ ...research, clientId: null });
});
it("access loss does not auto-renew; explicit retry uses a fresh selection owner with the same capture", () => {
  render();
  state.reason = "access-lost";
  state.status = "expired";
  render();
  render();
  expect(connection.accessLost).toBe(true);
  expect(state.hints).toHaveLength(1);
  connection.retry();
  render();
  expect(state.hints.at(-1)).toEqual({
    ...research,
    clientId: null,
    runId: id(5),
  });
});

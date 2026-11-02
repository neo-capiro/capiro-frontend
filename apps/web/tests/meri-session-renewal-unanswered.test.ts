import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { useConversationConnection } from "../src/features/meri/conversation/useConversationConnection";
import { syncMeriTabIdentity } from "../src/shared/meri-conversations/tab-journal";
// The existing controlled-hook pattern (research-routing-renewal.test.ts) exercises the real hook without a browser.
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
  reason: "expiry" as string | undefined,
  issuance: undefined as number | undefined,
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
          selectedClientId: clientId,
          conversationId,
          runId: id(5),
        });
    };
    subscribe = () => () => {};
    getSnapshot = () => ({ status: state.status });
    getExpirationReason = () => state.reason;
    getIssuanceStatus = () => state.issuance;
    revoke = () => {
      state.reason = "access-lost";
      state.status = "expired";
    };
  },
}));
const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const account = { tenantId: id(1), actorId: id(2) };
const clientId = id(3),
  conversationId = id(4);
let connection: ReturnType<typeof useConversationConnection>;
function render() {
  hooks.cursor = 0;
  hooks.dirty = false;
  connection = useConversationConnection(
    account,
    clientId,
    () => 0,
    conversationId,
  );
  hooks.pending.splice(0).forEach((run) => run());
}
/** The tab holds the conversation, its session reaches its renewal lead, and the renewal issuance answers `status`. */
function renewalAnswered(status: number) {
  render();
  expect(connection.state.status).toBe("ready");
  state.status = "expired";
  state.reason = "renewal";
  render();
  render();
  expect(state.hints.at(-1)).toMatchObject({ conversationId, runId: id(5) });
  state.bind = false;
  state.status = "unavailable";
  state.reason = status === 401 || status === 403 ? "access-lost" : undefined;
  state.issuance = status;
  render();
}
beforeEach(() => {
  hooks.slots = [];
  hooks.pending = [];
  hooks.cleanups.clear();
  state.cache = new QueryClient();
  state.hints = [];
  state.status = "ready";
  state.reason = "expiry";
  state.issuance = undefined;
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

it("a renewal that control did not answer (503) keeps the held conversation readable and reconnecting, never access lost", () => {
  renewalAnswered(503);
  expect(connection.state.status).toBe("unavailable");
  expect(connection.unverified).toBe(true);
  expect(connection.unreachable).toBe(true);
  expect(connection.accessLost).toBe(false);
  expect(connection.conversationId).toBe(conversationId);
  // The automatic retry asks for exactly the bound conversation and run again, on a fresh host.
  const hosts = state.hints.length;
  connection.retry();
  render();
  expect(state.hints).toHaveLength(hosts + 1);
  expect(state.hints.at(-1)).toMatchObject({ conversationId, runId: id(5) });
});

it("an older control's 401 for the same case keeps the transcript with the manual check, as before", () => {
  renewalAnswered(401);
  expect(connection.unverified).toBe(true);
  expect(connection.unreachable).toBe(false);
  expect(connection.accessLost).toBe(false);
});

it("a refusal (403) on renewal still hides the conversation", () => {
  renewalAnswered(403);
  expect(connection.unverified).toBe(false);
  expect(connection.unreachable).toBe(false);
  expect(connection.accessLost).toBe(true);
});

it("a first open that control did not answer has nothing to keep: it stays the reconnect panel", () => {
  state.bind = false;
  state.status = "unavailable";
  state.reason = undefined;
  state.issuance = 503;
  render();
  expect(connection.state.status).toBe("unavailable");
  expect(connection.unverified).toBe(false);
  expect(connection.unreachable).toBe(true);
  expect(connection.accessLost).toBe(false);
  expect(state.hints).toHaveLength(1);
});

import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { useConversationConnection } from "../src/features/meri/conversation/useConversationConnection";
import { syncMeriTabIdentity } from "../src/shared/meri-conversations/tab-journal";
import type { ConversationContext } from "../src/shared/meri-conversations/session";
// The existing controlled-hook pattern (research-routing-renewal.test.ts) exercises the real hook without a browser.
type Slot = { deps: unknown[]; value: unknown };
const hooks = vi.hoisted(() => ({
  cursor: 0,
  slots: [] as unknown[],
  pending: [] as Array<() => void>,
  cleanups: new Map<number, () => void>(),
  dirty: false,
}));
type Hints = Readonly<{
  conversationId?: string;
  runId?: string;
  clientId: string | null;
}>;
const state = vi.hoisted(() => ({
  cache: null as QueryClient | null,
  status: "ready",
  reason: "expiry" as string | undefined,
  issuance: undefined as number | undefined,
  hints: [] as Hints[],
  bind: true,
  /** The connection's clock: each binding is recorded at it. */
  clock: 0,
  /** The run each new host's session binds. */
  run: 5,
}));
vi.mock("react", async (original) => {
  const memo = (make: () => unknown, deps: unknown[]) => {
    const i = hooks.cursor++,
      old = hooks.slots[i] as Slot | undefined;
    if (!old || !deps.every((v, n) => Object.is(v, old.deps[n])))
      hooks.slots[i] = { deps, value: make() };
    return (hooks.slots[i] as Slot).value;
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
        hooks.slots[i] =
          typeof initial === "function"
            ? (initial as () => unknown)()
            : initial;
      return [
        hooks.slots[i],
        (v: unknown) => {
          hooks.slots[i] =
            typeof v === "function"
              ? (v as (previous: unknown) => unknown)(hooks.slots[i])
              : v;
          hooks.dirty = true;
        },
      ];
    },
    useEffect: (run: () => void | (() => void), deps: unknown[]) => {
      const i = hooks.cursor++,
        old = hooks.slots[i] as unknown[] | undefined;
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
    options: { hints: Hints; onBound: (context: ConversationContext) => void };
    constructor(options: {
      hints: Hints;
      onBound: (context: ConversationContext) => void;
    }) {
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
          runId: id(state.run),
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
  // The controlled-hook harness above replaces React's hooks, so the hook runs outside a component.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  connection = useConversationConnection(
    account,
    clientId,
    () => state.clock,
    conversationId,
  );
  hooks.pending.splice(0).forEach((run) => run());
}
/** The renewal issuance of the held conversation answers `status` after the controller's own bounded retries. */
function renewalFails(status: number) {
  state.bind = false;
  state.status = "unavailable";
  state.reason = status === 401 || status === 403 ? "access-lost" : undefined;
  state.issuance = status;
  // The second pass lets the connection's own schedule observe the failed state (an effect) before it is read.
  render();
  render();
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
  renewalFails(status);
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
  state.clock = 0;
  state.run = 5;
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
  vi.stubGlobal("window", {
    sessionStorage: storage,
    location: { search: "" },
  });
  syncMeriTabIdentity("synthetic", storage);
});
afterEach(() => {
  hooks.cleanups.forEach((c) => c());
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

it("a renewal that control did not answer (503) keeps the held conversation readable and reconnecting, never access lost", () => {
  renewalAnswered(503);
  expect(connection.state.status).toBe("unavailable");
  expect(connection.unverified).toBe(true);
  expect(connection.unreachable).toBe(true);
  expect(connection.accessLost).toBe(false);
  expect(connection.reconnecting).toBe(true);
  expect(connection.conversationId).toBe(conversationId);
  // An explicit retry asks for exactly the bound conversation and run again, on a fresh host.
  const hosts = state.hints.length;
  connection.resetReconnect();
  connection.retry();
  render();
  expect(state.hints).toHaveLength(hosts + 1);
  expect(state.hints.at(-1)).toMatchObject({ conversationId, runId: id(5) });
});

it("the reconnect ladder outlives each attempt's host: 2 s, 4 s, 8 s between attempts, reset by success", () => {
  vi.useFakeTimers();
  renewalAnswered(503);
  const hosts = () => state.hints.length;
  for (const delayMs of [2000, 4000, 8000]) {
    expect(connection.reconnecting).toBe(true);
    const before = hosts();
    vi.advanceTimersByTime(delayMs - 1);
    expect(hosts()).toBe(before);
    vi.advanceTimersByTime(1);
    expect(hosts()).toBe(before + 1);
    expect(state.hints.at(-1)).toMatchObject({ conversationId, runId: id(5) });
    // The attempt is in flight on its new host (idle → connecting): nothing else is scheduled...
    state.status = "connecting";
    render();
    expect(connection.reconnecting).toBe(false);
    expect(connection.unverified).toBe(false);
    // ...and the next unanswered renewal continues the same ladder instead of starting at 2 s again.
    renewalFails(503);
  }
  state.status = "ready";
  state.bind = true;
  render();
  render();
  expect(connection.state.status).toBe("ready");
  expect(connection.reconnecting).toBe(false);
  // A later outage starts the ladder over.
  state.status = "expired";
  state.reason = "renewal";
  render();
  render();
  renewalFails(503);
  const before = hosts();
  vi.advanceTimersByTime(2000);
  expect(hosts()).toBe(before + 1);
});

it("control's 401 SESSION_REFUSED on an ordinary renewal is a definitive refusal: it hides the conversation", () => {
  // Serving control answers 503 for an authority that did not answer and 401 only for a definitive refusal.
  renewalAnswered(401);
  expect(connection.unverified).toBe(false);
  expect(connection.unreachable).toBe(false);
  expect(connection.accessLost).toBe(true);
  expect(connection.reconnecting).toBe(false);
});

it("a refusal (403) on renewal still hides the conversation", () => {
  renewalAnswered(403);
  expect(connection.unverified).toBe(false);
  expect(connection.unreachable).toBe(false);
  expect(connection.accessLost).toBe(true);
  expect(connection.reconnecting).toBe(false);
});

it("a first open that control did not answer has nothing to keep: it stays the reconnect panel", () => {
  renewalFails(503);
  expect(connection.state.status).toBe("unavailable");
  expect(connection.unverified).toBe(false);
  expect(connection.unreachable).toBe(true);
  expect(connection.accessLost).toBe(false);
  expect(connection.reconnecting).toBe(false);
  expect(state.hints).toHaveLength(1);
});

/** The held conversation's session ends for `reason` and the connection reacts; a renewal's new host starts connecting. */
function ended(reason: string) {
  state.clock += 1_000;
  state.status = "expired";
  state.reason = reason;
  const hosts = state.hints.length;
  render();
  if (state.hints.length > hosts) {
    state.status = "connecting";
    state.reason = undefined;
  }
  render();
}
/** The renewal's new host is issued its session. */
function renewedReady() {
  state.status = "ready";
  render();
  render();
}

it("a stream credential control no longer holds (SESSION_REFUSED) is renewed once for the same exact binding", () => {
  render();
  render();
  const hosts = state.hints.length;
  ended("refused");
  expect(state.hints).toHaveLength(hosts + 1);
  expect(state.hints.at(-1)).toMatchObject({ conversationId, runId: id(5) });
  expect(connection.accessLost).toBe(false);
  expect(connection.renewing).toBe(true);
  renewedReady();
  expect(connection.state.status).toBe("ready");
  expect(connection.accessLost).toBe(false);
});

it("the renewed credential refused again before an ordinary renewal is access lost, never another renewal", () => {
  render();
  render();
  ended("refused");
  renewedReady();
  const hosts = state.hints.length;
  ended("refused");
  render();
  expect(state.hints).toHaveLength(hosts);
  expect(state.reason).toBe("access-lost");
  expect(connection.accessLost).toBe(true);
});

it("an ordinary renewal in between lets a later refusal renew again", () => {
  render();
  render();
  ended("refused");
  renewedReady();
  ended("renewal");
  renewedReady();
  const hosts = state.hints.length;
  ended("refused");
  expect(state.hints).toHaveLength(hosts + 1);
  expect(connection.accessLost).toBe(false);
});

it("a refused credential whose renewal issuance control refuses (401 SESSION_REFUSED) hides the conversation", () => {
  // Control's stream owner answers every definitive recheck failure (changed identity or member fact, removed
  // client) as SESSION_REFUSED, and its issuance refuses definitively with 401: a revoked member is not kept.
  render();
  render();
  ended("refused");
  renewalFails(401);
  expect(connection.accessLost).toBe(true);
  expect(connection.unverified).toBe(false);
});

it("a refused credential whose renewal issuance found the authority unavailable (503) is unverified, not revoked", () => {
  render();
  render();
  ended("refused");
  renewalFails(503);
  expect(connection.accessLost).toBe(false);
  expect(connection.unverified).toBe(true);
});

it("an ordinary renewal after a refused one: 401 is lost access, 503 stays unverified", () => {
  render();
  render();
  ended("refused");
  renewedReady();
  ended("renewal");
  renewalFails(503);
  expect(connection.accessLost).toBe(false);
  expect(connection.unverified).toBe(true);
  renewalFails(401);
  expect(connection.accessLost).toBe(true);
  expect(connection.unverified).toBe(false);
});

it("a session bound to another run forgets the refused binding: returning to the first run renews once again", () => {
  render();
  render();
  ended("refused");
  renewedReady();
  // The person opens another run, then returns to the first one: each binding is a fresh session.
  for (const run of [6, 5]) {
    state.run = run;
    state.clock += 1_000;
    state.status = "connecting";
    connection.reopen({ target: { conversationId, runId: id(run) } });
    render();
    renewedReady();
  }
  const hosts = state.hints.length;
  ended("refused");
  expect(state.hints).toHaveLength(hosts + 1);
  expect(connection.accessLost).toBe(false);
});

// A recovery opening is read-only. The retry paths recover the last exact binding; they must never
// re-supply the prompt of an authorized send opening they replaced, or the recovered port can submit
// that message again with no user action. The journals, drafts and UNKNOWN stay exactly as they were.
const retainedPrompt = "Synthetic retained prompt";

/** An authorized send opens the reserved target with the prompt that waits for its session. */
function openedForSend() {
  render();
  render();
  state.status = "connecting";
  connection.reopen({
    target: { conversationId, runId: id(5) },
    pending: retainedPrompt,
  });
  render();
  expect(connection.pending).toBe(retainedPrompt);
}

it("a recovery after expiry reopens the exact binding without the send prompt", () => {
  openedForSend();
  const hosts = state.hints.length;
  // An expired session whose renewal this tab has not scheduled yet: the retry ladder asks control for
  // the exact binding again, and that recovery must stay read-only.
  state.status = "expired";
  state.reason = undefined;
  connection.retry();
  render();
  expect(state.hints).toHaveLength(hosts + 1);
  expect(state.hints).toHaveLength(hosts + 1);
  // The recovered opening reads the same exact conversation and run...
  expect(state.hints.at(-1)).toMatchObject({ conversationId, runId: id(5) });
  // ...and hands the consumer no initial prompt to submit.
  expect(connection.pending).toBeUndefined();
});

it("a recovery on an unreachable renewal also drops the send prompt", () => {
  openedForSend();
  const hosts = state.hints.length;
  state.status = "unavailable";
  state.reason = undefined;
  state.issuance = 503;
  connection.retry();
  render();
  expect(state.hints).toHaveLength(hosts + 1);
  expect(state.hints.at(-1)).toMatchObject({ conversationId, runId: id(5) });
  expect(connection.pending).toBeUndefined();
});

it("the automatic renewal ladder never carries the prompt either", () => {
  openedForSend();
  const hosts = state.hints.length;
  state.status = "expired";
  state.reason = "renewal";
  render();
  render();
  expect(state.hints).toHaveLength(hosts + 1);
  expect(state.hints.at(-1)).toMatchObject({ conversationId, runId: id(5) });
  expect(connection.pending).toBeUndefined();
});

it("an ordinary authorized send opening still carries its own prompt", () => {
  render();
  render();
  state.status = "connecting";
  connection.reopen({
    target: { conversationId, runId: id(6) },
    pending: retainedPrompt,
  });
  render();
  expect(connection.pending).toBe(retainedPrompt);
  // Opening without a prompt stays without one.
  state.status = "connecting";
  connection.reopen({ target: { conversationId, runId: id(6) } });
  render();
  expect(connection.pending).toBeUndefined();
});

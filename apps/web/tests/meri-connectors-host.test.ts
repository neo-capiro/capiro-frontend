import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { setTimeout as pause } from "node:timers/promises";
import type { ReactElement } from "react";
import { ConnectorLibraryHost } from "../src/features/meri/screens/settings/ConnectorLibraryHost";
import { CapiroApiError } from "../src/shared/capiro/http";

// The existing controlled-hook pattern exercises real host/client/read callbacks without a browser.
const hooks = vi.hoisted(() => ({
  cursor: 0,
  slots: [] as any[],
  pending: [] as Array<() => void>,
  cleanups: new Map<number, () => void>(),
  dirty: false,
}));
const state = vi.hoisted(() => ({ request: vi.fn(), actor: "actor" }));
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
vi.mock("../src/shared/portfolio/auth/identity", () => ({
  useIdentity: () => ({
    data: { user: { id: state.actor }, tenant: { id: "tenant" } },
  }),
  canAdminister: () => false,
}));
vi.mock("../src/shared/capiro/CapiroBoundary", () => {
  const api = { request: state.request };
  return { useCapiro: () => api };
});
vi.mock("../src/features/meri/screens/settings/ConnectorLibraryScreen", () => ({
  ConnectorLibraryScreen: () => null,
}));
vi.mock("../src/shared/meri-conversations/current-reads", () => ({
  ConversationReadUnavailable: class extends Error {},
}));

const entry = {
  id: "notion",
  name: "Notion",
  authType: "oauth",
  transport: "http",
  endpoint: "https://mcp.notion.com/mcp",
  defaultScope: "user",
  category: "productivity",
  connected: false,
};
let props: any;
let rows: any[];
let data: Map<string, string>;
let assign: ReturnType<typeof vi.fn>;
function unmount() {
  hooks.cleanups.forEach((cleanup) => cleanup());
  hooks.cleanups.clear();
  hooks.slots = [];
  hooks.pending = [];
  hooks.dirty = false;
}
function render() {
  hooks.cursor = 0;
  hooks.dirty = false;
  const child = ConnectorLibraryHost({
    chrome: {} as never,
  }) as ReactElement<any>;
  const screen = (child.type as (props: any) => ReactElement<any>)(child.props);
  props = screen.props;
  hooks.pending.splice(0).forEach((run) => run());
}
async function flush() {
  for (let i = 0; i < 30; i++) {
    if (hooks.dirty) render();
    await pause(1);
    if (!hooks.dirty) return;
  }
  throw new Error("Connector host did not settle");
}
beforeEach(async () => {
  unmount();
  state.actor = "actor";
  rows = [];
  data = new Map();
  assign = vi.fn();
  vi.stubGlobal("window", {
    sessionStorage: {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => {
        data.set(key, value);
      },
    },
    location: { assign },
  });
  state.request.mockReset().mockImplementation(async (key: string) => {
    if (key === "meri.connectors.catalog")
      return { oauthConfigured: true, connectors: [entry] };
    if (key === "meri.connectors.servers") return rows;
    throw new CapiroApiError(502, "Unknown create outcome");
  });
  render();
  await flush();
});
afterEach(() => {
  unmount();
  vi.unstubAllGlobals();
});

it("blocks a duplicate create after an unknown outcome, remount, and an empty current read", async () => {
  props.onConnect("notion", {});
  await flush();
  expect(
    state.request.mock.calls.filter(([key]) => key === "meri.connectors.add"),
  ).toHaveLength(1);
  unmount();
  render();
  await flush();
  expect(props.view.groups[0].cards[0].reconciling).toBe(true);
  props.onConnect("notion", {});
  await flush();
  expect(
    state.request.mock.calls.filter(([key]) => key === "meri.connectors.add"),
  ).toHaveLength(1);
});

it("records uncertainty before a pending create and cannot redirect after the account unmounts", async () => {
  let finish!: (value: unknown) => void;
  state.request.mockImplementation(async (key: string) => {
    if (key === "meri.connectors.add")
      return new Promise((resolve) => {
        finish = resolve;
      });
    if (key === "meri.connectors.oauthStart")
      return { authUrl: "https://provider.example/authorize" };
  });
  props.onConnect("notion", {});
  expect([...data.values()]).toEqual(['["notion"]']);
  props.onConnect("notion", {});
  expect(
    state.request.mock.calls.filter(([key]) => key === "meri.connectors.add"),
  ).toHaveLength(1);
  unmount();
  finish({ id: "stored-row", catalogId: "notion", oauthRequired: true });
  await pause(5);
  expect(assign).not.toHaveBeenCalled();
  expect(
    state.request.mock.calls.filter(
      ([key]) => key === "meri.connectors.oauthStart",
    ),
  ).toHaveLength(0);
  expect([...data.values()]).toEqual(['["notion"]']);
});

it("does not dispatch a create if persistence is unavailable", async () => {
  window.sessionStorage.setItem = () => {
    throw new Error("quota");
  };
  props.onConnect("notion", {});
  await flush();
  expect(
    state.request.mock.calls.filter(([key]) => key === "meri.connectors.add"),
  ).toHaveLength(0);
});

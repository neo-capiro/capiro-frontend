import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { ReactElement } from "react";
import { ResearchConversationHost } from "../src/features/meri/conversation/ResearchConversationHost";
import { syncMeriTabIdentity } from "../src/shared/meri-conversations/tab-journal";
import { CapiroApiError } from "../src/shared/capiro/http";
// The existing controlled-hook pattern exercises real host/client/read callbacks without a browser.
const hooks = vi.hoisted(() => ({
  cursor: 0,
  slots: [] as any[],
  pending: [] as Array<() => void>,
  cleanups: new Map<number, () => void>(),
  dirty: false,
}));
const state = vi.hoisted(() => ({
  request: vi.fn(),
  replace: vi.fn(),
  session: vi.fn(),
  query: {} as any,
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

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: state.replace }),
}));
vi.mock("../src/shared/capiro/CapiroBoundary", () => ({
  useCapiro: () => ({ request: state.request }),
}));
vi.mock("../src/shared/capiro/queries", () => ({
  useCapiroQuery: () => state.query,
}));
vi.mock("../src/features/meri/conversation/useConversationSession", () => ({
  useConversationSession: state.session,
}));
vi.mock("../src/features/meri/conversation/ConversationView", () => ({
  ConversationView: () => null,
}));
const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const account = { tenantId: id(1), actorId: id(2) };
const capture = {
  kind: "research_portfolio",
  researchPortfolioId: id(3),
  researchPortfolioName: "Captured Research",
  researchPortfolioRevision: 4,
  scopeVersion: "a".repeat(64),
};
const row = {
  id: id(4),
  tenantId: id(1),
  userId: id(2),
  clientId: null,
  status: "active",
  archivedAt: null,
  trashedAt: null,
  metadata: { researchPortfolioScope: capture },
};
let props: any, tree: ReactElement<any>;
function unmount() {
  hooks.cleanups.forEach((c) => c());
  hooks.cleanups.clear();
  hooks.slots = [];
  hooks.pending = [];
}
function render() {
  hooks.cursor = 0;
  hooks.dirty = false;
  const child = ResearchConversationHost(props) as ReactElement<any>;
  tree =
    typeof child.type === "function" ? (child.type as any)(child.props) : child;
  hooks.pending.splice(0).forEach((run) => run());
  return tree;
}
function elements(node: any): any[] {
  if (!node || typeof node !== "object") return [];
  if (Array.isArray(node)) return node.flatMap(elements);
  return [node, ...elements(node.props?.children)];
}
function textOf(node: any): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (!node || typeof node !== "object") return "";
  if (Array.isArray(node)) return node.map(textOf).join("");
  return textOf(node.props?.children);
}
function click(label: string) {
  const button = elements(tree).find(
    (n) => n.type === "button" && n.props.children === label,
  );
  expect(button).toBeDefined();
  return button.props.onClick();
}
beforeEach(() => {
  unmount();
  vi.clearAllMocks();
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
  props = { account, portfolioId: id(3), canCreate: true };
  state.query = {
    loading: false,
    error: undefined,
    data: row,
    reload: vi.fn(),
  };
  state.request.mockResolvedValue(row);
  state.session.mockReturnValue({});
});
afterEach(() => {
  unmount();
  vi.unstubAllGlobals();
});
it("does not create on mount; one click dispatches one canonical ID, then routes the returned conversation", async () => {
  render();
  expect(state.request).not.toHaveBeenCalled();
  click("Start Research conversation");
  click("Start Research conversation");
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  expect(state.request).toHaveBeenCalledTimes(1);
  expect(state.request.mock.calls[0]![0]).toBe(
    "meri.research.conversation.create",
  );
  expect(state.request.mock.calls[0]![1]).toEqual({
    body: { researchPortfolioId: id(3) },
  });
  expect(state.replace).toHaveBeenCalledWith(
    `/meri?scope=research_portfolio&conversationId=${id(4)}`,
  );
});
it("a lost reply survives remount and offers history without retrying create", async () => {
  state.request.mockRejectedValue(Error("lost"));
  render();
  click("Start Research conversation");
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  unmount();
  render();
  expect(
    elements(tree).some(
      (n) =>
        n.type === "button" &&
        n.props.children === "Start Research conversation",
    ),
  ).toBe(false);
  expect(
    elements(tree).some((n) => n.props?.href === "/meri/conversations"),
  ).toBe(true);
  expect(state.request).toHaveBeenCalledTimes(1);
  expect(state.replace).not.toHaveBeenCalled();
});
it("a 5xx reply stays uncertain: Core may have written the row before its response failed", async () => {
  state.request.mockRejectedValue(
    new CapiroApiError(500, "The service is unavailable. Please retry."),
  );
  render();
  click("Start Research conversation");
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  render();
  const text = textOf(tree);
  expect(text).toContain("Creation has not been confirmed here");
  expect(
    elements(tree).some(
      (n) => n.type === "button" && n.props.children === "Try again",
    ),
  ).toBe(false);
});
it("a definite 4xx refusal says so, clears the tab record and allows one new attempt", async () => {
  state.request.mockRejectedValueOnce(
    new CapiroApiError(
      404,
      "The requested action or record is unavailable from the current service.",
    ),
  );
  render();
  click("Start Research conversation");
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  render();
  const text = textOf(tree);
  expect(text).toContain("Meri could not start this conversation.");
  expect(text).not.toContain("Creation has not been confirmed here");
  // The refusal survives no uncertainty: a remount offers a fresh start.
  unmount();
  render();
  click("Start Research conversation");
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  expect(state.request).toHaveBeenCalledTimes(2);
  expect(state.replace).toHaveBeenCalledWith(
    `/meri?scope=research_portfolio&conversationId=${id(4)}`,
  );
});
it("Try again after a refusal returns to the start button", async () => {
  state.request.mockRejectedValueOnce(new CapiroApiError(403, "Denied."));
  render();
  click("Start Research conversation");
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  render();
  click("Try again");
  render();
  expect(
    elements(tree).some(
      (n) =>
        n.type === "button" &&
        n.props.children === "Start Research conversation",
    ),
  ).toBe(true);
  expect(state.request).toHaveBeenCalledTimes(1);
});
it("unmount/account lifetime abort withholds late create navigation", async () => {
  let resolve!: (v: unknown) => void;
  state.request.mockReturnValue(new Promise((r) => (resolve = r)));
  render();
  click("Start Research conversation");
  unmount();
  resolve(row);
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  expect(state.replace).not.toHaveBeenCalled();
});
it("only current exact owned Research metadata mounts the captured session", () => {
  props = { account, conversationId: id(4), canCreate: false };
  render();
  expect(typeof tree.type).toBe("function");
  (tree.type as any)(tree.props);
  expect(state.session).toHaveBeenCalledWith(account, null, id(4), {
    conversationId: id(4),
    scopeKind: "research_portfolio",
    scope: capture,
  });
});
it.each([
  "pending",
  "denied",
  "wrong-owner",
  "wrong-conversation",
  "wrong-portfolio",
])("does not mount a session on %s metadata", (mode) => {
  props = {
    account,
    conversationId: id(4),
    portfolioId: id(3),
    canCreate: false,
  };
  if (mode === "pending") state.query.loading = true;
  if (mode === "denied") state.query.error = Error("403");
  if (mode === "wrong-owner") state.query.data = { ...row, userId: id(9) };
  if (mode === "wrong-conversation") state.query.data = { ...row, id: id(9) };
  if (mode === "wrong-portfolio")
    state.query.data = {
      ...row,
      metadata: {
        researchPortfolioScope: { ...capture, researchPortfolioId: id(9) },
      },
    };
  render();
  expect(typeof tree.type).toBe("string");
  expect(state.session).not.toHaveBeenCalled();
  expect(state.request).not.toHaveBeenCalled();
});

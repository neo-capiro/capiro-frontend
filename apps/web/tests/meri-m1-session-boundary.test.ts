import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createElement, type ComponentProps, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ApplicationBoundary } from "../src/shared/session/ApplicationBoundary";
import {
  createMeriTabSession,
  MeriTabSessionGate,
} from "../src/shared/meri-conversations/MeriTabSession";
import {
  syncMeriTabIdentity,
  tabRecord,
  type TabStorage,
} from "../src/shared/meri-conversations/tab-journal";

const harness = vi.hoisted(() => ({
  auth: {
    isLoaded: true,
    userId: "synthetic-user",
    sessionId: "synthetic-session",
    orgId: "synthetic-org",
  } as {
    isLoaded: boolean;
    userId: string | null;
    sessionId: string | null;
    orgId: string | null;
  },
  pathname: "/meri",
  effects: [] as Array<() => void>,
  expirations: [] as Array<() => void>,
  snapshot: undefined as { identity: string; status: "ready" } | undefined,
}));
vi.mock("@clerk/nextjs", () => ({ useAuth: () => harness.auth }));
vi.mock("next/navigation", () => ({
  usePathname: () => harness.pathname,
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof import("react")>();
  return {
    ...react,
    // Server rendering supplies the pre-effect tree. Tests explicitly flush effects afterwards.
    useEffect: (effect: () => void) => {
      harness.effects.push(effect);
    },
    useSyncExternalStore: (
      ...args: Parameters<typeof react.useSyncExternalStore>
    ) => {
      const snapshot = react.useSyncExternalStore(...args);
      return harness.snapshot ?? snapshot;
    },
  };
});
// This isolated lifetime fixture has no verified Core account; the actual palette/read boundary is exercised by meri-m2.spec.ts.
vi.mock("../src/shared/portfolio/auth/identity", () => ({
  useIdentity: () => ({ isSuccess: false, isFetching: false }),
}));
vi.mock("../src/shared/portfolio/auth/AuthenticationProvider", () => ({
  AuthenticationProvider: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("../src/shared/portfolio/api/provider", () => ({
  DataProvider: ({
    children,
    onSessionExpired,
  }: {
    children: ReactNode;
    onSessionExpired?: () => void;
  }) => {
    if (onSessionExpired) harness.expirations.push(onSessionExpired);
    return children;
  },
}));
vi.mock("../src/shared/capiro/CapiroBoundary", () => ({
  CapiroDataProvider: ({
    children,
    onSessionExpired,
  }: {
    children: ReactNode;
    onSessionExpired: () => void;
  }) => {
    harness.expirations.push(onSessionExpired);
    return children;
  },
}));
vi.mock("../src/shared/session/SelectedClient", () => ({
  SelectedClientProvider: ({ children }: { children: ReactNode }) => children,
}));

const identity = JSON.stringify([
  "synthetic-user",
  "synthetic-session",
  "synthetic-org",
]);
const marker = "capiro-meri-tab-identity-v1";
const scope = {
  tenantId: "tenant",
  actorId: "native-actor",
  clientId: "client",
  conversationId: "conversation",
};
function storageFixture(): TabStorage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
    key: (index) => [...values.keys()][index] ?? null,
  };
}
function render(children: ReactNode) {
  return renderToStaticMarkup(
    createElement(
      ApplicationBoundary,
      { publishableKey: "pk_synthetic" } as ComponentProps<
        typeof ApplicationBoundary
      >,
      children,
    ),
  );
}
function flushEffects() {
  harness.effects.splice(0).forEach((effect) => effect());
}
let storage: TabStorage;
beforeEach(() => {
  storage = storageFixture();
  vi.stubGlobal("window", { sessionStorage: storage });
  harness.auth = {
    isLoaded: true,
    userId: "synthetic-user",
    sessionId: "synthetic-session",
    orgId: "synthetic-org",
  };
  harness.pathname = "/meri";
  harness.effects = [];
  harness.expirations = [];
  harness.snapshot = undefined;
});
afterEach(() => {
  vi.unstubAllGlobals();
});

it("canonical loading and first signed-in render keep Meri unmounted until the identity effect", () => {
  syncMeriTabIdentity(identity);
  const draft = tabRecord(scope, "draft", String);
  draft.write("Private draft");
  const child = vi.fn(() => createElement("p", null, "Private mounted view"));
  harness.auth = { ...harness.auth, isLoaded: false, userId: null };
  expect(render(createElement(child))).toContain("Loading your Meri session");
  flushEffects();
  expect(draft.current()).toBe(true);
  expect(draft.read()).toBe("Private draft");
  expect(storage.getItem(marker)).toBe(identity);
  harness.auth = { ...harness.auth, isLoaded: true, userId: "synthetic-user" };
  expect(render(createElement(child))).toContain("Loading your Meri session");
  expect(child).not.toHaveBeenCalled();
  flushEffects();
  expect(draft.read()).toBe("Private draft");
});

it("canonical confirmed signout on registration purges retained content and fences late writers", () => {
  syncMeriTabIdentity(identity);
  const draft = tabRecord(scope, "draft", String);
  draft.write("Private draft");
  storage.setItem("unrelated", "keep");
  harness.pathname = "/register";
  harness.auth = { isLoaded: true, userId: null, sessionId: null, orgId: null };
  expect(render("Registration remains available")).toContain(
    "Registration remains available",
  );
  flushEffects();
  expect(storage.getItem(marker)).toBeNull();
  expect(storage.length).toBe(1);
  expect(storage.getItem("unrelated")).toBe("keep");
  expect(draft.current()).toBe(false);
  expect(() => draft.write("Late response")).toThrow();
});

it("navigation between Meri routes preserves the same identity's exact draft and writer", () => {
  syncMeriTabIdentity(identity);
  const draft = tabRecord(scope, "draft", String);
  draft.write("Private unfinished draft");
  harness.snapshot = { identity, status: "ready" };
  for (const pathname of ["/meri", "/meri/history", "/meri/files", "/meri"]) {
    harness.pathname = pathname;
    expect(render(createElement("p", null, draft.read()))).toContain(
      "Private unfinished draft",
    );
    flushEffects();
    expect(storage.getItem(marker)).toBe(identity);
    expect(draft.current()).toBe(true);
    expect(draft.read()).toBe("Private unfinished draft");
  }
  draft.write("Edited after navigation");
  expect(tabRecord(scope, "draft", String).read()).toBe(
    "Edited after navigation",
  );
});

it("canonical identity replacement hides the previous ready Meri view before its new identity effect", () => {
  syncMeriTabIdentity(identity);
  const draft = tabRecord(scope, "draft", String);
  draft.write("Private draft");
  // Model the previous committed external-store snapshot during the auth transition render.
  harness.snapshot = { identity, status: "ready" };
  const child = vi.fn(() => createElement("p", null, draft.read()));
  expect(render(createElement(child))).toContain("Private draft");
  flushEffects();
  child.mockClear();
  harness.auth = { ...harness.auth, userId: "different-user" };
  expect(render(createElement(child))).toContain("Loading your Meri session");
  expect(child).not.toHaveBeenCalled();
  // Render never mutates storage, even when the identity has changed.
  expect(draft.current()).toBe(true);
  flushEffects();
  expect(draft.current()).toBe(false);
  expect(storage.length).toBe(1);
  expect(storage.getItem(marker)).toContain("different-user");
});

it("both canonical transport expiry callbacks purge recovery and invalidate mounted writers", () => {
  syncMeriTabIdentity(identity);
  const draft = tabRecord(scope, "draft", String);
  draft.write("Private draft");
  harness.pathname = "/portfolio";
  render("Portfolio");
  flushEffects();
  expect(harness.expirations).toHaveLength(2);
  expect(harness.expirations[0]).toBe(harness.expirations[1]);
  harness.expirations[1]!();
  expect(storage.length).toBe(0);
  expect(draft.current()).toBe(false);
  expect(() => draft.write("Late response")).toThrow();
});

it("storage failure closes Meri alone while identity replacement and expiry retire prior readiness", () => {
  const session = createMeriTabSession();
  const notified = vi.fn();
  const unsubscribe = session.subscribe(notified);
  expect(session.getSnapshot().status).toBe("pending");
  session.sync(identity);
  expect(session.getSnapshot()).toEqual({ identity, status: "ready" });
  const draft = tabRecord(scope, "draft", String);
  draft.write("Private draft");
  // Same-session route navigation must retain the active writer and its exact content.
  session.sync(identity);
  expect(draft.read()).toBe("Private draft");
  session.sync("different-session");
  expect(draft.current()).toBe(false);
  expect(session.getSnapshot()).toEqual({
    identity: "different-session",
    status: "ready",
  });
  session.expire();
  expect(session.getSnapshot().status).toBe("pending");
  vi.spyOn(storage, "getItem").mockImplementation(() => {
    throw new Error("Storage unavailable");
  });
  session.sync(identity);
  expect(session.getSnapshot().status).toBe("unavailable");
  const props = {
    identity,
    status: session.getSnapshot().status,
    children: "Private mounted view",
  };
  const meri = renderToStaticMarkup(
    createElement(MeriTabSessionGate, { ...props, pathname: "/meri" }),
  );
  expect(meri).toContain("Meri recovery is unavailable");
  expect(meri).not.toContain("Private mounted view");
  expect(
    renderToStaticMarkup(
      createElement(MeriTabSessionGate, { ...props, pathname: "/portfolio" }),
    ),
  ).toContain("Private mounted view");
  expect(notified).toHaveBeenCalledTimes(5);
  unsubscribe();
});

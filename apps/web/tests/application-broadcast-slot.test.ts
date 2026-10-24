import { createElement, useContext, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApplicationBoundary } from "../src/shared/session/ApplicationBoundary";
import { SessionContext } from "../src/shared/session/SessionContext";
const state = vi.hoisted(() => ({
  loaded: true,
  userId: "actor",
  pathname: "/settings/personal",
}));
vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({
    isLoaded: state.loaded,
    userId: state.userId || null,
    sessionId: "session",
    orgId: "organization",
  }),
}));
vi.mock("next/navigation", () => ({
  usePathname: () => state.pathname,
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("../src/shared/portfolio/auth/AuthenticationProvider", () => ({
  AuthenticationProvider: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("../src/shared/portfolio/api/provider", () => ({
  DataProvider: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("../src/shared/capiro/CapiroBoundary", () => ({
  CapiroDataProvider: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("../src/shared/session/SelectedClient", () => ({
  SelectedClientProvider: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("../src/shared/meri-conversations/MeriTabSession", () => ({
  useMeriTabSession: () => ({ status: "ready", expire: () => {} }),
  MeriTabSessionGate: ({ children }: { children: ReactNode }) => children,
}));
function Recipient() {
  return createElement(
    "aside",
    null,
    `Recipient in ${useContext(SessionContext)}`,
  );
}
const render = (publishableKey: string | undefined = "synthetic-key") => {
  const props = {
    publishableKey,
    children: createElement("main", null, "Product"),
    authenticatedContent: createElement(Recipient),
  };
  return renderToStaticMarkup(createElement(ApplicationBoundary, props));
};
beforeEach(() => {
  state.loaded = true;
  state.userId = "actor";
  state.pathname = "/settings/personal";
});
describe("Authenticated recipient slot", () => {
  it.each(["/settings/personal", "/portfolio", "/modules", "/meri"])(
    "mounts under the existing signed-in lifetime on %s",
    (path) => {
      state.pathname = path;
      expect(render()).toContain("Recipient in signed-in");
    },
  );
  it.each(["signed-out", "loading", "unconfigured", "public-form"])(
    "does not mount the recipient in %s",
    (mode) => {
      if (mode === "signed-out") state.userId = "";
      if (mode === "loading") state.loaded = false;
      if (mode === "public-form") state.pathname = "/forms/synthetic";
      expect(
        render(mode === "unconfigured" ? "" : "synthetic-key"),
      ).not.toContain("Recipient in");
    },
  );
});

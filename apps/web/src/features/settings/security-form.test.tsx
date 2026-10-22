// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, createElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CreateTenant } from "./hq/TenantDialogs";
import { SettingsDialog } from "./components";
const state = vi.hoisted(() => ({
  api: { request: vi.fn(), upload: vi.fn(), download: vi.fn() },
}));
vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ userId: "actor", orgId: "org", sessionId: "session" }),
}));
vi.mock("../../shared/capiro/CapiroBoundary", () => ({
  useCapiro: () => state.api,
}));
vi.mock("../../shared/capiro/queries", () => ({
  useCapiroQuery: () => ({ data: [], reload: vi.fn() }),
}));
vi.mock("../../shared/capiro/registry", () => ({
  capiroOperations: { "settings.hq.tenants.create": { method: "POST" } },
}));
vi.mock("../../shared/module-ui", async () => {
  const { createElement: element } = await import("react");
  return {
    ActionButton: ({
      children,
      primary: _primary,
      ...props
    }: Record<string, unknown>) =>
      element("button", props, children as ReactNode),
    TextInput: (props: Record<string, unknown>) => element("input", props),
    Modal: ({
      children,
      footer,
      onOpenChange,
      closeDisabled,
    }: {
      children: ReactNode;
      footer: ReactNode;
      onOpenChange: (open: boolean) => void;
      closeDisabled: boolean;
    }) =>
      element(
        "section",
        null,
        element(
          "button",
          {
            "data-testid": "close",
            disabled: closeDisabled,
            onClick: () => onOpenChange(false),
          },
          "Close",
        ),
        element(
          "button",
          { "data-testid": "escape", onClick: () => onOpenChange(false) },
          "Escape",
        ),
        element(
          "button",
          { "data-testid": "backdrop", onClick: () => onOpenChange(false) },
          "Backdrop",
        ),
        children,
        footer,
      ),
    Badge: () => null,
    Panel: () => null,
    Tabs: () => null,
    DataTable: () => null,
    StatusPanel: () => null,
  };
});
let root: Root;
let cache: QueryClient;
const close = vi.fn();
const refresh = vi.fn();
beforeEach(() => {
  Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
    value: true,
    configurable: true,
  });
  close.mockReset();
  refresh.mockReset();
  state.api.request.mockReset();
  sessionStorage.clear();
  document.body.innerHTML = "<div id='root'></div>";
  root = createRoot(document.getElementById("root")!);
  cache = new QueryClient();
});
afterEach(async () => {
  await act(async () => root.unmount());
  cache.clear();
  document.body.replaceChildren();
});
it("all dismiss paths are ignored while a security dialog is busy", async () => {
  await act(async () =>
    root.render(
      <SettingsDialog open busy title="Delete" onClose={close}>
        Target
      </SettingsDialog>,
    ),
  );
  await act(async () => {
    for (const testid of ["close", "escape", "backdrop"])
      (
        document.querySelector(`[data-testid=${testid}]`) as HTMLButtonElement
      ).click();
  });
  expect(close).not.toHaveBeenCalled();
  expect(
    (document.querySelector("[data-testid=close]") as HTMLButtonElement)
      .disabled,
  ).toBe(true);
});
it("tenant creation freezes fields and close controls until the exact receipt is accepted", async () => {
  let finish!: (value: unknown) => void;
  state.api.request.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  await act(async () =>
    root.render(
      createElement(
        QueryClientProvider,
        { client: cache },
        createElement(CreateTenant, { open: true, onClose: close, refresh }),
      ),
    ),
  );
  // Submit synthetic empty fields programmatically: the fixture transport is deliberately a mock.
  await act(async () =>
    document
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })),
  );
  for (let i = 0; i < 50 && !finish; i++)
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 2));
    });
  expect(state.api.request).toHaveBeenCalledTimes(1);
  expect(
    [...document.querySelectorAll("input")].every((input) => input.disabled),
  ).toBe(true);
  await act(async () =>
    (
      document.querySelector("[data-testid=escape]") as HTMLButtonElement
    ).click(),
  );
  expect(close).not.toHaveBeenCalled();
  await act(async () => {
    finish({ tenant: { slug: "wrong", name: "" }, invitation: { email: "" } });
  });
  expect(close).not.toHaveBeenCalled();
  expect(refresh).not.toHaveBeenCalled();
  expect(document.body.textContent).toContain("not confirmed");
});

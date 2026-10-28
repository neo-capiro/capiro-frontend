import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { Header } from "../src/shared/shell/Header";
import { ModuleHeader } from "../src/shared/shell/ModuleHeader";

const clientId = "71000000-0000-4000-8000-000000000005";
vi.mock("next/navigation", () => ({
  usePathname: () => "/meri/updates",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("../src/shared/session/SelectedClient", () => ({
  useSelectedClient: () => ({
    state: "authorized-client",
    client: {
      id: "71000000-0000-4000-8000-000000000005",
      name: "Synthetic client",
    },
  }),
}));
vi.mock("../src/shared/shell/MeriSidebarVisibility", () => ({
  useMeriSidebarVisibility: () => ({ expanded: true, toggle: () => undefined }),
}));
vi.mock("../src/shared/shell/ModuleSidebarVisibility", () => ({
  ModuleSidebarToggle: () => null,
}));

it("both ordinary headers expose Updates with the selected client hint", () => {
  for (const element of [createElement(Header), createElement(ModuleHeader)]) {
    const html = renderToStaticMarkup(element);
    expect(html).toContain(`href="/meri/updates?clientId=${clientId}"`);
    expect(html).toContain('aria-label="Updates"');
    expect(html).not.toContain("Updates — unavailable");
  }
});

it("the fixture keeps its single synthetic Updates overlay and no ordinary Updates link", () => {
  const html = renderToStaticMarkup(createElement(Header, { fixture: true }));
  expect(html).not.toContain("/meri/updates");
  expect(html.match(/aria-label="Updates"/g)).toHaveLength(1);
  expect(html).toContain('aria-haspopup="dialog"');
});

it("the module read-only preview still withholds all workspace header actions", () => {
  const html = renderToStaticMarkup(
    createElement(ModuleHeader, { readOnlyPreview: true }),
  );
  expect(html).not.toContain("/meri/updates");
  expect(html).not.toContain('aria-label="Workspace actions"');
});

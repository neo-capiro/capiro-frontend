import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { SidebarDestinations } from "../src/shared/shell/SidebarDestinations";
import { MeriMobileNavigation } from "../src/shared/shell/MeriMobileNavigation";
import { MeriCapabilitiesProvider } from "../src/shared/meri-resources/CapabilityContext";
import { readMeriCapabilities } from "../src/shared/meri-resources/capabilities.server";
import {
  allCapabilitiesEnv,
  capabilityFlags,
} from "./meri-capabilities-fixtures";

const local = vi.hoisted(() => ({
  path: "/meri/runs",
  clientId: "71000000-0000-4000-8000-000000000005",
  push: vi.fn(),
}));
// Render the real mobile menu in its open state; no browser or product request.
vi.mock("react", async (original) => {
  const react = await original<typeof import("react")>();
  return {
    ...react,
    useState: (initial: unknown) =>
      react.useState(initial === null ? local.path : initial),
  };
});
vi.mock("next/navigation", () => ({
  usePathname: () => local.path,
  useRouter: () => ({ push: local.push }),
}));
vi.mock("../src/shared/session/SelectedClient", () => ({
  useSelectedClient: () => ({
    state: "authorized-client",
    client: { id: local.clientId, name: "Selected client" },
  }),
}));
vi.mock("../src/shared/shell/ConversationRecents", () => ({
  ConversationRecents: () => null,
}));
vi.mock("../src/shared/shell/LiveNewConversation", () => ({
  LiveNewConversation: () => null,
}));

const rendered = (enabled: boolean) => {
  const capabilities = readMeriCapabilities({
    ...allCapabilitiesEnv,
    [capabilityFlags.conversations]: String(enabled),
  });
  return renderToStaticMarkup(
    createElement(
      MeriCapabilitiesProvider,
      { value: capabilities },
      createElement(SidebarDestinations, {
        assetSet: "home",
        fixture: false,
        section: "runs",
      }),
      createElement(MeriMobileNavigation, { section: "runs" }),
    ),
  );
};

it("the reviewed desktop and open mobile menus expose the current Runs route with selected scope", () => {
  const html = rendered(true);
  const desktop = html.match(
    /<button\b[^>]*title="Open runs"[^>]*>[\s\S]*?Runs<\/button>/,
  )?.[0];
  expect(desktop).toBeDefined();
  expect(desktop?.slice(0, desktop.indexOf(">"))).not.toMatch(
    /\sdisabled(?:=|\s|>)/,
  );
  expect(desktop).toContain('aria-current="page"');
  expect(html).toContain(`href="/meri/runs?clientId=${local.clientId}"`);
  expect(html).not.toContain('aria-label="Runs unavailable.');
  // Approvals has its own route now and follows the same conversation gate as Runs.
  expect(html).not.toContain('aria-label="Approvals unavailable.');
  expect(html).toContain(`href="/meri/approvals?clientId=${local.clientId}"`);
  expect(html).not.toContain("/meri/fixture/background-runs");
});

it("an unconfigured run owner keeps both real navigation controls disabled with the preserved accessible reason", () => {
  const html = rendered(false);
  expect(html).not.toContain(`href="/meri/runs?clientId=${local.clientId}"`);
  expect(html.match(/aria-label="Runs unavailable\./g)).toHaveLength(2);
  const runs = (html.match(/<button\b[^>]*>[\s\S]*?<\/button>/g) ?? []).filter(
    (button) => button.endsWith("Runs</button>"),
  );
  expect(runs).toHaveLength(2);
  for (const button of runs)
    expect(button.slice(0, button.indexOf(">"))).toContain('disabled=""');
});

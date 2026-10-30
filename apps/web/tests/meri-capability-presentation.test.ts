import { createElement, useContext } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import MeriLayout from "../src/app/meri/layout";
import MeriFilesPage from "../src/app/meri/files/page";
import { ProductShell } from "../src/shared/shell/ProductShell";
import { MeriHome } from "../src/features/meri/MeriHome";
import { IntentApprovalsEnabled } from "../src/features/meri/conversation/intents/approvals-enabled";
import {
  SessionContext,
  RequireSession,
} from "../src/shared/session/SessionContext";
import { MeriCapabilitiesProvider } from "../src/shared/meri-resources/CapabilityContext";
import { readMeriCapabilities } from "../src/shared/meri-resources/capabilities.server";
import {
  allCapabilitiesEnv,
  capabilityFlags,
  previewCapabilitiesEnv,
} from "./meri-capabilities-fixtures";

const navigation = vi.hoisted(() => ({ pathname: "/meri", push: vi.fn() }));
vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ push: navigation.push }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("../src/shared/shell/Header", () => ({
  Header: () => createElement("header", null, "Shell header"),
}));
vi.mock("../src/shared/portfolio/auth/identity", () => ({
  useIdentity: () => ({
    isSuccess: true,
    isFetching: false,
    data: {
      user: { id: "synthetic-actor", firstName: "Synthetic" },
      tenant: { id: "synthetic-tenant" },
    },
  }),
}));
vi.mock("../src/features/meri/MeriClientSelector", () => ({
  MeriClientSelector: () => createElement("span", null, "Synthetic selector"),
}));
vi.mock("../src/features/meri/conversation/MeriConversationHost", () => ({
  MeriConversationHost: ({
    enabled,
    firstChatBootstrapEnabled,
  }: {
    enabled: boolean;
    firstChatBootstrapEnabled: boolean;
  }) =>
    createElement(
      "output",
      {
        "data-conversation": String(enabled),
        "data-bootstrap": String(firstChatBootstrapEnabled),
        "data-approvals": String(useContext(IntentApprovalsEnabled)),
      },
      "Conversation probe",
    ),
}));

const disabled = {
  ...allCapabilitiesEnv,
  ...Object.fromEntries(
    Object.values(capabilityFlags).map((flag) => [flag, "false"]),
  ),
};
function renderRoute(
  env: Record<string, string | undefined>,
  path: string,
  signedIn = true,
) {
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  navigation.pathname = path;
  const body = createElement(
    RequireSession,
    null,
    createElement("p", null, "Connected workspace body"),
  );
  return renderToStaticMarkup(
    createElement(
      SessionContext.Provider,
      { value: signedIn ? "signed-in" : "signed-out" },
      createElement(MeriLayout, null, createElement(ProductShell, null, body)),
    ),
  );
}
afterEach(() => vi.unstubAllEnvs());

it("the actual layout preserves existing destinations and holds opt-in routes", () => {
  for (const path of [
    "/meri/files",
    "/meri/actions",
    "/meri/task-updates",
    "/meri/memory",
  ]) {
    for (const env of [disabled, previewCapabilitiesEnv]) {
      const html = renderRoute(env, path);
      expect(html, path).toContain("Shell header");
      if (path === "/meri/memory") {
        expect(html, path).toContain(" unavailable</h1>");
        expect(html, path).not.toContain("Connected workspace body");
      } else {
        expect(html, path).toContain("Connected workspace body");
      }
    }
    expect(renderRoute(allCapabilitiesEnv, path), path).toContain(
      "Connected workspace body",
    );
    const signedOut = renderRoute(disabled, path, false);
    expect(signedOut, path).toContain("Sign in to Capiro");
    expect(signedOut, path).not.toContain("Connected workspace body");
  }
  for (const path of [
    "/meri",
    "/meri/fixture/home",
    "/meri/fixture/workspace-files",
  ])
    expect(renderRoute(disabled, path), path).toContain(
      "Connected workspace body",
    );
});

it("home controls and workspace links follow server capability holds even when raw page flags are true", () => {
  navigation.pathname = "/meri";
  for (const env of [disabled, allCapabilitiesEnv, previewCapabilitiesEnv]) {
    const html = renderToStaticMarkup(
      createElement(
        MeriCapabilitiesProvider,
        { value: readMeriCapabilities(env) },
        createElement(MeriHome, {
          conversationEnabled: true,
          firstChatBootstrapEnabled: true,
          intentApprovalsEnabled: true,
        }),
      ),
    );
    const conversation = env !== disabled;
    expect(html).toContain(`data-conversation="${conversation}"`);
    expect(html).toContain(`data-bootstrap="${conversation}"`);
    expect(html).toContain(`data-approvals="${env === allCapabilitiesEnv}"`);
    // The landing no longer duplicates workspace links. Those real destinations are secondary
    // Tools navigation now, covered in test/browser/meri-chat-first.spec.ts.
    for (const href of [
      "/meri/files",
      "/meri/actions",
      "/meri/task-updates",
      "/meri/memory",
    ])
      expect(html).not.toContain(`href="${href}"`);
    expect(html).not.toContain('href="/kit');
  }
});

it("the unconfigured Files page retains enabled navigation and the canonical setup surface", () => {
  for (const key of Object.keys(allCapabilitiesEnv)) vi.stubEnv(key, "");
  navigation.pathname = "/meri/files";
  const html = renderToStaticMarkup(
    createElement(
      SessionContext.Provider,
      { value: "unconfigured" },
      createElement(MeriLayout, null, createElement(MeriFilesPage)),
    ),
  );
  const buttons = html.match(/<button\b[^>]*>[\s\S]*?<\/button>/g) ?? [];
  for (const label of ["Files", "Conversations"]) {
    const button = buttons.find((element) =>
      element.endsWith(`${label}</button>`),
    );
    expect(button, label).toBeDefined();
    expect(button, label).not.toMatch(/\sdisabled(?:=|\s|>)/);
  }
  expect(html).toContain('href="/settings/preferences"');
  expect(html).toContain("Connection setup required");
  expect(html).not.toContain("Connect document service");
  expect(html).not.toContain("Document files unavailable");
});

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SettingsScreen } from "../src/features/settings/SettingsScreen";
import { EmailSignature } from "../src/features/settings/SignatureSettings";
import { previewReadRoute } from "../src/shared/preview/read-route.server";
import { previewBackendRejection } from "../src/shared/preview/backend-policy.server";
import {
  previewBackendSource,
  qualifiedCorePreviewBackendSource,
} from "../src/shared/preview/read-config.server";
const state = vi.hoisted(() => ({ queries: vi.fn() }));
vi.mock("../src/features/settings/SettingsNavigation", () => ({
  SettingsNavigation: () => null,
}));
vi.mock("../src/features/settings/ContactSettings", () => ({
  ContactSettings: () => "Contact records",
}));
vi.mock("../src/features/settings/BrandingSettings", () => ({
  BrandingSettings: () => "Branding records",
}));
vi.mock("../src/features/settings/TeamSettings", () => ({
  TeamSettings: () => "Team records",
}));
vi.mock("../src/features/settings/BillingSettings", () => ({
  BillingSettings: () => "Billing records",
}));
vi.mock("../src/features/settings/hq/SupportRequestsSettings", () => ({
  SupportRequestsSettings: () => "HQ support records",
}));
vi.mock("../src/shared/capiro/queries", () => ({
  useCapiroQuery: (key: string, input: unknown) => {
    state.queries(key, input);
    return {
      data:
        key === "me.read"
          ? {
              role: "capiro_admin",
              user: { id: "actor" },
              tenant: { id: "tenant" },
            }
          : undefined,
      loading: false,
      reload: () => {},
    };
  },
}));
beforeEach(() => vi.clearAllMocks());
const env = {
  CAPIRO_PREVIEW_READ_ONLY: "true",
  CAPIRO_PREVIEW_READ_BACKEND_SOURCE: previewBackendSource,
  CAPIRO_PREVIEW_READ_API_BASE_URL:
    "https://first-chat-preview.app-dev.capiro.ai/api",
  CAPIRO_PREVIEW_CLIENT_ROSTER_BACKEND_SOURCE:
    qualifiedCorePreviewBackendSource,
  CAPIRO_PREVIEW_CLIENT_ROSTER_API_BASE_URL:
    "https://core-roster-preview.capiro.ai/api",
};
describe("Current Settings preview read availability", () => {
  it.each([
    ["contact-info", "Contact records"],
    ["branding", "Branding records"],
    ["team", "Team records"],
    ["billing", "Billing records"],
    ["hq-support", "HQ support records"],
  ])("renders authorized %s reads in preview", (section, text) => {
    const html = renderToStaticMarkup(
      createElement(SettingsScreen, {
        section,
        readOnlyPreview: true,
        meriPreferences: null,
      }),
    );
    expect(html).toContain(text);
    expect(html).not.toContain("This Settings section is unavailable");
  });
  it("keeps separately routed Meri preferences reachable", () => {
    const html = renderToStaticMarkup(
      createElement(SettingsScreen, {
        section: "meri-preferences",
        readOnlyPreview: true,
        meriPreferences: createElement(
          "div",
          null,
          "Connected native preferences",
        ),
      }),
    );
    expect(html).toContain("Connected native preferences");
    expect(html).not.toContain("Capiro settings changes");
  });
  it("keeps the signature read mounted in preview", () => {
    renderToStaticMarkup(
      createElement(EmailSignature, { readOnlyPreview: true }),
    );
    expect(state.queries).toHaveBeenCalledWith("me.emailSignature.read", {});
  });
  it.each([
    ["clients.list", { query: { includeArchived: true } }],
    ["settings.profiles.accountOwners", {}],
    ["settings.contact.read", {}],
    ["settings.branding.read", {}],
    ["settings.team.list", {}],
    ["me.emailSignature.read", {}],
  ] as const)("matches actual admitted GET policy for %s", (key, input) => {
    const url = new URL(`https://preview.synthetic.invalid/api/capiro/${key}`);
    url.searchParams.set("input", JSON.stringify(input));
    const request = new Request(url);
    expect(previewReadRoute(request)?.service).toBe("core");
    expect(previewBackendRejection(env, request)).toBeNull();
  });
  it("preserves actual Settings write containment without changing route configuration", () => {
    const request = new Request(
      "https://preview.synthetic.invalid/api/capiro/settings.support.create",
      { method: "POST", body: "{}" },
    );
    expect(previewReadRoute(request)).toBeNull();
    expect(previewBackendRejection(env, request)?.status).toBe(503);
  });
});

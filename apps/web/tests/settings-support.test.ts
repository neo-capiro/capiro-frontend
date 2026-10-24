import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SupportRequestForm } from "../src/features/settings/SupportRequestForm";
import { SupportRequestsSettings } from "../src/features/settings/hq/SupportRequestsSettings";
import { HelpShortcutsScreen } from "../src/features/meri/screens/settings/HelpShortcutsScreen";
import { unavailablePreferences } from "../src/features/meri/screens/settings/preferences-unavailable";
const state = vi.hoisted(() => ({
  locked: false,
  values: [] as unknown[],
  index: 0,
  request: vi.fn(),
}));
vi.mock("../src/features/settings/components", async (original) => ({
  ...(await original<typeof import("../src/features/settings/components")>()),
  SettingsDialog: ({ children }: { children: ReactNode }) =>
    createElement("section", null, children),
}));
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useState: (initial: unknown) => [
    state.index < state.values.length ? state.values[state.index++] : initial,
    () => {},
  ],
}));
vi.mock("../src/features/settings/useSettingsMutation", () => ({
  useSettingsMutation: () => ({
    api: {},
    locked: state.locked,
    action: { busy: state.locked },
  }),
}));
vi.mock("../src/shared/capiro/queries", () => ({
  useCapiroQuery: (operation: string, input: unknown) => {
    state.request(operation, input);
    const common = { loading: false, reload: () => {} };
    if (operation === "settings.hq.tenants.list")
      return {
        ...common,
        data: [{ id: "tenant", name: "Synthetic", slug: "synthetic" }],
      };
    if (operation === "settings.hq.support.list")
      return {
        ...common,
        data: {
          items: [
            {
              id: "request",
              summary: "<script>report</script>",
              createdAt: "2026-10-24T00:00:00Z",
            },
          ],
          nextCursor: "next",
        },
      };
    return {
      ...common,
      data: {
        id: "request",
        summary: "Summary",
        detail: "<img src=x onerror=bad()>",
        runReference: "opaque",
        createdAt: "2026-10-24T00:00:00Z",
      },
    };
  },
}));
beforeEach(() => {
  state.locked = false;
  state.values = [];
  state.index = 0;
  state.request.mockClear();
});
describe("Help submission and HQ review presentation", () => {
  it("uses an explicit opt-in reference and makes no automatic content read", () => {
    const html = renderToStaticMarkup(createElement(SupportRequestForm));
    expect(html).toContain("Include a run reference");
    expect(html).toContain("Attachments are unavailable");
    expect(html).not.toContain("Report saved for HQ review");
    expect(state.request).not.toHaveBeenCalled();
  });
  it("freezes report fields while the result is unresolved", () => {
    state.locked = true;
    const html = renderToStaticMarkup(createElement(SupportRequestForm));
    expect(html).toMatch(/<input[^>]*disabled=""/);
    expect(html).toMatch(/<textarea[^>]*disabled=""/);
  });
  it("composes the real report slot without the unavailable form or fake success", () => {
    const props = {
      chrome: {
        nav: [],
        embedded: true,
        notice: { title: "Help", detail: "" },
        unavailable: "Unavailable",
        localDrafts: false,
        headerOverlays: false,
      },
      view: unavailablePreferences.help,
      reportContent: createElement("aside", null, "Connected report"),
    };
    const html = renderToStaticMarkup(
      createElement(HelpShortcutsScreen, props),
    );
    expect(html).toContain("Connected report");
    expect(html).not.toContain("Submit feedback");
  });
  it("shows tenant-scoped bounded HQ pages and escapes report content", () => {
    state.values = ["tenant", undefined, "request"];
    const html = renderToStaticMarkup(createElement(SupportRequestsSettings));
    expect(state.request).toHaveBeenCalledWith("settings.hq.support.list", {
      query: { tenantId: "tenant" },
    });
    expect(state.request).toHaveBeenCalledWith("settings.hq.support.detail", {
      params: { id: "request" },
      query: { tenantId: "tenant" },
    });
    expect(html).toContain("Older requests");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&lt;img");
    expect(html).not.toContain("<img src=x");
  });
});

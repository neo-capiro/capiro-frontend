import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProfileSettings } from "../src/features/settings/ProfileSettings";
const state = vi.hoisted(() => ({ queries: vi.fn(), request: vi.fn() }));
vi.mock("../src/features/settings/useSettingsMutation", () => ({
  useSettingsMutation: () => ({
    api: { request: state.request },
    action: { busy: false },
    locked: false,
  }),
}));
vi.mock("../src/shared/capiro/queries", () => ({
  useCapiroQuery: (key: string, input: unknown, options: unknown) => {
    state.queries(key, input, options);
    return {
      data:
        key === "clients.list"
          ? [
              {
                id: "synthetic",
                name: "Visible profile",
                status: "active",
                profileStatus: "ACTIVE",
              },
            ]
          : [],
      loading: false,
      reload: vi.fn(),
    };
  },
}));
beforeEach(() => vi.clearAllMocks());
describe("Settings Profiles preview", () => {
  it("requests only the permitted active roster, disables owner reads and hides archived actions", () => {
    const html = renderToStaticMarkup(
      createElement(ProfileSettings, { readOnlyPreview: true }),
    );
    expect(state.queries).toHaveBeenCalledWith(
      "clients.list",
      { query: { includeArchived: false } },
      undefined,
    );
    expect(state.queries).toHaveBeenCalledWith(
      "settings.profiles.accountOwners",
      {},
      { enabled: false },
    );
    expect(html).toContain("Visible profile");
    expect(html).toContain("Active profiles only in preview");
    expect(html).not.toMatch(/>Archive<|>Restore<|Archived \(0\)/);
    expect(html).toMatch(
      /<button[^>]*disabled=""[^>]*>\+ Add profile<\/button>/,
    );
    expect(state.request).not.toHaveBeenCalled();
  });
  it("retains ordinary archived/owner reads and profile controls", () => {
    const html = renderToStaticMarkup(createElement(ProfileSettings));
    expect(state.queries).toHaveBeenCalledWith(
      "clients.list",
      { query: { includeArchived: true } },
      undefined,
    );
    expect(state.queries).toHaveBeenCalledWith(
      "settings.profiles.accountOwners",
      {},
      { enabled: true },
    );
    expect(html).toContain("Archived (0)");
    expect(html).toContain(">Archive</button>");
  });
});

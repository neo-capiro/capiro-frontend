import { beforeEach, expect, it, vi } from "vitest";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({
    userId: "actor-a",
    sessionId: "session-a",
    orgId: "tenant-a",
  }),
}));
import { SettingsScreen } from "../src/features/settings/SettingsScreen";
vi.mock("../src/features/settings/SettingsNavigation", () => ({
  SettingsNavigation: () => createElement("nav", null, "Synthetic navigation"),
}));

const state = vi.hoisted(() => ({
  queries: [] as { key: string; input: unknown; enabled: boolean }[],
  api: { request: vi.fn() },
}));
vi.mock("../src/shared/capiro/CapiroBoundary", () => ({
  useCapiro: () => state.api,
}));
vi.mock("../src/shared/shell/ScopedLink", () => ({
  ScopedLink: ({ children, ...props }: { children: ReactNode }) =>
    createElement("a", props, children),
}));
vi.mock("../src/shared/capiro/queries", () => ({
  useCapiroQuery: (
    key: string,
    input: unknown,
    options?: { enabled?: boolean },
  ) => {
    state.queries.push({ key, input, enabled: options?.enabled !== false });
    return {
      loading: false,
      error: undefined,
      reload: () => {},
      data:
        key === "me.read"
          ? {
              user: { id: "synthetic-user", title: "Synthetic title" },
              tenant: { id: "synthetic-tenant", slug: "synthetic-workspace" },
              role: "user_admin",
              billingAdmin: true,
            }
          : [],
    };
  },
}));

beforeEach(() => {
  state.queries.length = 0;
  state.api.request.mockClear();
});
const render = (section: string, readOnlyPreview = true) =>
  renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client: new QueryClient() },
      createElement(SettingsScreen, {
        section,
        readOnlyPreview,
        meriPreferences: createElement(
          "p",
          null,
          "Preferences child must not mount",
        ),
      }),
    ),
  );

it("preview Profiles requests active roster without archived/owner reads or write controls", () => {
  const html = render("profiles");
  expect(state.queries.filter((query) => query.enabled)).toEqual([
    { key: "me.read", input: {}, enabled: true },
    {
      key: "clients.list",
      input: { query: { includeArchived: false } },
      enabled: true,
    },
  ]);
  expect(html).toContain("Active profiles only");
  expect(html).toContain(
    "Archived profiles, account owners and administrator controls are unavailable",
  );
  expect(html).not.toContain("Archived (0)");
  expect(html).toMatch(/<button[^>]*disabled=""[^>]*>\+ Add profile<\/button>/);
  expect(state.api.request).not.toHaveBeenCalled();
});
it.each([
  "team",
  "integrations",
  "billing",
  "branding",
  "hq-broadcasts",
  "meri-preferences",
])("preview %s never mounts known-forbidden readers", (section) => {
  const html = render(section);
  expect(state.queries.map((query) => query.key)).toEqual(["me.read"]);
  expect(html).toContain("Unavailable in read-only preview");
  expect(state.api.request).not.toHaveBeenCalled();
});
it("preview Personal shows identity without mounting signature reads", () => {
  const html = render("personal");
  expect(state.queries.map((query) => query.key)).toEqual(["me.read"]);
  expect(html).toContain("Synthetic title");
  expect(html).toContain("Read-only preview");
  expect(html).toContain("disabled");
});
it("ordinary Profiles retains archived and account-owner reads", () => {
  const html = render("profiles", false);
  expect(state.queries).toContainEqual({
    key: "clients.list",
    input: { query: { includeArchived: true } },
    enabled: true,
  });
  expect(state.queries).toContainEqual({
    key: "settings.profiles.accountOwners",
    input: {},
    enabled: true,
  });
  expect(html).toContain("Archived (0)");
  expect(html).not.toContain("Active profiles only");
});

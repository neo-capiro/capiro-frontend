import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
import { MeriPreferencesPanel } from "../src/features/meri/screens/settings/MeriPreferencesPanel";

const state = vi.hoisted(() => ({
  search: "",
  pathname: "/settings/preferences",
  push: vi.fn(),
  replace: vi.fn(),
  selects: new Map<string, (id: string) => void>(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(state.search),
  usePathname: () => state.pathname,
  useRouter: () => ({ push: state.push, replace: state.replace }),
}));

// Each page body stands in for its canonical host so the test can observe which page the
// panel resolved, which navigation item it marked current, and can call the chrome.select
// the host would call from its own links (B003-11 did exactly that from Data access).
function pageStub(key: string) {
  return function PageStub(props: {
    chrome: {
      nav: readonly { id: string; current: boolean }[];
      select?: (id: string) => void;
    };
  }) {
    const { nav, select } = props.chrome;
    if (select) state.selects.set(key, select);
    return createElement("div", {
      "data-page": key,
      "data-current": nav
        .filter((item) => item.current)
        .map((item) => item.id)
        .join(","),
      "data-nav-size": String(nav.length),
    });
  };
}

vi.mock("../src/features/meri/user-preferences/UserPreferencesHost", () => ({
  UserPreferencesHost: pageStub("personal"),
}));
vi.mock(
  "../src/features/meri/screens/settings/PersonalPreferencesScreen",
  () => ({
    PersonalPreferencesScreen: pageStub("personal"),
  }),
);
vi.mock("../src/features/meri/screens/settings/ConnectorAccountsHost", () => ({
  ConnectorAccountsHost: pageStub("connections"),
}));
vi.mock("../src/features/meri/screens/settings/ConnectorLibraryHost", () => ({
  ConnectorLibraryHost: pageStub("connected-services"),
}));
vi.mock("../src/features/meri/screens/settings/DataAccessHost", () => ({
  DataAccessHost: pageStub("data-access"),
}));
vi.mock("../src/features/meri/screens/settings/HelpShortcutsScreen", () => ({
  HelpShortcutsScreen: pageStub("help"),
}));
vi.mock(
  "../src/features/meri/screens/settings/NotificationsAccountScreen",
  () => ({
    NotificationsAccountScreen: pageStub("notifications"),
  }),
);
vi.mock("../src/features/meri/screens/settings/SkillsTemplatesScreen", () => ({
  SkillsTemplatesScreen: pageStub("skills"),
}));
vi.mock("../src/features/meri/screens/settings/UsageLimitsScreen", () => ({
  UsageLimitsScreen: pageStub("usage"),
}));
vi.mock("../src/features/meri/usage-overview/UsageOverviewHost", () => ({
  UsageOverviewHost: pageStub("usage"),
}));
vi.mock("../src/features/meri/privacy/MemoryRetentionPolicyHost", () => ({
  MemoryRetentionPolicyHost: pageStub("privacy"),
}));
vi.mock("../src/features/meri/procedures/ProcedureGovernanceHost", () => ({
  ProcedureGovernanceHost: pageStub("updates"),
}));
vi.mock("../src/features/meri/tenant-settings/TenantModelSettings", () => ({
  TenantModelSettings: pageStub("usage-configuration"),
}));

function render(search: string) {
  state.search = search;
  state.selects.clear();
  return renderToStaticMarkup(createElement(MeriPreferencesPanel, {}));
}

function attribute(markup: string, name: string) {
  return new RegExp(`${name}="([^"]*)"`).exec(markup)?.[1];
}

/** Page body the panel resolved from the URL. */
function shownPage(markup: string) {
  return attribute(markup, "data-page");
}

/** Navigation item the panel marks current for the real Settings navigation. */
function selectedPage(markup: string) {
  return attribute(markup, "data-current");
}

/** Call the chrome.select the rendered page body was given, as its own links would. */
function selectFrom(page: string, id: string) {
  const select = state.selects.get(page);
  if (!select) throw new Error(`no page body registered a select for ${page}`);
  select(id);
}

beforeEach(() => {
  state.push.mockClear();
  state.replace.mockClear();
  state.search = "";
});

it("shows the page the URL names on reload and direct links", () => {
  const privacy = render("page=privacy");
  expect(shownPage(privacy)).toBe("privacy");
  expect(selectedPage(privacy)).toBe("privacy");
  // B002-14: reloading the address returns to the page the address names.
  expect(shownPage(render("page=data-access"))).toBe("data-access");
  expect(selectedPage(render("page=connections"))).toBe("connections");
});

it("writes the selection into the URL and keeps unrelated parameters", () => {
  expect(shownPage(render("page=data-access&tab=audit&clientId=abc"))).toBe(
    "data-access",
  );
  selectFrom("data-access", "privacy");
  expect(state.push).toHaveBeenCalledTimes(1);
  const [target, options] = state.push.mock.calls[0] as [
    string,
    { scroll?: boolean },
  ];
  expect(target).toBe(
    "/settings/preferences?page=privacy&tab=audit&clientId=abc",
  );
  expect(options).toEqual({ scroll: false });
  // The pushed address renders the selected page, so the tab and the body agree.
  const pushed = new URL(target, "http://x").search.slice(1);
  expect(shownPage(render(pushed))).toBe("privacy");
  expect(selectedPage(render(pushed))).toBe("privacy");
});

it("follows an external query change without writing another URL", () => {
  expect(shownPage(render("page=data-access"))).toBe("data-access");
  // B003-11: the Connections link in the Data access body changed only the address.
  expect(shownPage(render("page=connections"))).toBe("connections");
  expect(selectedPage(render("page=connections"))).toBe("connections");
  expect(state.push).not.toHaveBeenCalled();
});

it("follows back and forward between pages", () => {
  expect(shownPage(render("page=privacy"))).toBe("privacy");
  expect(shownPage(render("page=connections"))).toBe("connections");
  expect(shownPage(render("page=privacy"))).toBe("privacy");
  expect(state.push).not.toHaveBeenCalled();
});

it("falls back to Personal defaults for an unknown page id", () => {
  const markup = render("page=not-a-page");
  expect(shownPage(markup)).toBe("personal");
  expect(selectedPage(markup)).toBe("personal");
  expect(state.push).not.toHaveBeenCalled();
});

it("replaces the current entry for a current-page click and ignores an unowned id", () => {
  expect(shownPage(render("page=data-access"))).toBe("data-access");
  selectFrom("data-access", "data-access");
  selectFrom("data-access", "not-a-page");
  expect(state.push).not.toHaveBeenCalled();
  // Replacement keeps the history entry count unchanged while still acting on the click,
  // so a pending navigation started by any other entry point is cancelled.
  expect(state.replace.mock.calls.map(([target]) => target)).toEqual([
    "/settings/preferences?page=data-access",
  ]);
});

it("acts on a current-page click without sourcing pending navigation from one entry point", () => {
  expect(shownPage(render("page=data-access&tab=audit"))).toBe("data-access");
  selectFrom("data-access", "data-access");
  expect(state.push).not.toHaveBeenCalled();
  expect(state.replace.mock.calls.map(([target]) => target)).toEqual([
    "/settings/preferences?page=data-access&tab=audit",
  ]);
});

it("keeps one current navigation item for the resolved page", () => {
  const markup = render("page=usage");
  expect(attribute(markup, "data-nav-size")).toBe("9");
  expect(attribute(markup, "data-current")).toBe("usage");
});

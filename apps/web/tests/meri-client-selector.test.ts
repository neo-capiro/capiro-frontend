import { afterEach, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  GENERAL_SCOPE_ID,
  MeriClientSelector,
  ScopeRoster,
  scopeHref,
  scopeOptions,
} from "../src/features/meri/MeriClientSelector";

const mocks = vi.hoisted(() => ({
  query: {} as Record<string, unknown>,
  selected: { state: "no-selection" } as Record<string, unknown>,
  useClients: vi.fn(),
  search: "",
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(mocks.search),
}));
vi.mock("../src/shared/portfolio/api/clients", () => ({
  useClients: (options: unknown) => {
    mocks.useClients(options);
    return mocks.query;
  },
}));
vi.mock("../src/shared/session/SelectedClient", () => ({
  useSelectedClient: () => mocks.selected,
}));

const scope = { tenantId: "tenant-a", userId: "actor-a" };
const activeId = "11111111-1111-4111-8111-111111111111";
const archivedId = "22222222-2222-4222-8222-222222222222";
const roster = (
  data: readonly { id: string; name: string; status: string }[],
) => ({
  isSuccess: true,
  isPending: false,
  isFetching: false,
  error: null,
  data,
});
const renderRoster = (props: Parameters<typeof ScopeRoster>[0]) =>
  renderToStaticMarkup(createElement(ScopeRoster, props));

afterEach(() => {
  mocks.query = {};
  mocks.selected = { state: "no-selection" };
  mocks.useClients.mockClear();
  mocks.search = "";
});

it("offers General first and only returned, nonarchived clients as scopes", () => {
  const options = scopeOptions([
    { id: activeId, name: "Current client", status: "active" },
    { id: archivedId, name: "Archived client", status: "archived" },
    { id: "3", name: "  ", status: "active" },
  ]);
  expect(options.map((option) => option.id)).toEqual([
    GENERAL_SCOPE_ID,
    activeId,
    "3",
  ]);
  expect(options[0]).toMatchObject({ name: "General workspace" });
  expect(options[2]).toMatchObject({ name: "Unnamed client" });
  expect(scopeHref("/meri", GENERAL_SCOPE_ID)).toBe("/meri?scope=general");
  expect(scopeHref("/meri/conversations", activeId)).toBe(
    `/meri/conversations?clientId=${activeId}`,
  );
});

it("applies the chosen scope through the existing scoped route only", () => {
  const html = renderRoster({
    verified: true,
    roster: roster([
      { id: activeId, name: "Current client", status: "active" },
      { id: archivedId, name: "Archived client", status: "archived" },
    ]),
    destination: "/meri",
    appliedId: activeId,
    onClose: () => undefined,
  });

  expect(html).toContain(`href="/meri?clientId=${activeId}"`);
  expect(html).toContain('aria-current="page"');
  expect(html).toContain("Current scope · Authorized client workspace");
  expect(html).toContain("Data scope");
  expect(html).toContain("Your draft is preserved");
  expect(html).not.toContain(archivedId);
  expect(html).not.toContain("Archived client");
});

it("shows an empty roster without selecting a client", () => {
  const html = renderRoster({
    verified: true,
    roster: roster([
      { id: archivedId, name: "Archived client", status: "archived" },
    ]),
    destination: "/meri",
    onClose: () => undefined,
  });

  expect(html).toContain("No available clients were returned");
  expect(html).toContain('href="/meri?scope=general"');
  expect(html).toContain("Not applied · Your permitted firm sources");
  expect(html).toContain("Ready to apply General workspace");
  expect(html).not.toContain("Current scope ·");
  expect(html.indexOf('href="/meri?scope=general"')).toBeLessThan(
    html.indexOf('aria-label="Permitted scopes"'),
  );
  expect(html).not.toContain('href="/meri?clientId=');
});

it("labels the trigger from the current scope and never from the roster", () => {
  mocks.search = "scope=general";
  mocks.query = roster([]);
  const general = renderToStaticMarkup(
    createElement(MeriClientSelector, { scope }),
  );
  expect(mocks.useClients).toHaveBeenCalledWith({ enabled: true, scope });
  expect(general).toContain(">General<");
  expect(general).toContain('aria-haspopup="dialog"');
  expect(general).not.toContain('href="/meri?clientId=');

  mocks.search = "";
  mocks.selected = {
    state: "authorized-client",
    client: { id: activeId, name: "Current client" },
  };
  const client = renderToStaticMarkup(
    createElement(MeriClientSelector, { scope }),
  );
  expect(client).toContain(">Current client<");

  mocks.selected = { state: "no-selection" };
  const none = renderToStaticMarkup(
    createElement(MeriClientSelector, { scope }),
  );
  expect(none).toContain(">Choose a scope<");
});

it("keeps the roster unavailable when identity or the list is not verified", () => {
  const error = renderRoster({
    verified: true,
    roster: {
      isSuccess: false,
      isPending: false,
      isFetching: false,
      error: new Error("unavailable"),
      refetch: vi.fn(),
    },
    destination: "/meri",
    onClose: () => undefined,
  });
  const unverified = renderRoster({
    verified: false,
    roster: {},
    destination: "/meri",
    onClose: () => undefined,
  });
  renderToStaticMarkup(createElement(MeriClientSelector));

  expect(error).toContain("Available clients could not be loaded");
  expect(error).toContain("Retry clients");
  expect(error).not.toContain('href="/meri?clientId=');
  expect(unverified).toContain("Verify your account");
  expect(mocks.useClients).toHaveBeenLastCalledWith({
    enabled: false,
    scope: { tenantId: "", userId: "" },
  });
});

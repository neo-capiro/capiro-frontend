import { afterEach, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MeriClientSelector } from "../src/features/meri/MeriClientSelector";

const mocks = vi.hoisted(() => ({
  query: {} as Record<string, unknown>,
  selected: { state: "no-selection" } as Record<string, unknown>,
  useClients: vi.fn(),
}));
vi.mock("../src/features/portfolio/index/public", () => ({
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

afterEach(() => {
  mocks.query = {};
  mocks.selected = { state: "no-selection" };
  mocks.useClients.mockClear();
});

it("offers only returned, nonarchived clients as explicit Meri route choices", () => {
  mocks.query = {
    isSuccess: true,
    isPending: false,
    isFetching: false,
    error: null,
    data: [
      { id: activeId, name: "Current client", status: "active" },
      { id: archivedId, name: "Archived client", status: "archived" },
    ],
  };
  mocks.selected = {
    state: "authorized-client",
    client: { id: activeId, name: "Current client" },
  };
  const html = renderToStaticMarkup(
    createElement(MeriClientSelector, { scope }),
  );

  expect(mocks.useClients).toHaveBeenCalledWith({ enabled: true, scope });
  expect(html).toContain(`href="/meri?clientId=${activeId}"`);
  expect(html).toContain('aria-current="page"');
  expect(html).not.toContain(archivedId);
  expect(html).not.toContain("Archived client");
});

it("shows an empty roster without selecting a client", () => {
  mocks.query = {
    isSuccess: true,
    isPending: false,
    isFetching: false,
    error: null,
    data: [{ id: archivedId, name: "Archived client", status: "archived" }],
  };
  const html = renderToStaticMarkup(
    createElement(MeriClientSelector, { scope }),
  );

  expect(html).toContain("Choose client");
  expect(html).toContain("No available clients were returned");
  expect(html).not.toContain('href="/meri?clientId=');
});

it("keeps the roster unavailable when identity or the list is not verified", () => {
  mocks.query = {
    isSuccess: false,
    isPending: false,
    isFetching: false,
    error: new Error("unavailable"),
    refetch: vi.fn(),
  };
  const error = renderToStaticMarkup(
    createElement(MeriClientSelector, { scope }),
  );
  const unverified = renderToStaticMarkup(createElement(MeriClientSelector));

  expect(error).toContain("Available clients could not be loaded");
  expect(error).toContain("Retry clients");
  expect(error).not.toContain('href="/meri?clientId=');
  expect(unverified).toContain("Verify your account");
  expect(mocks.useClients).toHaveBeenLastCalledWith({
    enabled: false,
    scope: { tenantId: "", userId: "" },
  });
});

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
import { ModuleHub } from "../src/features/modules/hub/ModuleHub";

const state = vi.hoisted(() => ({
  params: "",
  reads: [] as { key: string; input: unknown; enabled?: boolean }[],
  clientsError: undefined as Error | undefined,
  fundingError: undefined as Error | undefined,
  directoryError: undefined as Error | undefined,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(state.params),
}));
vi.mock("../src/shared/capiro/queries", () => ({
  useCapiroQuery: (
    key: string,
    input: unknown,
    options?: { enabled: boolean },
  ) => {
    state.reads.push({ key, input, enabled: options?.enabled });
    if (key === "clients.list")
      return {
        data: [],
        loading: false,
        error: state.clientsError,
        reload: vi.fn(),
      };
    if (key === "directory.metrics")
      return {
        loading: false,
        error: state.directoryError,
        reload: vi.fn(),
        data: {
          metric: "directory_contacts",
          definitionVersion: 1,
          scope: "global_catalog",
          count: 501,
          complete: true,
          capped: false,
          observedAt: "2026-10-31T12:00:00.000Z",
          snapshot: {
            sourceId: "synthetic/catalog",
            state: "previous_fallback",
            loadedAt: "2026-10-31T11:00:00.000Z",
            checkedAt: "2026-10-31T11:00:00.000Z",
            publisherObservedAt: null,
          },
        },
      };
    if (key !== "intelligence.funding.search")
      throw Error(`Unexpected owner read: ${key}`);
    return {
      loading: false,
      error: state.fundingError,
      reload: vi.fn(),
      data: {
        opportunities: [],
        page: 1,
        pageSize: 1,
        total: 1201,
        totalIsCapped: false,
        catalogComplete: true,
        counts: { active: 1201, grants: 1201, contracts: 0, closed: 0 },
        generatedAt: new Date().toISOString(),
        emptyReason: null,
        freshness: [
          {
            source: "grants_gov",
            state: "current",
            lastSyncedAt: new Date().toISOString(),
            recordCount: 99999,
          },
        ],
      },
    };
  },
}));
beforeEach(() => {
  state.params = "";
  state.reads = [];
  state.clientsError = undefined;
  state.fundingError = undefined;
  state.directoryError = undefined;
});
const render = () => renderToStaticMarkup(createElement(ModuleHub));
const fundingRead = () =>
  state.reads.find((r) => r.key === "intelligence.funding.search");

it("mounts independent supported domain aggregates alongside the roster", () => {
  const html = render();
  expect(state.reads.map((r) => r.key).sort()).toEqual([
    "clients.list",
    "directory.metrics",
    "intelligence.funding.search",
  ]);
  expect(fundingRead()).toMatchObject({
    input: { query: { lifecycle: "active", pageSize: 1, mode: "all" } },
    enabled: true,
  });
  expect(html).toContain("1,201");
  expect(html).toContain("Enabled funding catalogs");
  expect(html).toContain("Source records, not awarded dollars");
  expect(html).toContain('href="/modules/planner"');
});

it("keeps selected scope visible when omitted by the roster and queries that exact client", () => {
  const clientId = "10000000-0000-4000-8000-000000000001";
  state.params = `clientId=${clientId}`;
  const html = render();
  expect(html).toContain(
    `<option value="${clientId}" selected="">Selected client (name unavailable)</option>`,
  );
  expect(fundingRead()).toMatchObject({
    input: { query: { mode: "matched", clientId } },
  });
  expect(html).toContain("Matched to this client");
});

it("never falls back to all-client totals for a malformed client hint", () => {
  state.params = "clientId=invalid";
  const html = render();
  expect(fundingRead()).toMatchObject({ input: {}, enabled: false });
  expect(html).not.toContain("1,201");
  expect(html).toContain("Select a valid client scope");
});

it("preserves a valid owner result when the independent roster fails", () => {
  state.clientsError = Error("private roster error");
  const html = render();
  expect(html).toContain("Client scope could not be loaded");
  expect(html).toContain("1,201");
  expect(html).not.toContain("private roster error");
});

it("discards a refused funding result without erasing other module navigation", () => {
  state.fundingError = Object.assign(Error("private forbidden detail"), {
    status: 403,
  });
  const html = render();
  expect(html).toContain("Access denied");
  expect(html).not.toContain("1,201");
  expect(html).not.toContain("private forbidden detail");
  expect(html).toContain('href="/modules/workspace"');
  expect(html).toContain("501");
});

it("keeps the global Directory count across selected-client changes and discloses fallback freshness", () => {
  for (const clientId of [
    "",
    "10000000-0000-4000-8000-000000000001",
    "invalid",
  ]) {
    state.params = `clientId=${clientId}`;
    const html = render();
    expect(html).toContain("501");
    expect(html).toContain("Global catalog");
    expect(html).toContain("Unaffected by client selection");
    expect(html).toContain("Previous snapshot fallback");
    expect(html).toContain("Publisher freshness unknown");
  }
  expect(
    state.reads
      .filter((r) => r.key === "directory.metrics")
      .every((r) => JSON.stringify(r.input) === "{}"),
  ).toBe(true);
});

it("a Directory failure withholds its old count without invalidating funding", () => {
  state.directoryError = Object.assign(Error("private source detail"), {
    status: 403,
  });
  const html = render();
  expect(html).not.toContain("501");
  expect(html).not.toContain("Previous snapshot fallback");
  expect(html).not.toContain("private source detail");
  expect(html).toContain("1,201");
  expect(html).toContain("Access denied");
});

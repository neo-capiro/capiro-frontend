import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
import { ModuleHub } from "../src/features/modules/hub/ModuleHub";

const state = vi.hoisted(() => ({
  capiroOptions: [] as unknown[],
  capiroData: [] as { id: string; name: string }[],
  capiroError: null as Error | null,
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/modules",
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("../src/shared/capiro/queries", () => ({
  useCapiroQuery: (key: string, _input: unknown, options: unknown) => {
    state.capiroOptions.push(options);
    if (
      [
        "intelligence.funding.search",
        "directory.metrics",
        "planner.metrics.overdue",
        "strategies.metrics.active",
        "workspace.metrics.savedWork",
      ].includes(key)
    )
      return { loading: true, reload: vi.fn() };
    return {
      data: state.capiroData,
      error: state.capiroError,
      loading: false,
      reload: vi.fn(),
    };
  },
}));

beforeEach(() => {
  state.capiroOptions = [];
  state.capiroData = [];
  state.capiroError = null;
});

it("offers the fixed Core roster without module destinations or selection", () => {
  state.capiroData = [
    { id: "10000000-0000-4000-8000-000000000001", name: "Allowed client" },
  ];
  const html = renderToStaticMarkup(
    createElement(ModuleHub, { previewCoreReadOnly: true }),
  );

  expect(state.capiroOptions).toEqual([undefined]);
  expect(html).toContain("Allowed client");
  expect(html).toContain("Available client profiles");
  expect(html).toContain(
    "Client selection, module records, and actions are unavailable",
  );
  expect(html).not.toContain("Client profile scope");
  expect(html).not.toContain('href="/modules/');
  expect(html).not.toContain("Run the work");
});

it("keeps a failed fixed roster unavailable with an explicit retry", () => {
  state.capiroError = new Error("Core unavailable");
  state.capiroData = [
    { id: "10000000-0000-4000-8000-000000000001", name: "Stale client" },
  ];
  const html = renderToStaticMarkup(
    createElement(ModuleHub, { previewCoreReadOnly: true }),
  );

  expect(html).toContain("Client scope could not be loaded");
  expect(html).toContain("Try again");
  expect(html).not.toContain("Core unavailable");
  expect(html).not.toContain("Stale client");
  expect(state.capiroOptions).toEqual([undefined]);
});

it("keeps the ordinary Modules hub on its existing Capiro operation", () => {
  const html = renderToStaticMarkup(createElement(ModuleHub));

  expect(
    state.capiroOptions.filter((options) => options !== undefined),
  ).toEqual([
    ...Array.from({ length: 6 }, () => ({ enabled: true })),
    { enabled: false },
  ]);
  expect(state.capiroOptions).toHaveLength(9);
  expect(html).toContain("Everything in Capiro");
  expect(html).toContain("Run the work");
  expect(html).toContain('href="/modules/engagement"');
});

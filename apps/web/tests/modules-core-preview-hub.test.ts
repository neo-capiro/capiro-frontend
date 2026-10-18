import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
import { ModuleHub } from "../src/features/modules/hub/ModuleHub";

const state = vi.hoisted(() => ({
  nativeOptions: [] as unknown[],
  capiroOptions: [] as unknown[],
  nativeData: [] as { id: string; name: string }[],
  nativeError: null as Error | null,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("../src/shared/portfolio/api/clients", () => ({
  useClients: (options: unknown) => {
    state.nativeOptions.push(options);
    return {
      data: state.nativeData,
      error: state.nativeError,
      isSuccess: !state.nativeError,
      isPending: false,
      refetch: vi.fn(),
    };
  },
}));
vi.mock("../src/shared/capiro/queries", () => ({
  useCapiroQuery: (_key: string, _input: unknown, options: unknown) => {
    state.capiroOptions.push(options);
    return { data: [], error: null, loading: false, reload: vi.fn() };
  },
}));

beforeEach(() => {
  state.nativeOptions = [];
  state.capiroOptions = [];
  state.nativeData = [];
  state.nativeError = null;
});

it("offers the native Core roster without loading the ordinary Capiro operation or module destinations", () => {
  state.nativeData = [
    { id: "10000000-0000-4000-8000-000000000001", name: "Allowed client" },
  ];
  const html = renderToStaticMarkup(
    createElement(ModuleHub, { previewCoreReadOnly: true }),
  );

  expect(state.nativeOptions).toEqual([{ enabled: true }]);
  expect(state.capiroOptions).toEqual([{ enabled: false }]);
  expect(html).toContain("Allowed client");
  expect(html).toContain("Client scope is available");
  expect(html).toContain("Module records and actions are unavailable");
  expect(html).not.toContain('href="/modules/');
  expect(html).not.toContain("Run the work");
});

it("keeps a failed native roster unavailable with an explicit retry", () => {
  state.nativeError = new Error("Core unavailable");
  state.nativeData = [
    { id: "10000000-0000-4000-8000-000000000001", name: "Stale client" },
  ];
  const html = renderToStaticMarkup(
    createElement(ModuleHub, { previewCoreReadOnly: true }),
  );

  expect(html).toContain("Client scope could not be loaded");
  expect(html).toContain("Try again");
  expect(html).not.toContain("Core unavailable");
  expect(html).not.toContain("Stale client");
  expect(state.capiroOptions).toEqual([{ enabled: false }]);
});

it("keeps the ordinary Modules hub on its existing Capiro operation", () => {
  const html = renderToStaticMarkup(createElement(ModuleHub));

  expect(state.nativeOptions).toEqual([{ enabled: false }]);
  expect(state.capiroOptions).toEqual([{ enabled: true }]);
  expect(html).toContain("Everything in Capiro");
  expect(html).toContain("Run the work");
  expect(html).toContain('href="/modules/engagement"');
});

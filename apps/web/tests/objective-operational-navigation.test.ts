import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StrategiesScreen } from "../src/features/modules/strategies/StrategiesScreen";
import { PlannerScreen } from "../src/features/modules/planner/PlannerScreen";

const state = vi.hoisted(() => ({
  params: "",
  scopeState: "authorized-client",
  clientId: "30000000-0000-4000-8000-000000000001",
  clientStatus: "active",
  responses: {} as Record<
    string,
    { data?: unknown; loading?: boolean; error?: Error }
  >,
  reads: [] as { key: string; input: unknown; enabled: boolean }[],
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(state.params),
  useRouter: () => ({ replace: vi.fn() }),
}));
vi.mock("../src/shared/session/SelectedClient", () => ({
  useSelectedClient: () => ({
    state: state.scopeState,
    requestedId: state.clientId,
    client: { id: state.clientId, status: state.clientStatus },
  }),
}));
vi.mock("../src/shared/capiro/queries", () => ({
  useCapiroMutation: () => ({
    pending: false,
    run: vi.fn(() => {
      throw new Error("Navigation must not start a Strategy watch mutation.");
    }),
    reset: vi.fn(),
  }),
  useCapiroQuery: (
    key: string,
    input: unknown,
    options: { enabled?: boolean } = {},
  ) => {
    const enabled = options.enabled ?? true;
    state.reads.push({ key, input, enabled });
    return {
      loading: false,
      ...(enabled ? state.responses[key] : {}),
      reload: vi.fn(),
    };
  },
}));
vi.mock("../src/features/modules/planner/TaskWorkspace", () => ({
  TaskWorkspace: ({ projectId }: { projectId: string }) =>
    createElement(
      "section",
      { "data-current-project": projectId },
      "Project work",
    ),
}));
vi.mock("../src/features/modules/planner/ProjectCatalog", () => ({
  ProjectCatalog: () =>
    createElement("p", null, "All-project catalog fallback"),
}));
const clientId = "30000000-0000-4000-8000-000000000001";
const otherClient = "30000000-0000-4000-8000-000000000002";
const resourceId = "50000000-0000-4000-8000-000000000001";
const otherId = "50000000-0000-4000-8000-000000000002";
const strategy = {
  id: resourceId,
  clientId,
  title: "Synthetic current Strategy",
  type: "appropriations",
  goal: null,
  lastEditedAt: "2026-10-16T12:00:00Z",
  nodes: [],
};
const project = { id: resourceId, clientId, archived: false };
const render = (kind: "strategy" | "project") =>
  renderToStaticMarkup(
    kind === "strategy"
      ? createElement(StrategiesScreen)
      : createElement(PlannerScreen),
  );
const select = (kind: "strategy" | "project") => {
  state.params = new URLSearchParams({
    clientId,
    [kind]: resourceId,
    ...(kind === "project" ? { view: "projects" } : {}),
  }).toString();
};
beforeEach(() => {
  state.scopeState = "authorized-client";
  state.clientId = clientId;
  state.clientStatus = "active";
  state.params = "";
  state.reads = [];
  state.responses = {
    "strategies.detail": { data: strategy },
    "planner.bootstrap": { data: { projects: [project], people: [] } },
  };
});

describe("ordinary current-resource links", () => {
  it("opens the normal current Strategy only for its exact returned ID and client", () => {
    select("strategy");
    expect(render("strategy")).toContain("Synthetic current Strategy");
    expect(state.reads).toContainEqual({
      key: "strategies.detail",
      input: { params: { id: resourceId } },
      enabled: true,
    });
    for (const data of [
      { ...strategy, id: otherId },
      { ...strategy, clientId: otherClient },
    ]) {
      state.responses["strategies.detail"] = { data };
      const html = render("strategy");
      expect(html).toContain("unavailable in the selected client scope");
      expect(html).not.toContain("Synthetic current Strategy");
    }
    expect(state.reads.some((read) => read.key.includes("objective"))).toBe(
      false,
    );
  });

  it("withholds Strategy content while the current read loads or fails", () => {
    select("strategy");
    for (const response of [
      { data: strategy, loading: true },
      { data: strategy, error: new Error("Synthetic current read denied") },
    ]) {
      state.responses["strategies.detail"] = response;
      expect(render("strategy")).not.toContain("Synthetic current Strategy");
    }
  });

  it("opens only the exact nonarchived matching-client project from fresh bootstrap", () => {
    select("project");
    expect(render("project")).toContain(`data-current-project="${resourceId}"`);
    for (const projects of [
      [],
      [{ ...project, clientId: otherClient }],
      [{ ...project, archived: true }],
      [project, project],
    ]) {
      state.responses["planner.bootstrap"] = { data: { projects, people: [] } };
      const html = render("project");
      expect(html).toContain("unavailable in the selected client scope");
      expect(html).not.toContain("data-current-project");
      expect(html).not.toContain("All-project catalog fallback");
    }
    state.responses["planner.bootstrap"] = {
      data: { projects: [project], people: [] },
    };
    state.clientStatus = "archived";
    expect(render("project")).toContain(
      "unavailable in the selected client scope",
    );
  });

  it("withholds project work on bootstrap loading or error without catalog fallback", () => {
    select("project");
    for (const response of [
      { data: { projects: [project], people: [] }, loading: true },
      {
        data: { projects: [project], people: [] },
        error: new Error("Synthetic bootstrap denied"),
      },
    ]) {
      state.responses["planner.bootstrap"] = response;
      const html = render("project");
      expect(html).not.toContain("data-current-project");
      expect(html).not.toContain("All-project catalog fallback");
    }
  });

  it("refuses malformed or duplicate explicit selectors before reading a resource", () => {
    for (const kind of ["strategy", "project"] as const) {
      for (const invalid of [
        "invalid",
        "",
        `${resourceId}&${kind}=${otherId}`,
      ]) {
        select(kind);
        state.params = state.params.replace(
          `${kind}=${resourceId}`,
          `${kind}=${invalid}`,
        );
        state.reads = [];
        const html = render(kind);
        expect(html).toContain("link is invalid");
        expect(state.reads.filter((read) => read.enabled)).toEqual([]);
      }
    }
  });

  it("does not read or display linked resources before canonical client scope matches", () => {
    for (const kind of ["strategy", "project"] as const) {
      select(kind);
      for (const scope of [
        "loading",
        "unavailable",
        "no-selection",
        "authorized-client",
      ]) {
        state.scopeState = scope;
        state.clientId = otherClient;
        state.reads = [];
        const html = render(kind);
        expect(state.reads.filter((read) => read.enabled)).toEqual([]);
        expect(html).not.toContain("data-current-project");
        expect(html).not.toContain("Synthetic current Strategy");
      }
    }
  });
});

import { expect, it, vi } from "vitest";
import {
  ownedMetrics,
  hubOwnedRequest,
  ownedMetricObservation,
  type OwnedMetricModule,
} from "../src/features/modules/hub/hub-owned-metrics";
import { plannerMetricOperations } from "../src/shared/capiro/operations/planner-metrics";
import { strategyMetricOperations } from "../src/shared/capiro/operations/strategy-metrics";
import { workspaceMetricOperations } from "../src/shared/capiro/operations/workspace-metrics";
import { createCapiroApi } from "../src/shared/capiro/http";
import { serviceErrorResponse } from "../src/shared/capiro/gateway-errors";

const modules: OwnedMetricModule[] = ["planner", "strategies", "workspace"];
const client = "abcdef00-0000-4000-8000-000000000001";
const other = "abcdef00-0000-4000-8000-000000000002";
const observedAt = "2026-10-31T12:00:00.000Z";
const at = Date.parse(observedAt);
function fixture(module: OwnedMetricModule, clientId = "") {
  return {
    metric: {
      planner: "planner.overdue_unfinished",
      strategies: "strategy.active",
      workspace: "workspace.saved-work-products",
    }[module],
    version: 1,
    count: 1201,
    complete: true,
    capped: false,
    observedAt,
    scope: clientId
      ? { kind: "client", clientId }
      : module === "workspace"
        ? { kind: "actor", clientId: null }
        : { kind: "actor" },
    ...(module === "workspace"
      ? { observationStartedAt: observedAt }
      : { asOf: observedAt, state: "complete" }),
    ...(module === "planner"
      ? {
          deadline: {
            timed: "strictly_before_asOf",
            dateOnly: "before_local_asOf_day",
            defaultTimeZone: "UTC",
          },
        }
      : {}),
  };
}
const registry = {
  ...plannerMetricOperations,
  ...strategyMetricOperations,
  ...workspaceMetricOperations,
};

it("carries a sanitized Workspace incomplete refusal through gateway, browser API and card", async () => {
  const response = await serviceErrorResponse(
    Response.json(
      {
        code: "WORKSPACE_SAVED_WORK_INCOMPLETE",
        count: 999,
        message: "private detail",
      },
      { status: 503 },
    ),
    workspaceMetricOperations["workspace.metrics.savedWork"],
    new AbortController().signal,
    false,
  );
  const api = createCapiroApi(registry, { fetcher: async () => response });
  const error = await api
    .request("workspace.metrics.savedWork", {})
    .catch((e: Error) => e);
  if (!(error instanceof Error)) throw Error("Expected refusal");
  const result = ownedMetricObservation(
    "workspace",
    { loading: false, error },
    "",
    at,
  );
  expect(result.state.status).toBe("partial");
  expect(JSON.stringify(result)).not.toMatch(/999|private detail/);
});
it("registers only the fixed owning service paths and accepts no authority or paging inputs", () => {
  expect(
    Object.values(registry).map((op) => [op.service, op.method, op.path]),
  ).toEqual([
    ["strategy", "GET", "/planner/metrics/overdue"],
    ["strategy", "GET", "/strategies/metrics/active"],
    ["workspace", "GET", "/drafts/saved-work-count"],
  ]);
  for (const op of Object.values(registry)) {
    expect(
      op.request.parse({ query: { clientId: client.toUpperCase() } }),
    ).toEqual({ query: { clientId: client } });
    for (const input of [
      { tenantId: client },
      { query: { actorId: client } },
      { query: { limit: 50 } },
      { query: { clientId: [client, other] } },
      { query: { clientId: "name" } },
    ])
      expect(op.request.safeParse(input).success).toBe(false);
  }
  expect(hubOwnedRequest("invalid")).toBeNull();
  expect(hubOwnedRequest("")).toEqual({ query: {} });
});
it.each(modules)(
  "%s consumes full counts and explicit zero with original scope/time",
  (module) => {
    for (const clientId of ["", client])
      for (const count of [0, 1201]) {
        const result = ownedMetricObservation(
          module,
          { loading: false, data: { ...fixture(module, clientId), count } },
          clientId.toUpperCase(),
          at,
        );
        expect(result.state).toEqual({
          status: "available",
          value: count,
          observedAt,
          stale: false,
        });
        expect(result.notice).toContain(observedAt);
      }
  },
);
it.each(modules)(
  "%s refuses wrong identity, scope, count, branch, and clock",
  (module) => {
    for (const patch of [
      { metric: "another.metric" },
      { version: 2 },
      { count: -1 },
      { count: 0.5 },
      { count: Number.MAX_SAFE_INTEGER + 1 },
      { capped: true },
      { complete: false },
      { observedAt: "bad" },
      { observedAt: "2026-10-30T00:00:00.000Z" },
      { scope: { kind: "client", clientId: other } },
    ]) {
      expect(
        ownedMetricObservation(
          module,
          { loading: false, data: { ...fixture(module), ...patch } },
          "",
          at,
        ).state.status,
      ).toBe("unavailable");
    }
    expect(
      ownedMetricObservation(
        module,
        { loading: false, data: fixture(module) },
        client,
        at,
      ).state.status,
    ).toBe("unavailable");
    expect(
      ownedMetricObservation(
        module,
        { loading: false, data: fixture(module, client) },
        other,
        at,
      ).state.status,
    ).toBe("unavailable");
    expect(
      ownedMetricObservation(
        module,
        { loading: false, data: fixture(module) },
        "invalid",
        at,
      ).state.status,
    ).toBe("unavailable");
  },
);
it.each(["planner", "strategies"] as const)(
  "%s receives incomplete200 only as a coherent withheld observation",
  (module) => {
    const incomplete = {
      ...fixture(module),
      state: "incomplete",
      complete: false,
      count: null,
      reason: "source_changed",
    };
    expect(
      ownedMetricObservation(
        module,
        { loading: false, data: incomplete },
        "",
        at,
      ).state.status,
    ).toBe("partial");
    for (const patch of [
      { count: 0 },
      { complete: true },
      { capped: true },
      { reason: "invented" },
    ])
      expect(
        ownedMetricObservation(
          module,
          { loading: false, data: { ...incomplete, ...patch } },
          "",
          at,
        ).state.status,
      ).toBe("unavailable");
  },
);
it("does not reinterpret Planner deadline semantics", () => {
  expect(
    ownedMetricObservation(
      "planner",
      {
        loading: false,
        data: {
          ...fixture("planner"),
          deadline: {
            timed: "strictly_before_asOf",
            dateOnly: "before_UTC_day",
            defaultTimeZone: "UTC",
          },
        },
      },
      "",
      at,
    ).state.status,
  ).toBe("unavailable");
});
it.each(modules)(
  "%s clears retained values/details during refresh and refusal, and marks old observations stale",
  (module) => {
    for (const status of [401, 403, 404, 503]) {
      const result = ownedMetricObservation(
        module,
        {
          loading: false,
          data: fixture(module),
          error: Object.assign(Error("private detail"), { status }),
        },
        "",
        at,
      );
      expect(result.state.status).toBe(
        status === 401 || status === 403 ? "denied" : "unavailable",
      );
      expect(result).not.toHaveProperty("notice");
      expect(JSON.stringify(result)).not.toMatch(/1201|private detail/);
    }
    expect(
      ownedMetricObservation(
        module,
        { loading: true, data: fixture(module) },
        "",
        at,
      ),
    ).toEqual({ state: { status: "loading" } });
    expect(
      ownedMetricObservation(
        module,
        { loading: false, data: fixture(module) },
        "",
        at + 120001,
      ).state,
    ).toMatchObject({ stale: true, observedAt });
  },
);
it.each(modules)(
  "%s cannot admit a late successful response after authenticated scope cancellation",
  async (module) => {
    let release!: (response: Response) => void;
    const controller = new AbortController();
    const fetcher = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          release = resolve;
        }),
    );
    const api = createCapiroApi(registry, {
      fetcher,
      scopeSignal: () => controller.signal,
    });
    const pending = api.request(ownedMetrics[module].key, {});
    const rejection = expect(pending).rejects.toMatchObject({
      name: "AbortError",
    });
    controller.abort();
    release(Response.json(fixture(module)));
    await rejection;
  },
);

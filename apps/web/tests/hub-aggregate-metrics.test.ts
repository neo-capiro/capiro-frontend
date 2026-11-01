import { expect, it, vi } from "vitest";
import {
  aggregateMetrics,
  aggregateMetricObservation,
  hubAggregateRequest,
  type AggregateMetricModule,
} from "../src/features/modules/hub/hub-aggregate-metrics";
import { engagementMetricOperations } from "../src/shared/capiro/operations/engagement-metrics";
import { researchPortfolioMetricOperations } from "../src/shared/capiro/operations/research-portfolio-metrics";
import { createCapiroApi } from "../src/shared/capiro/http";

const modules: AggregateMetricModule[] = ["engagement", "research-portfolios"];
const client = "abcdef00-0000-4000-8000-000000000001";
const other = "abcdef00-0000-4000-8000-000000000002";
const observedAt = "2026-10-31T12:00:00.000Z";
const at = Date.parse(observedAt);
const windowStart = "2026-10-01T12:00:00.000Z";
const windowEnd = "2026-10-31T12:00:00.000Z";
const window = {
  start: windowStart,
  end: windowEnd,
  bounds: "[start,end)",
  basis: "created_or_sent",
} as const;

function fixture(module: AggregateMetricModule, clientId = "") {
  return {
    metric:
      module === "engagement"
        ? "personal_classic_outreach_30d"
        : "active_research_portfolios",
    version: 1,
    status: "complete",
    count: 1201,
    complete: true,
    capped: false,
    observedAt,
    scope: clientId ? { kind: "client", clientId } : { kind: "actor" },
    ...(module === "engagement" ? { window } : {}),
  };
}
const registry = {
  ...engagementMetricOperations,
  ...researchPortfolioMetricOperations,
};

it("registers only the fixed owning service paths and accepts no authority, window or paging inputs", () => {
  expect(
    Object.values(registry).map((op) => [op.service, op.method, op.path]),
  ).toEqual([
    ["engagement", "GET", "/engagement/outreach-metrics"],
    ["core", "GET", "/research-portfolios/metrics"],
  ]);
  for (const op of Object.values(registry)) {
    expect(
      op.request.parse({ query: { clientId: client.toUpperCase() } }),
    ).toEqual({ query: { clientId: client } });
    for (const input of [
      { tenantId: client },
      { query: { actorId: client } },
      { query: { limit: 50 } },
      { query: { days: 30 } },
      { query: { clientId: [client, other] } },
      { query: { clientId: "name" } },
    ])
      expect(op.request.safeParse(input).success).toBe(false);
  }
  expect(hubAggregateRequest("invalid")).toBeNull();
  expect(hubAggregateRequest("")).toEqual({ query: {} });
});

it.each(modules)(
  "%s consumes full counts and explicit zero with original scope, time and notice",
  (module) => {
    for (const clientId of ["", client])
      for (const count of [0, 1201, 4097]) {
        const result = aggregateMetricObservation(
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
        expect(result.notice).toBeTruthy();
      }
  },
);

it.each(modules)(
  "%s refuses wrong identity, scope, count, branch and clock",
  (module) => {
    for (const patch of [
      { metric: "another.metric" },
      { version: 2 },
      { count: -1 },
      { count: 0.5 },
      { count: Number.MAX_SAFE_INTEGER + 1 },
      { capped: true },
      { complete: false },
      { status: "complete", count: null },
      { status: "incomplete", count: 1201 },
      { observedAt: "bad" },
      { scope: { kind: "client", clientId: other } },
      { scope: { kind: "actor", clientId: null } },
    ])
      expect(
        aggregateMetricObservation(
          module,
          { loading: false, data: { ...fixture(module), ...patch } },
          "",
          at,
        ).state.status,
      ).toBe("unavailable");
    expect(
      aggregateMetricObservation(
        module,
        { loading: false, data: fixture(module) },
        client,
        at,
      ).state.status,
    ).toBe("unavailable");
    expect(
      aggregateMetricObservation(
        module,
        { loading: false, data: fixture(module, client) },
        other,
        at,
      ).state.status,
    ).toBe("unavailable");
    expect(
      aggregateMetricObservation(
        module,
        { loading: false, data: fixture(module) },
        "invalid",
        at,
      ).state.status,
    ).toBe("unavailable");
  },
);

it.each(modules)(
  "%s receives a capped incomplete observation only as a coherent withheld total",
  (module) => {
    const incomplete = {
      ...fixture(module),
      status: "incomplete",
      complete: false,
      capped: true,
      count: null,
    };
    const partial = aggregateMetricObservation(
      module,
      { loading: false, data: incomplete },
      "",
      at,
    ).state;
    expect(partial.status).toBe("partial");
    expect(JSON.stringify(partial)).not.toMatch(/1201/);
    for (const patch of [
      { count: 0 },
      { count: 1201 },
      { complete: true },
      { capped: false },
      { status: "complete" },
    ])
      expect(
        aggregateMetricObservation(
          module,
          { loading: false, data: { ...incomplete, ...patch } },
          "",
          at,
        ).state.status,
      ).toBe("unavailable");
  },
);

it("keeps the Engagement window and basis as producer facts, never recomputed here", () => {
  for (const patch of [
    { start: "2026-10-02T12:00:00.000Z" },
    { end: "2026-11-01T12:00:00.001Z" },
    { bounds: "[start,end]" },
    { basis: "sent" },
  ]) {
    expect(
      aggregateMetricObservation(
        "engagement",
        {
          loading: false,
          data: { ...fixture("engagement"), window: { ...window, ...patch } },
        },
        "",
        at,
      ).state.status,
    ).toBe("unavailable");
  }
  // A producer window that is old relative to its own observation is displayed
  // as reported: the consumer applies no second window calculation.
  const shifted = {
    start: "2026-09-01T00:00:00.000Z",
    end: "2026-10-01T00:00:00.000Z",
  };
  expect(
    aggregateMetricObservation(
      "engagement",
      {
        loading: false,
        data: {
          ...fixture("engagement"),
          count: 3,
          window: { ...window, ...shifted },
        },
      },
      "",
      at,
    ).state,
  ).toMatchObject({ status: "available", value: 3 });
  const research = aggregateMetricObservation(
    "research-portfolios",
    { loading: false, data: fixture("research-portfolios") },
    "",
    at,
  );
  expect(research.state.status).toBe("available");
  expect(research.notice).not.toMatch(/Window/);
});

it.each(modules)(
  "%s keeps denied, unavailable and loading distinct and leaks no count",
  (module) => {
    for (const status of [401, 403, 404, 500, 503]) {
      const result = aggregateMetricObservation(
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
      aggregateMetricObservation(
        module,
        { loading: true, data: fixture(module) },
        "",
        at,
      ),
    ).toEqual({ state: { status: "loading" } });
    expect(
      aggregateMetricObservation(
        module,
        { loading: false, data: fixture(module) },
        "",
        at + 120001,
      ).state,
    ).toMatchObject({ stale: true, observedAt });
  },
);

it.each(modules)(
  "%s cannot admit a late successful response after scope cancellation",
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
    const pending = api.request(aggregateMetrics[module].key, {});
    const rejection = expect(pending).rejects.toMatchObject({
      name: "AbortError",
    });
    controller.abort();
    release(Response.json(fixture(module)));
    await rejection;
  },
);

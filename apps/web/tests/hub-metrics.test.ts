import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { HubMetric } from "../src/features/modules/hub/HubMetric";
import {
  fundingMetricState,
  hubFundingRequest,
  type FundingObservation,
  type HubMetricState,
} from "../src/features/modules/hub/hub-metrics";

const now = Date.parse("2026-10-31T12:00:00Z");
const observation = (total = 1201): FundingObservation => ({
  opportunities: [], // Page contents are deliberately unrelated to the aggregate.
  page: 1,
  pageSize: 1,
  total,
  totalIsCapped: false,
  catalogComplete: true,
  counts: { grants: total, contracts: 0, active: total, closed: 0 },
  emptyReason: null,
  generatedAt: new Date(now).toISOString(),
  freshness: [
    {
      source: "grants_gov",
      state: "current",
      lastSyncedAt: new Date(now).toISOString(),
      recordCount: 99999,
    },
    {
      source: "sam_gov",
      state: "not_enabled",
      lastSyncedAt: null,
      recordCount: null,
    },
  ],
});
const read = (data: FundingObservation, clock = now) =>
  fundingMetricState({ data, loading: false }, clock);
const render = (state: HubMetricState) =>
  renderToStaticMarkup(
    createElement(HubMetric, { label: "Active funding opportunities", state }),
  );

it("uses the full filtered aggregate beyond page limits, never roster/page/health counts", () => {
  expect(read(observation())).toMatchObject({
    status: "available",
    value: 1201,
    stale: false,
  });
  expect(render(read(observation()))).toContain("1,201");
  expect(render(read(observation()))).not.toContain("99,999");
});

it("shows an authoritative complete zero distinctly from missing data", () => {
  expect(read(observation(0))).toMatchObject({ status: "available", value: 0 });
  expect(render(read(observation(0)))).toContain("<strong>0</strong>");
  expect(render(fundingMetricState({ loading: false }, now))).toContain(
    "Unavailable",
  );
});

it.each([401, 403, 404, 500])(
  "hides prior values and raw error details after HTTP %i",
  (status) => {
    const state = fundingMetricState(
      {
        loading: false,
        data: observation(),
        error: Object.assign(new Error("private error detail"), { status }),
      },
      now,
    );
    expect(state.status).toBe(
      status === 401 || status === 403 ? "denied" : "unavailable",
    );
    expect(render(state)).not.toContain("1,201");
    expect(render(state)).not.toContain("private error");
  },
);

it.each([
  { catalogComplete: false },
  { totalIsCapped: true },
  {
    freshness: [
      {
        source: "grants_gov" as const,
        state: "unavailable",
        recordCount: null,
        lastSyncedAt: null,
      },
    ],
  },
  {
    freshness: [
      {
        source: "grants_gov" as const,
        state: "stale",
        recordCount: 1201,
        lastSyncedAt: null,
      },
    ],
  },
])("withholds an exact total for incomplete source evidence %j", (change) => {
  const state = read({ ...observation(), ...change });
  expect(state.status).toBe("partial");
  expect(render(state)).toContain("Partial coverage");
  expect(render(state)).not.toContain("1,201");
});

it("never turns no enabled sources into an empty population", () => {
  const data = observation(0);
  data.freshness = data.freshness.filter((s) => s.state === "not_enabled");
  expect(read(data).status).toBe("unavailable");
  expect(read({ ...data, freshness: [] }).status).toBe("unavailable");
});

it.each([null, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])(
  "rejects missing or invalid totals: %s",
  (total) => {
    expect(read({ ...observation(), total }).status).toBe("unavailable");
  },
);

it("rejects inconsistent active counts and invalid observation times", () => {
  const data = observation();
  expect(read({ ...data, counts: { ...data.counts, active: 1 } }).status).toBe(
    "unavailable",
  );
  expect(read({ ...data, generatedAt: "not-a-date" }).status).toBe(
    "unavailable",
  );
  expect(read({ ...data, generatedAt: "123" }).status).toBe("unavailable");
});

it("labels aging and future-skewed snapshots without silently presenting them as fresh", () => {
  expect(read(observation(), now + 120000)).toMatchObject({ stale: false });
  expect(read(observation(), now + 120001)).toMatchObject({ stale: true });
  expect(read(observation(), now - 120001)).toMatchObject({ stale: true });
  expect(render(read(observation(), now + 120001))).toContain("Stale snapshot");
  expect(render(read(observation()))).toContain(
    'dateTime="2026-10-31T12:00:00.000Z"',
  );
});

it("does not display the prior observation while a replacement read is loading", () => {
  const state = fundingMetricState({ data: observation(), loading: true }, now);
  expect(state.status).toBe("loading");
  expect(render(state)).not.toContain("1,201");
});

it("binds client matching to the exact requested ID and refuses invalid scope", () => {
  const clientId = "10000000-0000-4000-8000-000000000001";
  expect(hubFundingRequest(clientId)).toEqual({
    query: {
      mode: "matched",
      clientId,
      lifecycle: "active",
      page: 1,
      pageSize: 1,
    },
  });
  expect(hubFundingRequest("")).toEqual({
    query: { mode: "all", lifecycle: "active", page: 1, pageSize: 1 },
  });
  expect(hubFundingRequest("invalid")).toBeNull();
});

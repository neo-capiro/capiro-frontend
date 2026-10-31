import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TrackerMetricCards } from "../src/features/portfolio/bill-tracker/TrackerMetricCards";
import type {
  MaterialChanges,
  WatchCoverage,
} from "../src/features/portfolio/bill-tracker/tracker-metrics-contracts";
import {
  metricClient,
  materialFixture,
  coverageFixture,
  coveredFixture,
} from "./tracker-metrics-fixtures";
const state = vi.hoisted(() => ({
  material: undefined as MaterialChanges | undefined,
  coverage: undefined as WatchCoverage | undefined,
  materialPending: false,
  coveragePending: false,
}));
vi.mock("../src/features/portfolio/bill-tracker/useTrackerMetrics", () => ({
  useTrackerMetrics: () => state,
}));
const render = () =>
  renderToStaticMarkup(
    createElement(TrackerMetricCards, {
      clientId: metricClient,
      backend: "intelligence",
      version: 1,
      boardScope: "synthetic",
      boardReady: true,
    }),
  );
beforeEach(() =>
  Object.assign(state, {
    material: undefined,
    coverage: undefined,
    materialPending: false,
    coveragePending: false,
  }),
);
describe("existing Bill card metric presentation", () => {
  it("shows real zero, exact timing and retained-change semantics independently", () => {
    state.material = materialFixture();
    const html = render();
    expect(html).toContain("<strong>0</strong>");
    expect(html).toContain("Distinct currently saved Tracker bills");
    expect(html).toContain("21 days");
    expect(html).toContain(state.material.window.start);
    expect(html).toContain(state.material.observedAt);
    expect(html).toContain("do not establish ingestion freshness");
    expect(html).toContain("Unavailable");
    expect(html).not.toContain("0%");
  });
  it("keeps empty configuration distinct from zero percent", () => {
    state.coverage = coverageFixture();
    const html = render();
    expect(html).toContain("Not configured");
    expect(html).not.toContain("0%");
    expect(html).toContain("0 of 0 monitoring concepts");
  });
  it("keeps Core's configured unsupported criteria visible without a borrowed percentage", () => {
    const value = coverageFixture("core");
    Object.assign(value.configuration, {
      configured: true,
      complete: false,
      tagCount: 2,
      reason: "CORE_WATCHLIST_MODEL_UNSUPPORTED",
    });
    value.overall.status = "UNSUPPORTED";
    state.coverage = value;
    const html = render();
    expect(html).toContain("Unsupported");
    expect(html).toContain("cannot measure saved Core tags");
    expect(html).not.toContain("0%");
  });
  it("discloses partial topic coverage and excludes unmapped criteria from a complete percentage", () => {
    const value = coveredFixture();
    Object.assign(value.configuration, {
      flatTermCount: 2,
      complete: false,
      reason: "UNMAPPED_WATCHLIST_CONFIGURATION",
    });
    value.overall.status = "PARTIAL";
    value.overall.percentage = null;
    state.coverage = value;
    const html = render();
    expect(html).toContain("Partial");
    expect(html).toContain("1 of 1 monitoring concepts");
    expect(html).toContain("complete percentage is unavailable");
    expect(html).not.toContain("100%");
  });
  it("shows the returned percentage with its source-model limitation", () => {
    state.coverage = coveredFixture();
    const html = render();
    expect(html).toContain("100%");
    expect(html).toContain("not a percentage of tracked bills");
    expect(html).toContain("not an ingestion guarantee");
  });
  it.each(["STALE", "UNAVAILABLE"] as const)(
    "retains %s source state instead of implying complete healthy coverage",
    (status) => {
      const value = coveredFixture();
      value.overall = {
        coveredConcepts: 0,
        totalConcepts: 1,
        percentage: 0,
        status,
      };
      value.concepts[0]!.status = status;
      state.coverage = value;
      expect(render()).toContain(status === "STALE" ? "Stale" : "Unavailable");
    },
  );
  it("withholds old numeric values while both reads are loading", () => {
    state.materialPending = state.coveragePending = true;
    const html = render();
    expect(html).toContain("Loading");
    expect(html).not.toContain("0%");
    expect(html).not.toContain("<strong>0</strong>");
  });
});

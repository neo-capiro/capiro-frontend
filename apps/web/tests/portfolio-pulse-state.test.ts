import { afterEach, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PortfolioPulse } from "../src/features/portfolio/index/PortfolioPulse";
import { portfolioMetricsFixture } from "./portfolio-metrics-fixture";
import type { PortfolioMetrics } from "../src/features/portfolio/index/metrics";

const observed = vi.hoisted(() => ({
  data: undefined as PortfolioMetrics | undefined,
}));
vi.mock("../src/features/portfolio/index/usePortfolioMetrics", () => ({
  usePortfolioMetrics: () => ({
    data: observed.data,
    pending: false,
    stale: false,
    refresh: vi.fn(),
  }),
}));
afterEach(() => {
  observed.data = undefined;
});

it("marks a missing tracker source partial while keeping valid nonbill metrics visible", () => {
  observed.data = portfolioMetricsFixture();
  const html = renderToStaticMarkup(
    createElement(PortfolioPulse, { fiscalYear: 2027 }),
  );
  expect(html).toContain("Active clients: 60");
  expect(html).toContain("CRM activity · 30d: 612");
  expect(html).toContain(
    "Partial snapshot: Bill Tracker source not configured",
  );
  expect(html).toContain("Unavailable");
  expect(html).not.toContain("Complete recorded populations");
  expect(html).not.toContain("50%");
});

it("labels a configured complete response as complete", () => {
  observed.data = portfolioMetricsFixture();
  const html = renderToStaticMarkup(
    createElement(PortfolioPulse, { fiscalYear: 2027, trackerBackend: "core" }),
  );
  expect(html).toContain("Complete recorded populations");
  expect(html).toContain("50%");
  expect(html).not.toContain("source not configured");
});

it("retains the unavailable-source label for a configured partial response", () => {
  observed.data = {
    ...portfolioMetricsFixture(),
    billWatch: { status: "unavailable" },
  };
  const html = renderToStaticMarkup(
    createElement(PortfolioPulse, { fiscalYear: 2027, trackerBackend: "core" }),
  );
  expect(html).toContain("Some sources unavailable");
  expect(html).not.toContain("Complete recorded populations");
  expect(html).not.toContain("50%");
});

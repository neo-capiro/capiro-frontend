import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import {
  projectUsageOverview,
  usageSnapshotNotice,
} from "../src/features/meri/usage-overview/projection";
import { UsageLimitsScreen } from "../src/features/meri/screens/settings/UsageLimitsScreen";
import { usageOverviewFixture } from "./meri-usage-overview-fixtures";

it("keeps day, Monday UTC week and month separate, with real zero and missing accounting", () => {
  const view = projectUsageOverview(usageOverviewFixture());
  expect(view.metrics.slice(0, 3).map((metric) => metric.label)).toEqual([
    "Today · UTC",
    "This week · Monday UTC",
    "This month · UTC",
  ]);
  expect(view.metrics.slice(0, 3).map((metric) => metric.value)).toEqual([
    "$0.00",
    "$0.25",
    "$0.75",
  ]);
  expect(view.metrics[0]!.caption).toContain("2 without usable accounting");
  expect(view.limitStates.notices[1]!.detail).toContain(
    "missing cost is not zero",
  );
});

it("retains failed and cancelled denominators without calling attempts completed jobs", () => {
  const view = projectUsageOverview(usageOverviewFixture());
  expect(view.runUsage.rows[2]!.outcome).toBe(
    "2 completed · 1 failed · 1 cancelled",
  );
  expect(view.runUsage.rows[2]!.attempts).toBe(
    "4 total · 2 completed with recorded usage",
  );
  expect(view.heading.description).toContain("Attempts are not complete jobs");
  expect(view.limitStates.notices[1]!.detail).toContain(
    "Complete-job cost and provider bills are unavailable",
  );
});

it("does not conflate cohort creation totals with monthly admission ledger", () => {
  const view = projectUsageOverview(usageOverviewFixture());
  expect(view.metrics[2]!.value).toBe("$0.75");
  expect(view.limitStates.notices[0]!.detail).toContain(
    "$1.50 known recorded this month",
  );
  expect(view.limitStates.description).toContain(
    "including earlier-created attempts",
  );
});

it("distinguishes known cap reached from unavailable policy without inventing near-limit thresholds", () => {
  const value = usageOverviewFixture();
  value.monthlyAdmission = {
    ...value.monthlyAdmission,
    knownChargeMicroUsd: 100_000_000,
    reached: true,
    remainingKnownMicroUsd: 0,
  };
  expect(projectUsageOverview(value).limitStates.notices[0]!.title).toBe(
    "Workspace monthly cap reached",
  );
  value.policy = {
    status: "unavailable",
    revision: null,
    monthlyCapMicroUsd: null,
    maxTurns: null,
    maxBudgetMicroUsd: null,
  };
  value.monthlyAdmission = {
    ...value.monthlyAdmission,
    reached: null,
    remainingKnownMicroUsd: null,
  };
  const view = projectUsageOverview(value);
  expect(view.configuration.limits).toEqual([
    { label: "Configured policy", value: "Unavailable" },
  ]);
  expect(view.limitStates.notices[0]!.title).toBe(
    "Monthly cap status unavailable",
  );
  expect(view.limitStates.notices[0]!.detail).toContain(
    "remaining amount unavailable",
  );
  expect(JSON.stringify(view)).not.toContain("Near limit");
});

it("counts durable queued/starting states without inventing worker capacity", () => {
  const view = projectUsageOverview(usageOverviewFixture());
  expect(
    view.metrics.find((metric) => metric.label === "Recorded active work")
      ?.value,
  ).toBe("4");
  expect(
    view.metrics.find((metric) => metric.label === "Available capacity")?.value,
  ).toBe("Unavailable");
  expect(view.metrics[3]!.caption).toContain(
    "Durable states do not prove physical activity",
  );
});

it("uses only a separately permitted Runs destination", () => {
  expect(
    projectUsageOverview(usageOverviewFixture()).limitStates.queue.href,
  ).toBeUndefined();
  expect(
    projectUsageOverview(usageOverviewFixture(), "/meri/runs?scope=general")
      .limitStates.queue.href,
  ).toBe("/meri/runs?scope=general");
});

it("marks stale and future-clock snapshots without changing received usage", () => {
  const value = usageOverviewFixture(),
    at = Date.parse(value.observedAt);
  expect(usageSnapshotNotice(value, at + 60_000).title).toBe(
    "Recorded workspace usage",
  );
  expect(usageSnapshotNotice(value, at + 60_001).title).toBe(
    "Usage snapshot may be stale",
  );
  expect(usageSnapshotNotice(value, at - 60_001).title).toBe(
    "Usage observation clock differs",
  );
  expect(usageSnapshotNotice(value, at + 60_001).detail).toContain(
    value.observedAt,
  );
  expect(value.periods[0]!.knownChargeMicroUsd).toBe(0);
});

it("renders read-only effective facts and disabled queue when capability is absent", () => {
  const value = usageOverviewFixture();
  const html = renderToStaticMarkup(
    createElement(UsageLimitsScreen, {
      chrome: {
        nav: [],
        notice: usageSnapshotNotice(value, Date.parse(value.observedAt)),
        unavailable: "Runs access is unavailable",
        localDrafts: false,
        headerOverlays: false,
      },
      view: projectUsageOverview(value),
    }),
  );
  expect(html).toContain("Period</th>");
  expect(html).toContain("12");
  expect(html).toContain("Maximum SDK turns per attempt");
  expect(html).toContain("These limits are read only");
  expect(html).toContain("disabled");
  expect(html).not.toContain("<input");
  expect(html).not.toContain("Save limits");
  expect(html).not.toContain('href="/meri/runs');
});

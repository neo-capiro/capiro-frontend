import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import {
  USAGE_OVERVIEW_SCHEMA_V2,
  receiveUsageOverviewRequestV2,
  receiveUsageOverviewResponseV2,
} from "@capiro/meri-contracts/conversation-usage";
import {
  projectUsageOverview,
  usageSnapshotNotice,
} from "../src/features/meri/usage-overview/projection";
import { UsageLimitsScreen } from "../src/features/meri/screens/settings/UsageLimitsScreen";
import {
  usageOverviewFixture,
  usageOverviewFixtureMixedCompletedAccounting,
  usageOverviewFixtureWithoutSuccessfulJobs,
} from "./meri-usage-overview-fixtures";

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
    "provider billing remains unavailable",
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

it("shows whole-job cost for successful jobs only, with partial, failed and unclosed apart", () => {
  const view = projectUsageOverview(usageOverviewFixture()).wholeJobs!;
  expect(view.title).toBe("Whole jobs · This month · UTC");
  expect(view.description).toContain(
    "root revision was created in the admitted month window from 2026-10-01T00:00:00.000Z",
  );
  expect(view.facts.map((fact) => [fact.label, fact.value])).toEqual([
    ["Successful jobs", "3 jobs · 5 attempts · $0.45 known SDK estimate"],
    ["Partial jobs", "1 jobs · 2 attempts · $0.12 known SDK estimate"],
    ["Failed jobs", "1 jobs · 1 attempts · $0.00 known SDK estimate"],
    ["Cancelled jobs", "0 jobs · 0 attempts · $0.00 known SDK estimate"],
    ["Unclosed jobs", "1 jobs · 1 attempts · $0.03 known SDK estimate"],
    ["Jobs with usable accounting", "5 recorded · 1 without usable accounting"],
    ["Continuations outside this month", "1 excluded and counted"],
  ]);
  expect(view.cost).toMatchObject({
    label: "Cost per successful job",
    value: "$0.15",
  });
  expect(view.cost.caption).toContain("never a provider bill");
  expect(view.footnote).toBe(
    "A job stays unclosed while 1 child receipts are unsettled, 1 successor continuations are unresolved, or 1 revisions still need their completion proof. A revision created after the window is not read, so a job whose continuation falls outside the window is reported from the revisions inside it only; a continuation whose root revision is outside the window is excluded and counted.",
  );
});

it("keeps a missing whole-job denominator unavailable rather than zero", () => {
  const view = projectUsageOverview(
    usageOverviewFixtureWithoutSuccessfulJobs(),
  ).wholeJobs!;
  expect(view.cost.value).toBe("Unavailable");
  expect(view.facts[0]).toEqual({
    label: "Successful jobs",
    value: "0 jobs · 0 attempts · $0.00 known SDK estimate",
  });
  expect(view.facts[5]!.value).toBe("0 recorded · 0 without usable accounting");
});

it("translates canonical coverage instead of printing protocol literals at users", () => {
  const serialized = JSON.stringify(
    projectUsageOverview(usageOverviewFixture()),
  );
  for (const literal of [
    "canonical ROOT Work/Delegate",
    "root revision created within the admitted month window",
    "whole-job-lineage-at-root-revision-window",
    "sdk_usage.parentRunId",
    "meri_conversations.completion_checkpoints",
    "PUBLISHED native-session completion capture",
    "distinct-conversation-id-by-run-created-at",
    "recorded-runs-only",
  ]) {
    expect(serialized).not.toContain(literal);
  }
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

const chrome = {
  nav: [],
  notice: {
    title: "Usage",
    detail: "Recorded workspace usage.",
    tone: "neutral" as const,
  },
  unavailable: "Runs access is unavailable",
  localDrafts: false,
  headerOverlays: false,
};

const render = (value: ReturnType<typeof usageOverviewFixture>) =>
  renderToStaticMarkup(
    createElement(UsageLimitsScreen, {
      chrome: {
        ...chrome,
        notice: usageSnapshotNotice(value, Date.parse(value.observedAt)),
      },
      view: projectUsageOverview(value),
    }),
  );

it("renders read-only effective facts and disabled queue when capability is absent", () => {
  const html = render(usageOverviewFixture());
  expect(html).toContain("Period</th>");
  expect(html).toContain("12");
  expect(html).toContain("Maximum SDK turns per attempt");
  expect(html).toContain("These limits are read only");
  expect(html).toContain("disabled");
  expect(html).not.toContain("<input");
  expect(html).not.toContain("Save limits");
  expect(html).not.toContain('href="/meri/runs');
});

it("renders the whole-job card, and its honest gap when no job closed successfully", () => {
  const html = render(usageOverviewFixture());
  expect(html).toContain("Whole jobs · This month · UTC");
  expect(html).toContain("Cost per successful job");
  expect(html).toContain("$0.15");
  expect(html).toContain("3 jobs · 5 attempts · $0.45 known SDK estimate");
  expect(html).toContain("1 excluded and counted");
  expect(html).toContain("never a provider bill");
  expect(html).not.toContain("whole-job-lineage-at-root-revision-window");

  const emptyHtml = render(usageOverviewFixtureWithoutSuccessfulJobs());
  expect(emptyHtml).toContain(">Unavailable<");
  expect(emptyHtml).not.toContain("$0.15");
  expect(emptyHtml).not.toContain("3 jobs · 5 attempts");
});

it("shows the received recorded completed count instead of subtracting the unrecorded gap again", () => {
  const body = usageOverviewFixtureMixedCompletedAccounting();
  const received = receiveUsageOverviewResponseV2(
    200,
    new TextEncoder().encode(JSON.stringify(body)),
    receiveUsageOverviewRequestV2(
      new TextEncoder().encode(
        JSON.stringify({ schemaVersion: USAGE_OVERVIEW_SCHEMA_V2 }),
      ),
    ),
  );
  if ("error" in received)
    throw new Error("the /2 receiver refused the mixed accounting body");
  const view = projectUsageOverview(received);
  view.runUsage.rows.forEach((row, index) => {
    const period = received.periods[index]!;
    // The receiver enforces completedAttempts.attempts === recorded.completed and
    // attemptsWithoutRecordedUsage === states.completed - recorded.completed, so the recorded
    // completed count is already the accounted-for attempts: removing that gap again undercounts
    // and can drive the row negative.
    expect(period.completedAttempts.attempts).toBe(period.recorded.completed);
    expect(row.attempts).toBe(
      `${period.attempts} total · ${period.recorded.completed} completed with recorded usage`,
    );
    expect(row.attempts).not.toMatch(/-\d/);
  });
  // The gap this row must not remove twice is real and larger than the recorded count on two of the
  // three periods, so the retired expression (attempts - attemptsWithoutRecordedUsage) would have shown
  // -1 for the day and the month.
  for (const index of [0, 2])
    expect(
      received.periods[index]!.completedAttempts.attempts -
        received.periods[index]!.completedAttempts.attemptsWithoutRecordedUsage,
    ).toBeLessThan(0);
  // Day: nothing recorded at all. Week: recorded and completed agree. Month: mixed.
  expect(view.runUsage.rows[0]!.outcome).toBe(
    "1 completed · 1 failed · 1 cancelled",
  );
  expect(view.runUsage.rows[0]!.attempts).toBe(
    "3 total · 0 completed with recorded usage",
  );
  expect(view.runUsage.rows[1]!.attempts).toBe(
    "4 total · 2 completed with recorded usage",
  );
  expect(view.runUsage.rows[2]!.outcome).toBe(
    "3 completed · 1 failed · 1 cancelled",
  );
  expect(view.runUsage.rows[2]!.attempts).toBe(
    "5 total · 1 completed with recorded usage",
  );
  expect(view.runUsage.rows[2]!.usage).toContain(
    "2 unavailable · 2 not recorded",
  );
  const html = render(body);
  expect(html).toContain("5 total · 1 completed with recorded usage");
  expect(html).toContain("3 total · 0 completed with recorded usage");
  expect(html).not.toContain("-1 completed with recorded usage");
});

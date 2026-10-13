import { test, expect } from "@playwright/test";
import { onlyLocalRequests, operationFixtures } from "./fixtures";
import { moduleRouteFixtures } from "./module-route-fixtures";
import { emptyCommentCalendar } from "./next-modules-fixtures";
import {
  effectivePage,
  effectiveRecord,
} from "../../tests/effective-date-fixtures";
test("Modules master Government feed preserves date-only provenance and partial coverage", async ({
  page,
}, info) => {
  await onlyLocalRequests(page);
  await page.clock.setFixedTime(new Date("2026-10-08T16:00:00Z"));
  let reads = 0;
  await operationFixtures(page, {
    ...moduleRouteFixtures,
    "legiwatch.calendar": { rows: [], total: 0, page: 1, pageSize: 200 },
    "calendar.commentDeadlines": [],
    "calendar.commentDeadlineCalendar": emptyCommentCalendar,
    "calendar.effectiveDates": (input) => {
      const q = (
        input as { query: { dateFrom: string; dateTo: string; page: number } }
      ).query;
      reads++;
      return effectivePage(q.dateFrom, q.dateTo, q.page);
    },
  });
  await page.goto("/modules/calendar");
  await page.getByRole("button", { name: "Agenda", exact: true }).click();
  await expect(page.getByRole("table")).toContainText(effectiveRecord.title);
  expect(reads).toBe(1);
  await page.getByText("Effective date provenance", { exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Publisher API evidence" }),
  ).toHaveAttribute("href", effectiveRecord.provenance.sourceUrl);
  await expect(
    page.getByText(/Government effective dates: local publisher metadata only/),
  ).toContainText("coverage is incomplete");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("table")).toContainText("OCT 9");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("effective-date-mobile.png"),
    fullPage: true,
  });
});
test("an empty Government page remains explicitly incomplete and forecasts unavailable", async ({
  page,
}) => {
  await onlyLocalRequests(page);
  await page.clock.setFixedTime(new Date("2026-10-08T16:00:00Z"));
  await operationFixtures(page, {
    ...moduleRouteFixtures,
    "calendar.effectiveDates": (input) => {
      const q = (
        input as { query: { dateFrom: string; dateTo: string; page: number } }
      ).query;
      const p = effectivePage(q.dateFrom, q.dateTo, q.page);
      return {
        ...p,
        data: [],
        pagination: {
          totalCandidates: 1,
          returned: 0,
          excludedOnPage: 1,
          hasMoreCandidates: false,
        },
      };
    },
  });
  await page.goto("/modules/calendar");
  await page.getByRole("button", { name: "Agenda", exact: true }).click();
  await expect(
    page.getByText(/An empty result does not mean no rule takes effect/),
  ).toBeVisible();
  await expect(page.getByText(/forecasts remain unavailable/)).toBeVisible();
});

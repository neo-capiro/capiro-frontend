import { test, expect } from "@playwright/test";
import { onlyLocalRequests, operationFixtures } from "/workspace/capiro-contracts/apps/web/test/browser/fixtures";
import { moduleRouteFixtures } from "/workspace/capiro-contracts/apps/web/test/browser/module-route-fixtures";
import {
  effectivePage,
  effectiveRecord,
} from "/workspace/capiro-contracts/apps/web/tests/effective-date-fixtures";
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
  await page.screenshot({ path: info.outputPath("modules-effective-date-desktop.png"), fullPage: true });
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

import { test, expect } from "@playwright/test";
import { onlyLocalRequests, operationFixtures } from "./fixtures";
import { moduleRouteFixtures } from "./module-route-fixtures";
import {
  commentPage,
  commentRecord,
} from "../../tests/comment-calendar-fixtures";
import { commentDeadlineQuery } from "../../src/shared/federal-register/comment-deadlines";

for (const width of [360, 1440]) {
  test(`Modules comment calendar advances empty candidate pages and retains civil dates at ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 1000 });
    await onlyLocalRequests(page);
    await page.clock.setFixedTime(new Date("2026-03-08T16:00:00Z"));
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const requests: unknown[] = [];
    const record = commentRecord();
    await operationFixtures(page, {
      ...moduleRouteFixtures,
      "legiwatch.calendar": { rows: [], total: 0, page: 1, pageSize: 200 },
      "calendar.commentDeadlineCalendar": (input) => {
        const query = commentDeadlineQuery.parse(
          (input as { query: unknown }).query,
        );
        requests.push(query);
        const first = query.page === 1;
        return {
          ...commentPage(
            first ? [] : [record],
            query.dateFrom,
            query.dateTo,
            query.page,
          ),
          pagination: {
            totalCandidates: 101,
            returned: first ? 0 : 1,
            excludedOnPage: first ? 100 : 0,
            hasMoreCandidates: first,
          },
        };
      },
    });
    await page.goto("/modules/calendar");
    await page.getByRole("button", { name: "Agenda", exact: true }).click();
    const row = page.getByRole("row").filter({ hasText: record.title });
    await expect(row).toBeVisible();
    await expect(row).toContainText("MAR 8");
    await expect(row).toContainText("Comments close · date only");
    await expect(row).toContainText("raw publisher value unverified");
    await expect(row.getByRole("link", { name: record.title })).toHaveAttribute(
      "href",
      record.htmlUrl,
    );
    await expect(
      page.getByText(/Regulatory comment deadlines:.*100 excluded/),
    ).toBeVisible();
    await expect(
      page.getByText(
        /Regulatory comment deadlines:.*read time, not publisher freshness/,
      ),
    ).toBeVisible();
    expect(requests).toEqual(
      [1, 2].map((page) => ({
        dateFrom: "2026-02-23",
        dateTo: "2026-04-05",
        page,
        limit: 100,
      })),
    );
    const filter = page.getByRole("button", {
      name: "Deadlines 1",
      exact: true,
    });
    await filter.focus();
    await page.keyboard.press("Space");
    await expect(row).toHaveCount(0);
    await page.keyboard.press("Space");
    await expect(row).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(errors).toEqual([]);
    await page.screenshot({
      path: info.outputPath(`comment-range-${width}.png`),
      fullPage: true,
    });
  });
}

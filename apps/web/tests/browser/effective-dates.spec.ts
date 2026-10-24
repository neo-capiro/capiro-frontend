import { test, expect } from "@playwright/test";
import { installFixtures, json, clientId } from "./fixtures";
import { effectivePage, effectiveRecord } from "../effective-date-fixtures";
test("master Agenda reads publisher effective dates across excluded pages without shifting civil dates", async ({
  page,
}, info) => {
  const unexpected = await installFixtures(page),
    pages: number[] = [];
  await page.route(
    "**/core/federal-register/effective-date-calendar?*",
    (route) => {
      const q = new URL(route.request().url()).searchParams,
        number = Number(q.get("page"));
      pages.push(number);
      const result = effectivePage(
        q.get("dateFrom")!,
        q.get("dateTo")!,
        number,
      );
      result.pagination.totalCandidates = 2;
      return json(
        route,
        number === 1
          ? {
              ...result,
              data: [],
              pagination: {
                totalCandidates: 2,
                returned: 0,
                excludedOnPage: 1,
                hasMoreCandidates: true,
              },
            }
          : result,
      );
    },
  );
  await page.goto(
    "/calendar?view=agenda&date=2026-10-08&zone=Pacific%2FHonolulu",
  );
  await expect(
    page.getByRole("heading", { name: effectiveRecord.title, exact: true }),
  ).toBeVisible();
  await expect(page.locator('time[datetime="2026-10-09"]')).toBeVisible();
  await page.getByText("Effective date provenance", { exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Official edition PDF reference" }),
  ).toHaveAttribute("href", effectiveRecord.provenance.officialPdfUrl);
  await expect(
    page.getByText(/Previous observation: 2026-10-07/),
  ).toBeVisible();
  await expect(
    page.getByText(/Government effective dates: local publisher metadata only/),
  ).toContainText("coverage is incomplete");
  await page.screenshot({
    path: info.outputPath("effective-date-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByText("Effective date provenance", { exact: true }).focus();
  await expect(
    page.getByText("Effective date provenance", { exact: true }),
  ).toBeFocused();
  await page.screenshot({
    path: info.outputPath("effective-date-mobile.png"),
    fullPage: true,
  });
  expect(pages).toEqual([1, 2]);
  expect(unexpected).toEqual([]);
});
test("client Agenda and master Month never fetch the public effective-date feed", async ({
  page,
}) => {
  const unexpected = await installFixtures(page);
  const calls: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("effective-date-calendar")) calls.push(r.url());
  });
  await page.goto(
    `/portfolio/${clientId}/calendar?view=agenda&date=2026-10-08`,
  );
  await expect(
    page.getByRole("heading", { name: "Test Aerospace meetings", exact: true }),
  ).toBeVisible();
  await page.goto("/calendar?view=month&date=2026-10-08");
  await expect(
    page.getByRole("heading", { name: "Master Calendar", exact: true }),
  ).toBeVisible();
  expect(calls).toEqual([]);
  expect(unexpected).toEqual([]);
});
test("stale effective evidence stays unavailable without publication-date fallback", async ({
  page,
}) => {
  await installFixtures(page);
  await page.route(
    "**/core/federal-register/effective-date-calendar?*",
    (route) => {
      const p = effectivePage();
      p.coverage.asOf = "2026-10-12T12:00:00.000Z";
      return json(route, p);
    },
  );
  await page.goto("/calendar?view=agenda&date=2026-10-08");
  await expect(page.getByText(/stale\/out-of-range evidence/)).toBeVisible();
  await expect(
    page.getByRole("heading", { name: effectiveRecord.title }),
  ).toHaveCount(0);
});

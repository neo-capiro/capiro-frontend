import { expect, test, type Page } from "@playwright/test";
import { commentPage, commentRecord } from "../comment-calendar-fixtures";
import { installFixtures, json } from "./fixtures";

const routePattern = "**/core/federal-register/comment-deadline-calendar?**";
const path =
  "/calendar-boundary.html?view=agenda&date=2026-03-08&zone=Pacific/Honolulu";
const nativePage = (url: URL, data = [commentRecord()]) =>
  commentPage(
    data,
    url.searchParams.get("dateFrom")!,
    url.searchParams.get("dateTo")!,
    Number(url.searchParams.get("page")),
  );

async function refresh(page: Page) {
  await page.evaluate(async () => {
    if (!window.__calendarBoundary)
      throw new Error("Missing current-read controls");
    await window.__calendarBoundary.refreshFeeds();
  });
}

for (const width of [360, 1440]) {
  test(`regulatory range follows an empty candidate page and keeps date-only precision at${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    const unexpected = await installFixtures(page);
    const requests: URL[] = [];
    await page.route(routePattern, (route) => {
      expect(route.request().method()).toBe("GET");
      const url = new URL(route.request().url());
      requests.push(url);
      const first = url.searchParams.get("page") === "1";
      return json(route, {
        ...nativePage(url, first ? [] : [commentRecord()]),
        pagination: {
          totalCandidates: 101,
          returned: first ? 0 : 1,
          excludedOnPage: first ? 100 : 0,
          hasMoreCandidates: first,
        },
      });
    });
    await page.goto(path);
    const row = page.getByRole("article").filter({
      has: page.getByRole("heading", { name: commentRecord().title }),
    });
    await expect(row).toBeVisible();
    await expect(row).toContainText("Date only · time not supplied");
    await expect(row).toContainText(
      "comments_close_on · cached date only · raw publisher value unverified",
    );
    await expect(
      page.getByRole("heading", { name: "2026-03-08", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(/Regulatory comment deadlines:.*100 excluded/),
    ).toBeVisible();
    await expect(
      page.getByText(
        /Regulatory comment deadlines:.*read time, not publisher freshness/,
      ),
    ).toBeVisible();
    expect(requests.map((url) => Object.fromEntries(url.searchParams))).toEqual(
      [1, 2].map((page) => ({
        dateFrom: "2026-03-01",
        dateTo: "2026-03-31",
        page: String(page),
        limit: "100",
      })),
    );
    expect(unexpected).toEqual([]);
  });
}

test("failed current regulatory read hides retained dates until successful explicit retry", async ({
  page,
}) => {
  const unexpected = await installFixtures(page);
  let denied = false;
  await page.route(routePattern, (route) =>
    denied
      ? json(route, { message: "Synthetic regulatory access changed" }, 403)
      : json(route, nativePage(new URL(route.request().url()))),
  );
  await page.goto(path);
  await expect(
    page.getByRole("heading", { name: commentRecord().title }),
  ).toBeVisible();
  denied = true;
  await refresh(page);
  await expect(
    page.getByRole("button", { name: "Retry", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: commentRecord().title }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(() => window.__calendarBoundary?.snapshots()),
  ).toContainEqual({ status: "error", retained: true });
  denied = false;
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: commentRecord().title }),
  ).toBeVisible();
  expect(unexpected).toEqual([]);
});

test("a held old regulatory range cannot replace the newly selected range", async ({
  page,
}) => {
  const unexpected = await installFixtures(page);
  const replacement = commentRecord("2026-45678", "2026-04-08");
  let release: (() => Promise<void>) | undefined;
  await page.route(routePattern, async (route) => {
    const url = new URL(route.request().url());
    if (url.searchParams.get("dateFrom") === "2026-03-01") {
      await new Promise<void>((resolve) => {
        release = async () => {
          try {
            await json(route, nativePage(url));
          } catch {
            /* The superseded browser request may already be canceled. */
          } finally {
            resolve();
          }
        };
      });
    } else await json(route, nativePage(url, [replacement]));
  });
  await page.goto(path);
  await expect.poll(() => Boolean(release)).toBe(true);
  await page.getByLabel("Calendar date", { exact: true }).fill("2026-04-08");
  await expect(
    page.getByRole("heading", { name: replacement.title }),
  ).toBeVisible();
  await release!();
  await expect(
    page.getByRole("heading", { name: replacement.title }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: commentRecord().title }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "2026-04-08", exact: true }),
  ).toBeVisible();
  expect(unexpected).toEqual([]);
});

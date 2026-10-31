import { expect } from "@playwright/test";
import { test } from "./runtime-observed-test";
import { onlyLocalRequests, operationFixtures } from "./fixtures";
import {
  browserSession,
  federalHearing,
  floridaHearing,
  hearingFixtures,
} from "./hearing-fixtures";
import { installFixedDate } from "./fixed-date";

test.beforeEach(async ({ page }) => {
  await onlyLocalRequests(page);
  await installFixedDate(page, Date.parse("2026-10-07T15:00:00Z"));
});
test.afterEach(async ({ runtimeObservation }) => {
  expect(runtimeObservation.consoleErrors).toEqual([]);
});

test("public hearings remain visible when the independent meetings read fails", async ({
  page,
}) => {
  await operationFixtures(page, {
    ...hearingFixtures,
    "engagement.meetings": { invalidSyntheticResponse: true },
  });
  await page.goto("/modules/calendar?date=2026-10-07");
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByLabel("month calendar")).toContainText(
    floridaHearing.title,
  );
});

test("an empty schedule still shows incomplete source coverage", async ({
  page,
}) => {
  await operationFixtures(page, {
    ...hearingFixtures,
    "legiwatch.calendar": { rows: [], total: 0, page: 1, pageSize: 200 },
  });
  await page.goto("/modules/intelligence?view=legiwatch");
  await expect(page.getByText("No hearings match these filters")).toBeVisible();
  await expect(
    page.getByText(
      "Some Florida calendar sources are incomplete or could not be checked.",
    ),
  ).toBeVisible();
});

test("master month and week include later-page federal and Florida hearings and open detail", async ({
  page,
}) => {
  const pages: number[] = [];
  await operationFixtures(page, {
    ...hearingFixtures,
    "legiwatch.calendar": (input) => {
      const { query } = input as { query: { page: number } };
      pages.push(query.page);
      return {
        rows: [query.page === 1 ? federalHearing : floridaHearing],
        total: 2,
        page: query.page,
        pageSize: 1,
      };
    },
  });
  await page.goto("/modules/calendar?date=2026-10-07");
  await expect(page.getByLabel("month calendar")).toContainText(
    floridaHearing.title,
  );
  await expect(page.getByLabel("month calendar")).toContainText(
    federalHearing.title,
  );
  expect(pages).toContain(2);
  await page.getByRole("button", { name: "Week", exact: true }).click();
  await expect(page.getByLabel("week calendar")).toContainText(
    federalHearing.title,
  );
  await expect(page.getByLabel("week calendar")).toContainText(
    floridaHearing.title,
  );
  await page.screenshot({
    path: "test-results/hearing-master-week.png",
    fullPage: true,
  });
  await page
    .getByLabel("week calendar")
    .getByText(federalHearing.title, { exact: false })
    .first()
    .click();
  await expect(page).toHaveURL(/hearingId=synthetic-federal-hearing/);
  await expect(
    page.getByRole("heading", { name: federalHearing.title }),
  ).toBeVisible();
});

test("Florida filters use state committee IDs and clear when jurisdiction changes", async ({
  page,
}) => {
  const queries: Array<Record<string, unknown>> = [];
  await operationFixtures(page, {
    ...hearingFixtures,
    "legiwatch.calendar": (input) => {
      queries.push((input as { query: Record<string, unknown> }).query);
      return hearingFixtures["legiwatch.calendar"];
    },
  });
  await page.goto("/modules/intelligence?view=legiwatch");
  await page.getByLabel("Jurisdiction", { exact: true }).selectOption("FL");
  await page
    .getByLabel("Committee", { exact: true })
    .selectOption("FL:synthetic-fl-committee");
  await expect
    .poll(() => queries.at(-1)?.stateCommitteeId)
    .toBe("synthetic-fl-committee");
  expect(queries.at(-1)?.committee).toBeUndefined();
  await page.getByLabel("Jurisdiction", { exact: true }).selectOption("US");
  await expect.poll(() => queries.at(-1)?.jurisdiction).toBe("US");
  expect(queries.at(-1)?.stateCommitteeId).toBeUndefined();
  await expect(page.getByLabel("Committee", { exact: true })).toHaveValue("");
});

test("canonical attachment opens live detail with the official playback link", async ({
  page,
}) => {
  await operationFixtures(page, hearingFixtures);
  await page.goto(
    `/modules/intelligence?view=legiwatch&hearingId=${federalHearing.id}`,
  );
  await page
    .getByRole("button", { name: "Attend & capture", exact: true })
    .click();
  await page.getByRole("button", { name: "Open browser hearing room" }).click();
  await expect(page).toHaveURL(/hearingTab=live/);
  await expect(
    page.getByRole("heading", { name: "Live transcript" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Open official live / replay tab" }),
  ).toHaveAttribute("href", federalHearing.officialPlaybackUrl!);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("browser history follows its cursor to older recordings", async ({
  page,
}) => {
  await operationFixtures(page, {
    ...hearingFixtures,
    "legiwatch.recordings": { rows: [], total: 0, page: 1, pageSize: 25 },
    "legiwatch.session.list": (input) => {
      const cursor = (input as { query: { cursor?: string } }).query.cursor;
      return {
        items: [
          {
            ...browserSession,
            title: cursor ? "Synthetic older room" : "Synthetic latest room",
          },
        ],
        total: 2,
        hasMore: !cursor,
        nextCursor: cursor ? null : "synthetic-next",
      };
    },
  });
  await page.goto("/modules/intelligence?view=legiwatch");
  await page.getByRole("button", { name: "Recordings", exact: true }).click();
  await page.getByRole("button", { name: "My browser sessions" }).click();
  await expect(page.getByText("Synthetic latest room")).toBeVisible();
  await page.getByRole("button", { name: "Older sessions" }).click();
  await expect(page.getByText("Synthetic older room")).toBeVisible();
  await page.getByRole("button", { name: "Newer sessions" }).click();
  await expect(page.getByText("Synthetic latest room")).toBeVisible();
});

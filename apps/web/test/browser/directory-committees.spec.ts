import { expect, test } from "@playwright/test";
import { onlyLocalRequests, operationFixtures, testIdentity } from "./fixtures";

const federal = {
  systemCode: "synthetic-federal",
  thomasId: "synthetic-federal",
  name: "Synthetic federal committee",
  chamber: "House",
  parentSystemCode: null,
  parentName: null,
  officialUrl: null,
  jurisdiction: "Synthetic subject jurisdiction",
  isSubcommittee: false,
  lastSyncedAt: "2026-10-31T00:00:00Z",
  upcomingEventCount: 0,
  recentEventCount: 0,
  sourceHealth: "healthy",
  lastSourceSuccessAt: "2026-10-31T00:00:00Z",
  sourceUrl: null,
  sourceHealthInheritedFrom: null,
  following: false,
};
const fixtures = {
  "me.read": testIdentity,
  "clients.list": [],
  "legiwatch.committees": {
    rows: [federal],
    total: 1,
    parentCount: 1,
    subcommitteeCount: 0,
    asOf: federal.lastSyncedAt,
  },
  "legiwatch.committee": {
    ...federal,
    members: [],
    subcommittees: [],
    upcomingEvents: [],
    recentEvents: [],
    liveEvent: null,
    updates: [],
    asOf: federal.lastSyncedAt,
  },
  "legiwatch.stateCommittees": [
    {
      id: "synthetic-florida",
      name: "Synthetic Florida committee",
      state: "FL",
      chamber: "Senate",
      legislativeSession: "2026",
      officialSourceKey: null,
      sourceUrl: null,
      lastSyncedAt: federal.lastSyncedAt,
    },
  ],
  "directory.committees": {
    committees: [],
    total: 0,
    page: 1,
    pageSize: 25,
  },
};

test("Directory separates committee rooms from staff and restores Federal/State selection", async ({
  page,
}) => {
  const failures: string[] = [];
  page.on("pageerror", (error) => failures.push(error.message));
  await onlyLocalRequests(page);
  await operationFixtures(page, fixtures);
  await page.goto("/modules/directory?view=committees");
  await expect(page.getByText(federal.name, { exact: true })).toBeVisible();
  await expect(
    page.getByRole("tab", { name: "Committees", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page
    .getByRole("button", { name: "Open committee", exact: true })
    .click();
  await expect(page).toHaveURL(/committeeId=synthetic-federal/);
  await expect(
    page.getByRole("heading", { name: federal.name, exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Committee directory", exact: true })
    .click();
  await expect(
    page.getByRole("tab", { name: "Federal", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.getByRole("tab", { name: "State", exact: true }).click();
  await expect(page).toHaveURL(/jurisdiction=FL/);
  await expect(
    page.getByText("State committee rooms currently cover Florida."),
  ).toBeVisible();
  await expect(
    page.getByText("Synthetic Florida committee", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("tab", { name: "State", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.getByRole("tab", { name: "Committee Staff", exact: true }).click();
  await expect(page).toHaveURL(/view=committee-staff/);
  await expect(page).not.toHaveURL(/jurisdiction=|committeeId=/);
  await expect(page.getByLabel("Search committee staff")).toBeVisible();
  await expect(
    page.getByRole("tab", { name: "State", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
  expect(failures).toEqual([]);
});

test("committee jurisdiction filter supports keyboard use on a narrow screen", async ({
  page,
}) => {
  await onlyLocalRequests(page);
  await operationFixtures(page, fixtures);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/modules/directory?view=committees");
  const federalTab = page.getByRole("tab", { name: "Federal", exact: true });
  await federalTab.focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("tab", { name: "State", exact: true }),
  ).toBeFocused();
  await expect(
    page.getByText("Synthetic Florida committee", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/directory-committees-mobile.png",
    fullPage: true,
  });
});

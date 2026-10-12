import { test, expect } from "@playwright/test";
import { onlyLocalRequests, operationFixtures, testIdentity } from "./fixtures";

const clientId = "30000000-0000-4000-8000-000000000001";
const meetings = [
  {
    id: "40000000-0000-4000-8000-000000000001",
    subject: "Test strategy review",
    startsAt: "2026-10-07T14:00:00Z",
    endsAt: "2026-10-07T15:00:00Z",
    status: "scheduled",
    location: "Test meeting room",
    description: null,
    client: { id: clientId, name: "Test Aerospace" },
    preps: [],
    notes: [],
    debriefs: [],
  },
];
test.beforeEach(async ({ page }) => {
  await onlyLocalRequests(page);
  await page.clock.setFixedTime(new Date("2026-10-08T16:00:00Z"));
});
test("month and week retain client scope and query end-exclusive Eastern ranges", async ({
  page,
}) => {
  const ranges: Record<string, string>[] = [];
  await operationFixtures(page, {
    "me.read": testIdentity,
    "clients.list": [
      {
        id: clientId,
        name: "Test Aerospace",
        profileStatus: "ACTIVE",
        status: "ACTIVE",
      },
    ],
    "engagement.meetings": (input) => {
      ranges.push((input as { query: Record<string, string> }).query);
      return meetings;
    },
  });
  await page.goto("/modules/calendar");
  await expect(
    page.getByRole("heading", { name: "Master calendar" }),
  ).toBeVisible();
  await expect(
    page.getByText("Test strategy review", { exact: false }).first(),
  ).toBeVisible();
  await page.getByLabel("Calendar client scope").selectOption(clientId);
  await page.getByRole("button", { name: "Week", exact: true }).click();
  await expect(page.getByLabel("week meeting calendar")).toBeVisible();
  await expect(
    page
      .getByLabel("week meeting calendar")
      .getByText("Test strategy review", { exact: false }),
  ).toBeVisible();
  await expect
    .poll(() => ranges.at(-1))
    .toEqual({
      from: "2026-10-05T04:00:00Z",
      to: "2026-10-12T04:00:00Z",
      clientId,
    });
  await expect
    .poll(() =>
      page
        .getByLabel("week meeting calendar")
        .locator(".sx__view-container")
        .evaluate((element) => getComputedStyle(element).filter),
    )
    .toBe("none");
  await page.screenshot({
    path: "test-results/calendar-week.png",
    fullPage: true,
    animations: "disabled",
  });
});
test("client agenda is meetings-only and the meeting opens the shared prep/notes/debrief workflow", async ({
  page,
}) => {
  const keys: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/capiro/"))
      keys.push(new URL(request.url()).pathname.split("/").pop()!);
  });
  await operationFixtures(page, {
    "me.read": testIdentity,
    "clients.list": [
      {
        id: clientId,
        name: "Test Aerospace",
        profileStatus: "ACTIVE",
        status: "ACTIVE",
      },
    ],
    "engagement.meetings": meetings,
    "engagement.meeting": meetings[0],
    "engagement.notes": [],
    "engagement.debriefs": [],
  });
  await page.goto("/modules/calendar");
  await page.getByLabel("Calendar client scope").selectOption(clientId);
  await page.getByRole("button", { name: "Agenda", exact: true }).click();
  await expect(page.getByRole("table")).toContainText("Test strategy review");
  expect(keys).not.toContain("legiwatch.calendar");
  expect(keys).not.toContain("planner.tasks");
  await page
    .getByRole("button", { name: "Test strategy review", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("tab", { name: "Meeting Notes", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("tab", { name: "Debrief", exact: true }),
  ).toBeVisible();
});

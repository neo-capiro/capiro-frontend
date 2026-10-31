import { test } from "./runtime-observed-test";
import { installFixedDate } from "./fixed-date";
import { expect, type Route } from "@playwright/test";
import { onlyLocalRequests, operationFixtures, testIdentity } from "./fixtures";

const clientId = "30000000-0000-4000-8000-000000000001";
const hearingSources = {
  "legiwatch.calendar": { rows: [], total: 0, page: 1, pageSize: 200 },
  "legiwatch.calendarCoverage": { rows: [], asOf: "2026-10-08T16:00:00Z" },
};
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
  await page.route("**/api/backend/core/me", (route) =>
    route.fulfill({ json: testIdentity }),
  );
  // Scope changes now use the same current-client verification as URL entry.
  await page.route(`**/api/backend/core/clients/${clientId}`, (route) =>
    route.fulfill({
      json: {
        id: clientId,
        name: "Test Aerospace",
        status: "ACTIVE",
        profileStatus: "ACTIVE",
      },
    }),
  );
  await installFixedDate(page, Date.parse("2026-10-08T16:00:00Z"));
});
test.afterEach(async ({ runtimeObservation }) => {
  expect(
    runtimeObservation.consoleErrors,
    "No Calendar console errors",
  ).toEqual([]);
});
test("month and week retain client scope and query end-exclusive Eastern ranges", async ({
  page,
}) => {
  const ranges: Record<string, string>[] = [];
  const scopeReads: string[] = [];
  page.on("request", (request) => {
    const path = new URL(request.url()).pathname;
    if (path === "/api/backend/core/me") scopeReads.push("identity");
    if (path === `/api/backend/core/clients/${clientId}`)
      scopeReads.push("client");
  });
  await operationFixtures(page, {
    ...hearingSources,
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
  await expect(page.getByLabel("week calendar")).toBeVisible();
  await expect(
    page
      .getByLabel("week calendar")
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
        .getByLabel("week calendar")
        .locator(".sx__view-container")
        .evaluate((element) => getComputedStyle(element).filter),
    )
    .toBe("none");
  await page.screenshot({
    path: "test-results/calendar-week.png",
    fullPage: true,
    animations: "disabled",
  });
  expect(scopeReads).toEqual(["identity", "client"]);
  await page.getByLabel("Calendar client scope").selectOption("");
  await expect(
    page.getByRole("heading", { name: "Master calendar" }),
  ).toBeVisible();
  await page.getByLabel("Calendar client scope").selectOption(clientId);
  await expect(
    page.getByRole("heading", { name: "Test Aerospace calendar" }),
  ).toBeVisible();
  expect(scopeReads).toEqual(["identity", "client", "identity", "client"]);
});

test("selected client stays unavailable when the canonical identity has no admitted actor", async ({
  page,
}) => {
  let clientReads = 0;
  page.on("request", (request) => {
    if (request.url().endsWith(`/api/backend/core/clients/${clientId}`))
      clientReads += 1;
  });
  await page.route("**/api/backend/core/me", (route) =>
    route.fulfill({ json: { ...testIdentity, role: null } }),
  );
  await operationFixtures(page, { "me.read": testIdentity });
  await page.goto(`/modules/calendar?clientId=${clientId}`);
  await expect(
    page.getByRole("heading", { name: "Selected client unavailable" }),
  ).toBeVisible();
  expect(clientReads).toBe(0);
});

test("same-actor background revalidation preserves the mounted calendar and its filters", async ({
  page,
}) => {
  let identityReads = 0;
  let pendingIdentity: Route | undefined;
  await page.route("**/api/backend/core/me", (route) => {
    identityReads += 1;
    if (identityReads > 1) {
      pendingIdentity = route;
      return;
    }
    return route.fulfill({ json: testIdentity });
  });
  await operationFixtures(page, {
    "me.read": testIdentity,
    "clients.list": [],
    "engagement.meetings": meetings,
  });
  await page.goto(`/modules/calendar?clientId=${clientId}`);
  const heading = page.getByRole("heading", {
    name: "Test Aerospace calendar",
  });
  await expect(heading).toBeVisible();
  const mountedHeading = await heading.elementHandle();
  const filter = page.getByRole("button", { name: /^Meetings/ });
  await filter.click();
  await expect(filter).toHaveAttribute("aria-pressed", "false");
  await page.clock.install({ time: new Date("2026-10-08T16:00:00Z") });
  await page.clock.setSystemTime(new Date("2026-10-08T16:00:31Z"));
  await page.evaluate(() => {
    dispatchEvent(new Event("offline"));
    dispatchEvent(new Event("online"));
  });
  await expect.poll(() => Boolean(pendingIdentity)).toBe(true);
  await expect(heading).toBeVisible();
  expect(await mountedHeading!.evaluate((element) => element.isConnected)).toBe(
    true,
  );
  await expect(filter).toHaveAttribute("aria-pressed", "false");
  await pendingIdentity!.fulfill({ json: testIdentity });
  pendingIdentity = undefined;
  await expect(filter).toHaveAttribute("aria-pressed", "false");

  // A subsequent revoked actor still removes the admitted client immediately.
  await page.clock.setSystemTime(new Date("2026-10-08T16:01:02Z"));
  await page.evaluate(() => {
    dispatchEvent(new Event("offline"));
    dispatchEvent(new Event("online"));
  });
  await expect.poll(() => Boolean(pendingIdentity)).toBe(true);
  await pendingIdentity!.fulfill({ json: { ...testIdentity, role: null } });
  await expect(
    page.getByRole("heading", { name: "Selected client unavailable" }),
  ).toBeVisible();
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
    ...hearingSources,
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
  await expect(
    page.getByRole("heading", { name: "Test Aerospace calendar" }),
  ).toBeVisible();
  keys.length = 0;
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

test("fixed Date retains native formatting and advancing browser timers", async ({
  page,
}) => {
  await operationFixtures(page, {
    ...hearingSources,
    "me.read": testIdentity,
    "clients.list": [],
    "engagement.meetings": [],
  });
  await page.goto("/modules/calendar");
  await expect(
    page.getByRole("heading", { name: "Master calendar" }),
  ).toBeVisible();
  const result = await page.evaluate(async () => {
    const before = performance.now();
    await new Promise<void>((resolve) => setTimeout(resolve, 20));
    await new Promise<number>((resolve) => requestAnimationFrame(resolve));
    class DerivedDate extends Date {}
    const explicit = new Date("2001-02-03T04:05:06Z");
    return {
      now: Date.now(),
      constructed: new Date().getTime(),
      called: Date(),
      expectedCall: new Date(1791475200000).toString(),
      explicit: explicit.toISOString(),
      zero: new Date(0).getTime(),
      invalid: Number.isNaN(new Date(undefined as unknown as number).getTime()),
      parse: Date.parse("2001-02-03T04:05:06Z"),
      utc: Date.UTC(2001, 1, 3, 4, 5, 6),
      inherited: new DerivedDate().getTime(),
      instance: new DerivedDate() instanceof Date,
      stableNow: Date.now === Date.now,
      formatted: new Intl.DateTimeFormat("en-US", {
        timeZone: "UTC",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(explicit),
      timeAdvanced: performance.now() > before,
    };
  });
  expect(result).toEqual({
    now: 1791475200000,
    constructed: 1791475200000,
    called: result.expectedCall,
    expectedCall: result.expectedCall,
    explicit: "2001-02-03T04:05:06.000Z",
    zero: 0,
    invalid: true,
    parse: 981173106000,
    utc: 981173106000,
    inherited: 1791475200000,
    instance: true,
    stableNow: true,
    formatted: "02/03/2001",
    timeAdvanced: true,
  });
});

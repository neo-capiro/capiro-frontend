import { expect, test, type Page } from "@playwright/test";
import { client, clientId, installFixtures, json } from "./fixtures";
import { voiceMeeting } from "./voice-meeting";
const instant = Date.now();
const now = new Date(instant).toISOString();
const day = now.slice(0, 10);
const offset = (hours: number) =>
  new Date(instant + hours * 3_600_000).toISOString();
const prep = {
  id: "prep-synthetic",
  status: "generated",
  summary: "Saved preparation",
  agenda: [],
  talkingPoints: [],
  risks: [],
  followUps: [],
  createdAt: now,
};
const makeMeeting = (id: string, start: string, end: string) => ({
  ...voiceMeeting,
  id,
  subject: `Synthetic ${id}`,
  client: { id: clientId, name: client.name },
  startsAt: start,
  endsAt: end,
  status: "scheduled",
  location: "Synthetic meeting room",
  attendees: [
    {
      id: "attendee-one",
      name: "Synthetic attendee",
      email: "attendee@example.test",
      role: "Organizer",
    },
  ],
  preps: [],
  notes: [],
  debriefs: [],
});
const upcoming = makeMeeting("upcoming", offset(24), offset(25));
const live = makeMeeting("live", offset(-0.5), offset(0.5));
const completed = makeMeeting("completed", offset(-25), offset(-24));
const cancelled = {
  ...completed,
  id: "cancelled",
  subject: "Synthetic cancelled",
  status: "cancelled",
};
async function setup(page: Page) {
  const unexpected = await installFixtures(page);
  const state = {
    meetings: [upcoming, live, completed, cancelled] as Record<
      string,
      unknown
    >[],
    reads: 0,
    writes: [] as string[],
    status: 200,
    hold: false,
    release: () => {},
  };
  await page.route("**/api/backend/core/engagement/attachments?**", (route) =>
    json(route, []),
  );
  await page.route(
    "**/api/backend/core/engagement/meetings**",
    async (route) => {
      const url = new URL(route.request().url());
      if (route.request().method() !== "GET") {
        state.writes.push(url.pathname);
        return json(route, { message: "Unexpected synthetic mutation" }, 500);
      }
      const path = url.pathname.split("/engagement/meetings")[1];
      if (!path) {
        state.reads++;
        if (state.hold)
          await new Promise<void>((resolve) => {
            state.release = resolve;
          });
        return json(
          route,
          state.status === 200
            ? state.meetings
            : { message: "Synthetic meeting feed failed" },
          state.status,
        );
      }
      if (path.endsWith("/notes") || path.endsWith("/debriefs"))
        return json(route, []);
      if (path.endsWith("/notetaker")) return json(route, null);
      return json(
        route,
        state.meetings.find((row) => path === `/${row.id}`) ?? {},
        200,
      );
    },
  );
  return { state, unexpected };
}
const url = `/calendar-boundary.html?view=agenda&date=${day}&zone=UTC&clientId=${clientId}`;

test("client agenda filters native lifecycle status without requests or approval inference", async ({
  page,
}) => {
  const { state, unexpected } = await setup(page);
  state.meetings.push({
    ...upcoming,
    id: "prepared",
    subject: "Synthetic prepared",
    preps: [prep],
  });
  await page.goto(url);
  await expect(
    page.getByRole("columnheader", { name: "Prep", exact: true }),
  ).toBeVisible();
  const prepared = page.getByRole("row", { name: /Synthetic prepared/ });
  await expect(prepared).toContainText("Generated");
  await expect(prepared).not.toContainText("Approved");
  const reads = state.reads;
  await page.getByRole("button", { name: "Needs prep", exact: true }).click();
  await expect(
    page.getByRole("button", { name: upcoming.subject, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Synthetic prepared", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: completed.subject, exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Needs debrief", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: completed.subject, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: cancelled.subject, exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "All meetings", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Synthetic prepared", exact: true }),
  ).toBeVisible();
  expect(state.reads).toBe(reads);
  expect(state.writes).toEqual([]);
  expect(unexpected).toEqual([]);
});

test("omitted debrief metadata is unavailable rather than a missing debrief", async ({
  page,
}) => {
  const { state, unexpected } = await setup(page);
  const { debriefs: omitted, ...unknown } = completed;
  void omitted;
  state.meetings = [
    { ...unknown, id: "unknown", subject: "Synthetic unavailable metadata" },
    completed,
  ];
  await page.goto(url);
  await expect(
    page.getByRole("row", { name: /Synthetic unavailable metadata/ }),
  ).toContainText("Status unavailable");
  await page
    .getByRole("button", { name: "Needs debrief", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Synthetic unavailable metadata",
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: completed.subject, exact: true }),
  ).toBeVisible();
  expect(unexpected).toEqual([]);
});

for (const [meeting, tab] of [
  [upcoming, "Preparation"],
  [live, "Notes"],
  [completed, "Debriefs"],
  [cancelled, "Information"],
] as const)
  test(`${meeting.id} opens ${tab} and retains identity across all meeting tabs`, async ({
    page,
  }) => {
    const { state, unexpected } = await setup(page);
    await page.goto(`${url}&meeting=${meeting.id}`);
    const detail = page.getByRole("dialog", {
      name: meeting.subject,
      exact: true,
    });
    await expect(
      detail.getByRole("button", { name: tab, exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    for (const name of ["Information", "Preparation", "Notes", "Debriefs"]) {
      await detail.getByRole("button", { name, exact: true }).click();
      const identity = detail.getByRole("region", { name: "Meeting identity" });
      await expect(identity).toContainText(`Meeting ${meeting.id}`);
      await expect(identity).toContainText("Synthetic meeting room");
      await expect(identity).toContainText("Synthetic attendee");
      await expect(identity).toContainText("UTC");
    }
    expect(state.writes).toEqual([]);
    expect(unexpected).toEqual([]);
  });

test("held and failed refresh hide stale lifecycle rows until an explicit successful retry", async ({
  page,
}) => {
  const { state, unexpected } = await setup(page);
  await page.goto(url);
  await expect(
    page.getByRole("button", { name: upcoming.subject, exact: true }),
  ).toBeVisible();
  state.hold = true;
  state.status = 503;
  await page.evaluate(() => {
    void window.__calendarBoundary?.refreshFeeds();
  });
  await expect.poll(() => state.reads).toBe(2);
  await expect(
    page.getByRole("button", { name: upcoming.subject, exact: true }),
  ).toHaveCount(0);
  state.hold = false;
  state.release();
  await expect(page.getByRole("alert")).toContainText(
    "Synthetic meeting feed failed",
  );
  await expect(
    page.getByRole("button", { name: upcoming.subject, exact: true }),
  ).toHaveCount(0);
  state.hold = false;
  state.status = 200;
  state.meetings = [{ ...completed, subject: "Synthetic current replacement" }];
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: "Synthetic current replacement",
      exact: true,
    }),
  ).toBeVisible();
  expect(state.writes).toEqual([]);
  expect(unexpected).toEqual([]);
});

test("meeting identity and material columns fit mobile and desktop without losing controls", async ({
  page,
}, testInfo) => {
  const { unexpected } = await setup(page);
  await page.goto(url);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 980 });
    await expect(
      page.getByRole("button", { name: "Needs prep", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(`agenda-${width}.png`),
      fullPage: true,
    });
  }
  await page
    .getByRole("button", { name: upcoming.subject, exact: true })
    .click();
  const identity = page.getByRole("region", { name: "Meeting identity" });
  await expect(identity).toBeVisible();
  await identity.getByText(/Attendees · 1/).click();
  await expect(identity.getByRole("listitem")).toContainText("Organizer");
  await page.screenshot({
    path: testInfo.outputPath("meeting-mobile.png"),
    fullPage: true,
  });
  expect(unexpected).toEqual([]);
});

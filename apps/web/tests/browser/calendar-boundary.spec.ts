import { effectivePage, effectiveRecord } from "../effective-date-fixtures";
import { commentPage, commentRecord } from "../comment-calendar-fixtures";
import { expect, test } from "@playwright/test";
import { client, clientId, installFixtures, json } from "./fixtures";
import { voiceMeeting } from "./voice-meeting";

const feeds = [
  {
    name: "Synthetic retained effective date",
    route: "**/core/federal-register/effective-date-calendar?**",
    body: {
      ...effectivePage(),
      data: [
        { ...effectiveRecord, title: "Synthetic retained effective date" },
      ],
    },
  },
  {
    name: "Synthetic retained meeting",
    route: "**/core/engagement/meetings?**",
    body: [{ ...voiceMeeting, subject: "Synthetic retained meeting" }],
  },
  {
    name: "Synthetic retained hearing",
    route: "**/core/legiwatch/live-hearings/calendar?**",
    body: {
      rows: [
        {
          id: "hearing-retained",
          title: "Synthetic retained hearing",
          date: "2026-10-12",
          startsAt: null,
          timezone: "America/New_York",
          eventStatus: "scheduled",
          officialPageUrl: null,
        },
      ],
      total: 1,
      page: 1,
      pageSize: 200,
    },
  },
  {
    name: "Synthetic retained task",
    route: "**/strategy/planner/tasks?**",
    body: {
      items: [
        {
          id: "planner-retained",
          name: "Synthetic retained task",
          status: "todo",
          archived: false,
          dueOn: "2026-10-13",
          startOn: null,
          clientId,
        },
      ],
      nextCursor: null,
    },
  },
  {
    name: "Synthetic retained deadline",
    route: "**/core/federal-register/comment-deadline-calendar?**",
    body: commentPage(
      [
        {
          ...commentRecord("2026-retained", "2026-10-14"),
          title: "Synthetic retained deadline",
          htmlUrl: "https://example.test/synthetic-deadline",
        },
      ],
      "2026-10-01",
      "2026-10-31",
    ),
  },
];

for (const failedFeed of feeds) {
  test(`failed refresh removes ${failedFeed.name} and preserves other feeds`, async ({
    page,
  }) => {
    const unexpected = await installFixtures(page);
    let denied = false;
    for (const feed of feeds)
      await page.route(feed.route, (route) =>
        denied && feed === failedFeed
          ? json(route, { message: "Synthetic feed access changed" }, 403)
          : json(route, feed.body),
      );
    await page.goto(
      "/calendar-boundary.html?view=agenda&date=2026-10-15&zone=UTC",
    );
    for (const feed of feeds)
      await expect(
        page.getByRole("heading", { name: new RegExp(feed.name) }),
      ).toBeVisible();
    denied = true;
    await page.evaluate(async () => {
      if (!window.__calendarBoundary) throw new Error("Missing test controls");
      await window.__calendarBoundary.refreshFeeds();
    });
    await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
    expect(
      await page.evaluate(() => window.__calendarBoundary?.snapshots()),
    ).toContainEqual({ status: "error", retained: true });
    await expect(
      page.getByRole("heading", { name: new RegExp(failedFeed.name) }),
    ).toHaveCount(0);
    for (const feed of feeds.filter((value) => value !== failedFeed))
      await expect(
        page.getByRole("heading", { name: new RegExp(feed.name) }),
      ).toBeVisible();
    denied = false;
    await page.getByRole("button", { name: "Retry" }).click();
    await expect(
      page.getByRole("heading", { name: new RegExp(failedFeed.name) }),
    ).toBeVisible();
    expect(unexpected).toEqual([]);
  });
}

test("failed client refresh removes cached names from the Calendar scope picker", async ({
  page,
}) => {
  const unexpected = await installFixtures(page);
  let denied = false;
  await page.route("**/core/clients", (route) =>
    denied
      ? json(route, { message: "Synthetic client access changed" }, 403)
      : json(route, [client]),
  );
  await page.goto(
    "/calendar-boundary.html?view=agenda&date=2026-10-15&zone=UTC",
  );
  const scope = page.getByRole("combobox", { name: "Calendar scope" });
  await expect(scope.getByRole("option", { name: client.name })).toHaveCount(1);
  denied = true;
  await page.evaluate(async () => {
    if (!window.__calendarBoundary) throw new Error("Missing test controls");
    await window.__calendarBoundary.refreshClients();
  });
  await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
  await expect(scope.getByRole("option", { name: client.name })).toHaveCount(0);
  denied = false;
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(scope.getByRole("option", { name: client.name })).toHaveCount(1);
  expect(unexpected).toEqual([]);
});

test("meeting client selection survives failed refresh without a silent association change", async ({
  page,
}) => {
  const unexpected = await installFixtures(page);
  let denied = false;
  await page.route("**/core/clients", (route) =>
    denied
      ? json(route, { message: "Synthetic client access changed" }, 403)
      : json(route, [client]),
  );
  await page.goto(
    "/calendar-boundary.html?view=agenda&date=2026-10-15&zone=UTC",
  );
  await page.getByRole("button", { name: "New meeting" }).click();
  const dialog = page.getByRole("dialog", { name: "New meeting" });
  const selection = dialog.getByRole("combobox", {
    name: "Client",
    exact: true,
  });
  await selection.selectOption(clientId);
  await dialog.getByRole("textbox", { name: "Subject" }).fill("Retained draft");
  denied = true;
  await page.evaluate(async () => {
    if (!window.__calendarBoundary) throw new Error("Missing test controls");
    await window.__calendarBoundary.refreshClients();
  });
  await expect(selection).toHaveValue(clientId);
  await expect(selection).toBeDisabled();
  await expect(
    selection.getByRole("option", { name: client.name }),
  ).toHaveCount(0);
  await expect(
    selection.getByRole("option", { name: "Selected client unavailable" }),
  ).toHaveCount(1);
  await expect(
    dialog.getByRole("button", { name: "Save meeting" }),
  ).toBeDisabled();
  await expect(dialog.getByRole("textbox", { name: "Subject" })).toHaveValue(
    "Retained draft",
  );
  denied = false;
  await dialog.getByRole("button", { name: "Retry" }).click();
  await expect(selection).toBeEnabled();
  await expect(selection).toHaveValue(clientId);
  await expect(
    selection.getByRole("option", { name: client.name }),
  ).toHaveCount(1);
  await expect(
    dialog.getByRole("button", { name: "Save meeting" }),
  ).toBeEnabled();
  expect(unexpected).toEqual([]);
});

test("a master Calendar client link cannot save after its selected client becomes unavailable", async ({
  page,
}) => {
  const unexpected = await installFixtures(page);
  let denied = false;
  await page.route("**/core/clients", (route) =>
    denied
      ? json(route, { message: "Synthetic client access changed" }, 403)
      : json(route, [client]),
  );
  await page.goto(
    `/calendar-boundary.html?view=agenda&date=2026-10-15&clientId=${clientId}&new=meeting`,
  );
  const dialog = page.getByRole("dialog", { name: "New meeting" });
  await expect(
    dialog.getByRole("button", { name: "Save meeting" }),
  ).toBeEnabled();
  await dialog
    .getByRole("textbox", { name: "Subject" })
    .fill("Scoped retained draft");
  denied = true;
  await page.evaluate(async () => {
    if (!window.__calendarBoundary) throw new Error("Missing test controls");
    await window.__calendarBoundary.refreshClients();
  });
  await expect(
    dialog.getByRole("button", { name: "Save meeting" }),
  ).toBeDisabled();
  await expect(dialog.getByRole("textbox", { name: "Subject" })).toHaveValue(
    "Scoped retained draft",
  );
  denied = false;
  await dialog.getByRole("button", { name: "Retry" }).click();
  await expect(
    dialog.getByRole("button", { name: "Save meeting" }),
  ).toBeEnabled();
  expect(new URL(page.url()).searchParams.get("clientId")).toBe(clientId);
  expect(unexpected).toEqual([]);
});

test("unavailable Calendar feeds do not become a successful empty-state claim", async ({
  page,
}) => {
  const unexpected = await installFixtures(page);
  let denied = false;
  for (const feed of feeds)
    await page.route(feed.route, (route) =>
      denied
        ? json(route, { message: "Synthetic feed access changed" }, 403)
        : json(route, feed.body),
    );
  await page.goto(
    "/calendar-boundary.html?view=agenda&date=2026-10-15&zone=UTC",
  );
  for (const feed of feeds)
    await expect(
      page.getByRole("heading", { name: new RegExp(feed.name) }),
    ).toBeVisible();
  denied = true;
  await page.evaluate(async () => {
    if (!window.__calendarBoundary) throw new Error("Missing test controls");
    await window.__calendarBoundary.refreshFeeds();
  });
  await expect(page.getByRole("button", { name: "Retry" })).toHaveCount(
    feeds.length,
  );
  for (const feed of feeds)
    await expect(
      page.getByRole("heading", { name: new RegExp(feed.name) }),
    ).toHaveCount(0);
  await expect(
    page.getByText("No events found in the selected feeds and date range."),
  ).toHaveCount(0);
  expect(unexpected).toEqual([]);
});

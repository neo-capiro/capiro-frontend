import { expect, test, type Page } from "@playwright/test";
import { clientId, installFixtures, json } from "./fixtures";
import { voiceMeeting } from "./voice-meeting";

const date = new Date().toISOString().slice(0, 10);
const meeting = {
  ...voiceMeeting,
  id: "qa-mobile-calendar-meeting",
  subject: "Synthetic long planning meeting for mobile review",
  startsAt: `${date}T14:00:00Z`,
  endsAt: `${date}T15:00:00Z`,
};

async function setup(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const unexpected = await installFixtures(page);
  await page.route("**/api/backend/core/engagement/meetings?**", (route) =>
    json(route, [meeting]),
  );
  await page.route("**/api/backend/core/government-forecasts?**", (route) =>
    json(route, {
      schemaVersion: 1,
      items: [],
      page: 1,
      pageSize: 50,
      total: 0,
      coverage: {
        lastSuccessfulCheckAt: null,
        lastAttemptAt: null,
        lastCheckStatus: "unavailable",
        edition: null,
        acceptedCount: 0,
        rejectedCount: 0,
        partial: false,
      },
    }),
  );
  return { errors, unexpected };
}

test("mobile master calendar defaults to readable agenda; desktop stays month", async ({
  page,
}, testInfo) => {
  const { errors, unexpected } = await setup(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/calendar-boundary.html?date=${date}&zone=UTC`);
  await expect(
    page.getByRole("combobox", { name: "Calendar view" }),
  ).toHaveValue("agenda");
  await expect(page.getByText(meeting.subject).first()).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: testInfo.outputPath("mobile-master-agenda.png"),
    fullPage: true,
  });
  expect(unexpected).toEqual([]);
  expect(errors).toEqual([]);
  await page.setViewportSize({ width: 1440, height: 1040 });
  await expect(
    page.getByRole("combobox", { name: "Calendar view" }),
  ).toHaveValue("month");
  await page.screenshot({
    path: testInfo.outputPath("desktop-master-month.png"),
    fullPage: true,
  });
});

test("explicit month remains available on mobile, including client calendar", async ({
  page,
}, testInfo) => {
  const { errors, unexpected } = await setup(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/calendar-boundary.html?date=${date}&zone=UTC&view=month`);
  await expect(
    page.getByRole("combobox", { name: "Calendar view" }),
  ).toHaveValue("month");
  await page.screenshot({
    path: testInfo.outputPath("mobile-explicit-month.png"),
    fullPage: true,
  });
  await page.goto(
    `/calendar-boundary.html?date=${date}&zone=UTC&workspaceClient=${clientId}`,
  );
  await expect(
    page
      .getByRole("group", { name: "Calendar view" })
      .getByRole("button", { name: "Agenda" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText(meeting.subject).first()).toBeVisible();
  expect(
    await page
      .locator("table tbody th")
      .first()
      .evaluate((element) => element.getBoundingClientRect().width),
  ).toBeGreaterThan(220);
  expect(
    await page
      .locator("table tbody tr")
      .first()
      .evaluate((element) => element.getBoundingClientRect().height),
  ).toBeLessThan(270);
  await page.screenshot({
    path: testInfo.outputPath("mobile-client-agenda.png"),
    fullPage: true,
  });
  expect(unexpected).toEqual([]);
  expect(errors).toEqual([]);
});

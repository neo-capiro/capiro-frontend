import { test, expect } from "@playwright/test";
import { onlyLocalRequests, operationFixtures } from "./fixtures";
import { moduleRouteFixtures } from "./module-route-fixtures";

const clientId = "30000000-0000-4000-8000-000000000001";
test("compact Calendar retains scoped module navigation, history, source disclosures and mobile controls", async ({
  page,
}, info) => {
  await onlyLocalRequests(page);
  await page.clock.setFixedTime(new Date("2026-10-08T16:00:00Z"));
  await operationFixtures(page, {
    ...moduleRouteFixtures,
    "clients.list": [
      {
        id: clientId,
        name: "Synthetic Aerospace",
        status: "ACTIVE",
        profileStatus: "ACTIVE",
      },
    ],
  });
  await page.route(`**/api/backend/core/clients/${clientId}`, (route) =>
    route.fulfill({
      json: {
        id: clientId,
        name: "Synthetic Aerospace",
        status: "ACTIVE",
        profileStatus: "ACTIVE",
      },
    }),
  );
  await page.goto(`/modules/calendar?clientId=${clientId}`);
  await page.getByRole("button", { name: "Agenda", exact: true }).click();
  const heading = page.getByRole("heading", {
    name: "Master calendar",
    exact: true,
  });
  expect((await heading.boundingBox())!.x).toBe(264);
  expect((await heading.boundingBox())!.y).toBeLessThan(150);
  expect(
    (await page
      .getByRole("button", { name: "Today", exact: true })
      .boundingBox())!.y,
  ).toBeLessThan(220);
  await expect(
    page.getByRole("navigation", { name: "Modules", exact: true }),
  ).toBeVisible();
  const disclosure = page
    .locator("summary")
    .filter({ hasText: "Master calendar" });
  await disclosure.focus();
  await disclosure.press("Enter");
  const switcher = page.getByRole("combobox", { name: "Switch module" });
  await expect(switcher).toBeVisible();
  await switcher.focus();
  await page.keyboard.press("Escape");
  await expect(disclosure).toBeFocused();
  await expect(switcher).not.toBeVisible();
  await disclosure.press("Enter");
  await switcher.click();
  await page.getByRole("option", { name: "Planner", exact: true }).click();
  await expect(page).toHaveURL(`/modules/planner?clientId=${clientId}`);
  await page.goBack();
  await expect(heading).toBeVisible();
  await page.goForward();
  await expect(page).toHaveURL(`/modules/planner?clientId=${clientId}`);
  await page.goBack();
  await page.getByLabel("Calendar client scope").selectOption("");
  await page.getByRole("button", { name: "Agenda", exact: true }).click();
  await expect(page.getByText(/Government unavailable:/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Government Unavailable/ }),
  ).toBeVisible();
  await expect(page.getByLabel("Search calendar events")).toBeVisible();
  for (const asset of [
    "filter",
    "scope-chevron",
    "previous",
    "next",
    "check",
  ]) {
    const response = await page.request.get(
      `/design/modules/calendar/${asset}.svg`,
    );
    expect(response.ok()).toBe(true);
    expect(await response.text()).toContain("<svg");
  }
  await page.screenshot({
    path: info.outputPath("calendar-desktop-after.png"),
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByLabel("Search calendar events").fill("synthetic");
  await expect(page.getByLabel("Search calendar events")).toHaveValue(
    "synthetic",
  );
  await page.screenshot({ path: info.outputPath("calendar-mobile-after.png") });
});

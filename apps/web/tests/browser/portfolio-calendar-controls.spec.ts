import { test, expect, type Locator } from "@playwright/test";
import { clientId, installFixtures, json } from "./fixtures";

async function expectWithinViewport(control: Locator, width: number) {
  await expect(control).toBeVisible();
  const box = await control.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(width);
}

for (const width of [390, 680, 1440]) {
  test(`Calendar controls remain reachable at ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const unexpected = await installFixtures(page);
    await page.route("**/core/government-forecasts?*", (route) =>
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
          partial: true,
        },
      }),
    );
    await page.goto(
      `/portfolio/${clientId}/calendar?date=2026-11-05&view=month&zone=America%2FLos_Angeles`,
    );
    const picker = page.getByRole("group", {
      name: "Calendar view",
      exact: true,
    });
    const zone = page.getByLabel("Calendar timezone", { exact: true });
    await expect(picker).toBeVisible();
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    await expectWithinViewport(zone, width);
    for (const name of ["Month", "Week", "Agenda"]) {
      await expectWithinViewport(
        picker.getByRole("button", { name, exact: true }),
        width,
      );
    }
    await zone.selectOption("America/New_York");
    await expect(zone).toHaveValue("America/New_York");
    for (const name of ["Week", "Agenda", "Month"]) {
      const button = picker.getByRole("button", { name, exact: true });
      await button.click();
      await expect(button).toHaveAttribute("aria-pressed", "true");
      await expect(page).toHaveURL(new RegExp(`view=${name.toLowerCase()}`));
      expect(new URL(page.url()).searchParams.get("zone")).toBe(
        "America/New_York",
      );
      await expectWithinViewport(button, width);
    }
    expect(errors).toEqual([]);
    expect(unexpected).toEqual([]);
    await page.screenshot({
      path: info.outputPath(`calendar-controls-${width}.png`),
      animations: "disabled",
    });
  });
}

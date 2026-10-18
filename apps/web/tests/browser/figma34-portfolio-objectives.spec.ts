import { expect, test } from "@playwright/test";
import { clientId, installFixtures } from "./fixtures";

test("desktop objectives list follows the Portfolio 3.4 frame", async ({
  page,
}, info) => {
  const unexpected = await installFixtures(page);
  await page.goto(`/portfolio/${clientId}/objectives`);
  await expect(page.getByRole("heading", { name: "Objectives" })).toBeVisible();
  const stats = page.locator('dl[aria-label="Objective summary"]');
  await expect(stats.locator("dt")).toHaveText([
    "Objectives",
    "Active",
    "Strategy ready",
    "Decisions waiting",
    "Next cycle",
  ]);
  await expect(stats.locator("dd").first()).toHaveText("1");
  const targets = [
    [stats, 264, 284, 1144],
    [page.getByRole("region", { name: "Advocacy history" }), 264, 377, 360],
    [page.getByRole("region", { name: "Current objectives" }), 648, 377, 760],
  ] as const;
  for (const [locator, x, y, width] of targets) {
    const box = await locator.boundingBox();
    expect(box).not.toBeNull();
    for (const [actual, expected] of [
      [box!.x, x],
      [box!.y, y],
      [box!.width, width],
    ] as const)
      expect(Math.abs(actual - expected)).toBeLessThanOrEqual(6);
  }
  await page.screenshot({
    path: info.outputPath("objectives-list-desktop.png"),
  });
  expect(unexpected).toEqual([]);
});

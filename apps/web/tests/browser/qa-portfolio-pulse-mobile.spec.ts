import { expect, test } from "@playwright/test";
import { installFixtures } from "./fixtures";

test("all portfolio pulse metrics are visible at mobile width without a horizontal strip", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const unexpected = await installFixtures(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/portfolio");
  const metrics = page.getByRole("region", { name: "Portfolio pulse metrics" });
  await expect(metrics.getByRole("group")).toHaveCount(5);
  await expect
    .poll(async () =>
      metrics.evaluate((node) => node.scrollWidth <= node.clientWidth),
    )
    .toBe(true);
  const bounds = await metrics.boundingBox();
  expect(bounds).not.toBeNull();
  for (const group of await metrics.getByRole("group").all()) {
    const box = await group.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x + box!.width).toBeLessThanOrEqual(
      bounds!.x + bounds!.width + 1,
    );
  }
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: testInfo.outputPath("mobile-portfolio-pulse.png"),
    fullPage: true,
  });
  expect(unexpected).toEqual([]);
  expect(errors).toEqual([]);
});

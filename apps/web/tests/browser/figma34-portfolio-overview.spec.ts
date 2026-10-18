import { expect, test } from "@playwright/test";
import { clientId, installFixtures } from "./fixtures";

test("desktop client overview keeps one government entry and client meetings", async ({
  page,
}, info) => {
  const unexpected = await installFixtures(page);
  await page.goto(`/portfolio/${clientId}`);
  await expect(
    page.getByRole("button", { name: "Government & federal profile" }),
  ).toHaveCount(1);
  await expect(
    page.getByRole("link", { name: "Open calendar" }),
  ).toHaveAttribute("href", `/portfolio/${clientId}/calendar`);
  await page.evaluate(() => document.fonts.ready);
  const positions = [
    ["Client identity", 296, 144, 533, 224],
    ["Engagement pulse", 296, 384, 533, 412],
    ["District nexus", 843, 264, 533, 344],
    ["Deadline stress and requests", 843, 624, 533, 344],
  ] as const;
  for (const [name, x, y, width, height] of positions) {
    const box = await page.getByRole("region", { name }).boundingBox();
    expect(box, `${name} is visible`).not.toBeNull();
    for (const [actual, expected] of [
      [box!.x, x],
      [box!.y, y],
      [box!.width, width],
      [box!.height, height],
    ] as const)
      expect(
        Math.abs(actual - expected),
        `${name} desktop geometry`,
      ).toBeLessThanOrEqual(6);
  }
  await page.screenshot({
    path: info.outputPath("client-overview-desktop.png"),
  });
  expect(unexpected).toEqual([]);
});

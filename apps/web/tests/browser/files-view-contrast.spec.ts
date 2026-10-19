import { test, expect } from "@playwright/test";
import { clientId, installFixtures } from "./fixtures";

for (const width of [1440, 360])
  test(`selected Files view keeps readable text while hovered at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1040 });
    const unexpected = await installFixtures(page);
    await page.goto(`/portfolio/${clientId}/files`);
    const folders = page
      .getByRole("group", { name: "File view", exact: true })
      .getByRole("button", { name: "Folders", exact: true });
    await folders.click();
    await folders.hover();
    await expect(folders).toHaveAttribute("aria-pressed", "true");
    const contrast = await folders.evaluate((element) => {
      const style = getComputedStyle(element);
      const luminance = (color: string) => {
        const channels = color
          .match(/[\d.]+/g)!
          .slice(0, 3)
          .map(Number)
          .map((value) => {
            const channel = value / 255;
            return channel <= 0.04045
              ? channel / 12.92
              : ((channel + 0.055) / 1.055) ** 2.4;
          });
        return (
          channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722
        );
      };
      const text = luminance(style.color);
      const background = luminance(style.backgroundColor);
      return (
        (Math.max(text, background) + 0.05) /
        (Math.min(text, background) + 0.05)
      );
    });
    expect(contrast).toBeGreaterThanOrEqual(4.5);
    expect(unexpected).toEqual([]);
  });

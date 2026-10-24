import { test, expect } from "@playwright/test";
import { installFixtures } from "./fixtures";

function luminance(rgb: string) {
  const channels = rgb.match(/[\d.]+/g)?.map(Number);
  if (!channels || channels.length !== 3)
    throw new Error(`Expected an opaque computed RGB color: ${rgb}`);
  const linear = channels.map((value) => {
    const srgb = value / 255;
    return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  });
  return linear[0]! * 0.2126 + linear[1]! * 0.7152 + linear[2]! * 0.0722;
}

for (const width of [1440, 390]) {
  for (const colorScheme of ["light", "dark"] as const) {
    test(`Portfolio ${width}px ${colorScheme} active profile counts retain readable contrast`, async ({
      page,
    }, testInfo) => {
      const unexpected = await installFixtures(page);
      await page.setViewportSize({
        width,
        height: width === 1440 ? 1040 : 844,
      });
      await page.emulateMedia({ colorScheme });
      await page.goto("/portfolio");
      const navigation = page.getByRole("navigation", { name: "Profile type" });
      for (const [name, expectedCount] of [
        [/^All /, "2"],
        [/^Clients /, "1"],
      ] as const) {
        const tab = navigation.getByRole("button", { name });
        await tab.click();
        await expect(tab).toHaveAttribute("aria-pressed", "true");
        const count = tab.locator("small");
        await expect(count).toHaveText(expectedCount);
        for (const state of ["hover", "rest"]) {
          if (state === "rest") await page.mouse.move(0, 0);
          const colors = await count.evaluate((element) => {
            const style = getComputedStyle(element);
            const parent = getComputedStyle(element.parentElement!);
            return {
              foreground: style.color,
              background: parent.backgroundImage,
              solidBackground: parent.backgroundColor,
              countOpacity: style.opacity,
              buttonOpacity: parent.opacity,
            };
          });
          expect(colors.countOpacity).toBe("1");
          expect(colors.buttonOpacity).toBe("1");
          const stops =
            state === "hover"
              ? [colors.solidBackground]
              : colors.background.match(/rgb\([^)]+\)/g);
          expect(stops).toHaveLength(state === "hover" ? 1 : 2);
          const foreground = luminance(colors.foreground);
          const contrasts = stops!.map((stop) => {
            const background = luminance(stop);
            return (
              (Math.max(foreground, background) + 0.05) /
              (Math.min(foreground, background) + 0.05)
            );
          });
          await testInfo.attach("active-count-contrast", {
            body: JSON.stringify({
              width,
              colorScheme,
              state,
              colors,
              contrasts,
            }),
            contentType: "application/json",
          });
          expect(Math.min(...contrasts)).toBeGreaterThanOrEqual(4.5);
        }
      }
      expect(unexpected).toEqual([]);
    });
  }
}

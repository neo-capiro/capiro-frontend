import { test, expect } from "@playwright/test";
import { expectAccessibleHome } from "../../test/accessibility";
import {
  tabTo,
  expectFocusEvidence,
} from "../../test/accessibility-interaction";
import { installFixtures } from "./fixtures";

for (const width of [1440, 390]) {
  test(`Portfolio home preserves accessible names, descriptions and default axe checks at ${width}px`, async ({
    page,
  }, testInfo) => {
    const unexpected = await installFixtures(page);
    await page.setViewportSize({ width, height: width === 1440 ? 1040 : 844 });
    await page.goto("/");
    const profile = page.getByRole("link", {
      name: "Open Test Aerospace",
      exact: true,
    });
    await expect(profile).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Needs attention",
        level: 2,
        exact: true,
      }),
    ).toBeVisible();
    if (width === 390) {
      const metrics = page.getByRole("region", {
        name: "Portfolio pulse metrics",
        exact: true,
      });
      await tabTo(page, metrics);
      await expectFocusEvidence(metrics, testInfo);
      await metrics.press("ArrowRight");
      await expect
        .poll(() => metrics.evaluate((element) => element.scrollLeft))
        .toBeGreaterThan(0);
      await metrics.press("ArrowLeft");
      await expect
        .poll(() => metrics.evaluate((element) => element.scrollLeft))
        .toBe(0);
    }
    const attention = page.getByRole("heading", {
      name: "Needs attention",
      exact: true,
      level: 2,
    });
    await expect(attention).toHaveCSS("font-size", "15px");
    await expect(attention).toHaveCSS("font-weight", "600");
    await expect(attention).toHaveCSS("letter-spacing", "-0.15px");
    await expectAccessibleHome(page, testInfo);
    await expect(profile).toHaveAccessibleDescription("Aerospace");
    await expect(
      page.getByRole("heading", { name: "Test Aerospace", level: 2 }),
    ).toBeVisible();
    expect(unexpected).toEqual([]);
  });
}

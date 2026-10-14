import { test, expect } from "@playwright/test";
import { expectAccessibleHome } from "../../test/accessibility";
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
    await expectAccessibleHome(page, testInfo);
    await expect(profile).toHaveAccessibleDescription("Aerospace");
    await expect(
      page.getByRole("heading", { name: "Test Aerospace", level: 2 }),
    ).toBeVisible();
    expect(unexpected).toEqual([]);
  });
}

import { test, expect } from "@playwright/test";
import { expectRenderedContrast } from "../../test/rendered-contrast";
import {
  tabTo,
  expectFocusEvidence,
} from "../../test/accessibility-interaction";
import { portfolioAccessibilityFixture } from "./portfolio-accessibility-fixtures";

for (const width of [1440, 390]) {
  for (const theme of ["light", "dark"] as const) {
    test(`Portfolio incomplete contrast and names are reviewed at ${width}px ${theme}`, async ({
      page,
    }, info) => {
      const isolated = await portfolioAccessibilityFixture(page, info);
      await page.setViewportSize({
        width,
        height: width === 1440 ? 1040 : 844,
      });
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
      await page.goto("/portfolio");
      const profile = page.getByRole("link", {
        name: "Open Test Aerospace",
        exact: true,
      });
      await expect(profile).toBeVisible();
      await expect(profile).toHaveAccessibleDescription("Aerospace");
      await expect(
        page.getByRole("heading", { name: "Test Aerospace", level: 2 }),
      ).toBeVisible();
      const pulse = page.getByRole("region", { name: "Portfolio pulse" });
      const eyebrow = pulse.getByText(/^Portfolio pulse · FY\d{2}$/);
      if (width === 390) await expect(eyebrow).toBeHidden();
      else await expect(eyebrow).toBeVisible();
      const labels = pulse
        .getByTestId("portfolio-metric-panel")
        .locator("p:visible, small:visible, span.eyebrow:visible");
      await expect(labels).toHaveCount(width === 390 ? 12 : 13);
      for (let i = 0; i < (await labels.count()); i++)
        await expectRenderedContrast(labels.nth(i), info, `pulse-label-${i}`);
      await expectRenderedContrast(
        pulse
          .getByText("Active clients", { exact: true })
          .locator("..")
          .locator("strong"),
        info,
        "client-count",
      );
      const account = page.getByRole("button", {
        name: "Test account",
        exact: true,
      });
      const add = page.getByRole("button", {
        name: "Add profile",
        exact: true,
      });
      const all = page
        .getByRole("navigation", { name: "Profile type" })
        .getByRole("button", { name: /^All / });
      for (const [label, target] of [
        ["account", account],
        ["add-profile", add],
        ["active-all", all],
      ] as const) {
        await page.mouse.move(0, 0);
        await expectRenderedContrast(target, info, `${label}-rest`);
        await target.hover();
        await expectRenderedContrast(target, info, `${label}-hover`);
        await tabTo(page, target);
        await expectFocusEvidence(target, info);
        await expectRenderedContrast(target, info, `${label}-focus`);
      }
      await tabTo(page, profile);
      await expectFocusEvidence(profile, info);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
      await info.attach("accessible-profile-name", {
        body: await profile.ariaSnapshot(),
        contentType: "text/plain",
      });
      isolated();
    });
  }
}

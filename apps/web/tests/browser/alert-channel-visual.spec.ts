import { test, expect } from "@playwright/test";
import { installAlertChannels, openAlerts } from "./alert-channel-helpers";

for (const theme of ["light", "dark"] as const)
  for (const viewport of [
    { name: "desktop", width: 1440, height: 1650 },
    { name: "phone", width: 390, height: 2200 },
  ])
    test(`${viewport.name} ${theme} alert controls match the authored Figma fields and remain keyboard reachable`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize(viewport);
      await page.emulateMedia({ colorScheme: theme });
      const { unexpected } = await installAlertChannels(page, "intelligence");
      const dialog = await openAlerts(page, "intelligence");
      if (viewport.name === "phone") {
        await dialog
          .getByRole("button", {
            name: "Request verification code",
            exact: true,
          })
          .click();
        await dialog
          .getByLabel("Verification code", { exact: true })
          .fill("123456");
      }
      await page.evaluate(() => document.fonts.ready);
      const bounds = await dialog.boundingBox();
      expect(bounds!.width).toBe(Math.min(720, viewport.width - 32));
      expect(
        await dialog.evaluate((node) => node.scrollWidth <= node.clientWidth),
      ).toBe(true);
      const section = dialog.getByRole("region", {
        name: "Phone verification",
        exact: true,
      });
      const geometry = await section.evaluate((node) => {
        const style = getComputedStyle(node);
        const heading = node.querySelector("h3")!;
        return {
          top: style.paddingTop,
          gap: style.gap,
          border: style.borderTopWidth,
          font: getComputedStyle(heading).fontFamily,
          size: getComputedStyle(heading).fontSize,
          color: getComputedStyle(heading).color,
          background: getComputedStyle(
            document.querySelector('[role="dialog"]')!,
          ).backgroundColor,
        };
      });
      expect(geometry).toMatchObject({
        top: "20px",
        gap: "12px",
        border: "1px",
        size: "14px",
      });
      expect(geometry.font).toContain("Geist");
      expect(geometry.color).not.toBe(geometry.background);
      const email = await dialog
        .getByLabel("Email address", { exact: true })
        .boundingBox();
      const phone = await dialog
        .getByLabel("Phone number", { exact: true })
        .boundingBox();
      if (viewport.name === "desktop")
        expect(Math.abs(email!.y - phone!.y)).toBeLessThan(2);
      else expect(phone!.y).toBeGreaterThan(email!.y + email!.height);
      await dialog
        .getByRole("button", { name: "Send test alert", exact: true })
        .focus();
      await expect(
        dialog.getByRole("button", { name: "Send test alert", exact: true }),
      ).toBeFocused();
      await dialog.screenshot({
        path: testInfo.outputPath(
          `alert-channels-${viewport.name}-${theme}.png`,
        ),
      });
      if (viewport.name === "phone") {
        await page.setViewportSize({ width: 390, height: 844 });
        await dialog
          .getByRole("button", { name: "Cancel", exact: true })
          .scrollIntoViewIfNeeded();
        await expect(
          dialog.getByRole("button", { name: "Cancel", exact: true }),
        ).toBeInViewport();
      }
      await page.keyboard.press("Escape");
      await expect(dialog).not.toBeVisible();
      expect(unexpected).toEqual([]);
    });

import { createRequire } from "node:module";
import { test, expect } from "@playwright/test";
import { clientId, json } from "./fixtures";
import { qaFixtures } from "./portfolio-qa-fixtures";

const require = createRequire(import.meta.url);
const { transform } = require("lightningcss") as typeof import("lightningcss");

for (const width of [390, 1440]) {
  for (const surface of ["Pipeline", "Add profile", "New meeting"]) {
    test(`${surface} minified dialog stays onscreen at ${width}px`, async ({
      page,
    }, info) => {
      const viewport = { width, height: width === 390 ? 844 : 1000 };
      await page.setViewportSize(viewport);
      const unexpected = await qaFixtures(page);
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
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(
        surface === "New meeting"
          ? `/portfolio/${clientId}/calendar`
          : "/portfolio",
      );
      await page
        .getByRole(surface === "Pipeline" ? "link" : "button", {
          name: surface,
          exact: true,
        })
        .click();
      const dialog = page.getByRole("dialog", { name: surface, exact: true });
      await expect(dialog).toBeVisible();
      // Exercise the mounted module with production-style minification, not a
      // compensating browser override that would conceal the duplicate offset.
      const sheet = page.locator(
        'style[data-vite-dev-id$="/shared/portfolio/ui/dialog.module.css"]',
      );
      await expect(sheet).toHaveCount(1);
      const compiled = transform({
        filename: "dialog.css",
        code: Buffer.from((await sheet.textContent()) ?? ""),
        minify: true,
      }).code.toString();
      expect(compiled).toContain("translate:none!important");
      await sheet.evaluate((element, css) => {
        element.textContent = css;
      }, compiled);
      await page.evaluate(async () => {
        await document.fonts.ready;
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        );
      });
      const bounds = await dialog.boundingBox();
      expect(bounds).not.toBeNull();
      if (!bounds) throw new Error("Dialog has no bounds");
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.y).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width + 1);
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height + 1);
      await expect(
        dialog.getByRole("heading", { name: surface, exact: true }),
      ).toBeInViewport();
      await expect(
        dialog.getByRole("button", { name: "Close", exact: true }),
      ).toBeInViewport();
      await info.attach("geometry", {
        body: JSON.stringify({ viewport, bounds }),
        contentType: "application/json",
      });
      await page.screenshot({
        path: info.outputPath(`${surface.replaceAll(" ", "-")}-${width}.png`),
        animations: "disabled",
      });
      await page.keyboard.press("Escape");
      await expect(dialog).toHaveCount(0);
      expect(errors).toEqual([]);
      expect(unexpected).toEqual([]);
    });
  }
}

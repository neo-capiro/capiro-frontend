import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test, expect } from "@playwright/test";
import { clientId, installFixtures } from "./fixtures";

const require = createRequire(import.meta.url);
const { transform } = require("lightningcss") as typeof import("lightningcss");
const cssFile = new URL("../../src/shared/portfolio/ui/dialog.module.css", import.meta.url);
const minify = (css: string) => transform({ filename: "dialog.css", code: Buffer.from(css), minify: true }).code.toString();

test("actual CSS retains the translation reset after minification", () => {
  expect(minify(readFileSync(cssFile, "utf8"))).toContain("translate:none!important");
});

for (const viewport of [{ width: 780, height: 871 }, { width: 390, height: 844 }, { width: 1440, height: 900 }]) {
  for (const populated of [false, true]) {
    test(`minified dialog ${viewport.width}x${viewport.height} ${populated ? "populated" : "empty"}`, async ({ page }, testInfo) => {
      const errors: string[] = [];
      const consoleErrors: { text: string; url: string }[] = [];
      const externalRequests: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push({ text: message.text(), url: message.location().url });
      });
      await page.route("**/*", (route) => {
        const url = new URL(route.request().url());
        if (url.origin === new URL(String(testInfo.project.use.baseURL)).origin) return route.fallback();
        externalRequests.push(url.origin);
        return route.abort();
      });
      const unexpected = await installFixtures(page);
      await page.setViewportSize(viewport);
      await page.goto(`/portfolio/${clientId}/files`);
      await expect(page).toHaveURL(new RegExp(`/portfolio/${clientId}/files$`));
      // Minify the real mounted module, with its actual generated class names.
      // Vite's unminified reset would conceal the production defect.
      const sheet = page.locator('style[data-vite-dev-id$="/shared/portfolio/ui/dialog.module.css"]');
      await expect(sheet).toHaveCount(1);
      const css = minify((await sheet.textContent()) ?? "");
      await sheet.evaluate((element, compiled) => { element.textContent = compiled; }, css);
      await page.getByRole("button", { name: "Create with Meri", exact: true }).click();
      const dialog = page.getByRole("dialog", { name: "Create with Meri", exact: true });
      await expect(dialog).toBeVisible();
      if (populated) {
        await dialog.getByLabel("Title").fill("Synthetic quarterly report");
        await dialog.getByLabel("Starting content").fill("Synthetic document body for layout verification.");
      }
      await page.evaluate(async () => {
        await document.fonts.ready;
        await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      });
      const bounds = await dialog.boundingBox();
      expect(bounds).not.toBeNull();
      if (!bounds) throw new Error("Dialog has no bounds");
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.y).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width);
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height);
      expect(Math.abs(bounds.x + bounds.width / 2 - viewport.width / 2)).toBeLessThanOrEqual(2);
      for (const name of ["Close", "Cancel", "Continue in Meri"]) {
        await expect(dialog.getByRole("button", { name, exact: true })).toBeInViewport();
      }
      await expect(dialog.getByRole("heading", { name: "Create with Meri", exact: true })).toBeInViewport();
      const continueButton = dialog.getByRole("button", { name: "Continue in Meri", exact: true });
      if (populated) await expect(continueButton).toBeEnabled();
      else await expect(continueButton).toBeDisabled();
      expect(errors).toEqual([]);
      expect(externalRequests).toEqual([]);
      expect(unexpected).toEqual([]);
      // Shared fixtures intentionally make optional storage usage unavailable.
      const expected404 = `/api/backend/core/clients/${clientId}/files/storage-usage`;
      expect(consoleErrors.filter((entry) => !(entry.text.includes("404") && new URL(entry.url).pathname === expected404))).toEqual([]);
      await testInfo.attach("layout", { body: JSON.stringify({ viewport, populated, bounds, consoleErrors }), contentType: "application/json" });
      await testInfo.attach("dialog", { body: await page.screenshot({ animations: "disabled" }), contentType: "image/png" });
    });
  }
}

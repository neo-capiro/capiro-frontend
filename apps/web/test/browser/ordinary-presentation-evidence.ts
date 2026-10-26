import {
  expect,
  type Locator,
  type Page,
  type TestInfo,
} from "@playwright/test";
import axe from "axe-core";
import { fileURLToPath } from "node:url";

// The development harness resolves a junctioned dependency outside Vite's
// filesystem allowlist. Fulfil only its existing local font, without changing
// the shared harness or permitting any external requests.
export async function presentationFont(page: Page) {
  await page.route("**/Geist-Variable.woff2", (route) =>
    route.fulfill({
      path: fileURLToPath(
        new URL(
          "../../../../node_modules/geist/dist/fonts/geist-sans/Geist-Variable.woff2",
          import.meta.url,
        ),
      ),
      contentType: "font/woff2",
    }),
  );
}

export async function capturePresentation(
  page: Page,
  info: TestInfo,
  name: string,
  target?: Locator,
) {
  await page.evaluate(() => document.fonts.ready);
  expect(
    await page.evaluate(() => document.fonts.check("14px TestGeist")),
  ).toBe(true);
  const path = info.outputPath(`${name}.png`);
  if (target)
    await target.screenshot({
      path,
      animations: "disabled",
      style: ".test-notice { visibility: hidden; }",
    });
  else await page.screenshot({ path, fullPage: true, animations: "disabled" });
  await info.attach(name, { path, contentType: "image/png" });
}

export async function auditPresentation(
  page: Page,
  info: TestInfo,
  name: string,
  selector: string,
) {
  await page.addScriptTag({ content: axe.source });
  const report = await page.evaluate(
    (selector) =>
      (window as unknown as Window & { axe: typeof axe }).axe.run(selector),
    selector,
  );
  await info.attach(`${name}-axe`, {
    body: JSON.stringify(report, null, 2),
    contentType: "application/json",
  });
  expect(report.violations).toEqual([]);
}

export async function contained(page: Page, target: Locator) {
  const box = await target.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  expect(
    await target.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
  ).toBe(true);
}

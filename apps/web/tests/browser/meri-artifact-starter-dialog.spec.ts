/**
 * Regression test: Create with Meri dialog centering after LightningCSS minification.
 *
 * Root cause (proven): LightningCSS minification merges `translate: none` into the
 * `transform` shorthand and drops it, so `transform: translate(-50%, -50%)` gets
 * overridden by an upstream primitive's `translate` utility at runtime.
 *
 * Fix: `translate: none !important` — preserved verbatim in minified output.
 *
 * Tests:
 * 1. CSS minification RED/GREEN — proves minifier drops plain `translate: none` but
 *    preserves `translate: none !important`.
 * 2. Browser layout — actual MeriArtifactStarterDialog centered and controls visible
 *    at 780x871, 390x844, 1440x900 in empty and populated states.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { test, expect, type Page } from "@playwright/test";
import { clientId, installFixtures } from "./fixtures";

// ---------------------------------------------------------------------------
// lightningcss minification contract (Node.js, no browser required)
// ---------------------------------------------------------------------------

// Resolve appDir from this file's location (ESM-safe: no __dirname in .spec.ts)
const specDir = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(specDir, "../..");
const req = createRequire(path.join(appDir, "package.json"));
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
const { transform } = req("lightningcss") as typeof import("lightningcss");

/** Minify a CSS string under the production-equivalent pipeline. */
function minify(css: string): string {
  return transform({
    filename: "dialog.css",
    code: Buffer.from(css),
    minify: true,
  }).code.toString();
}

const originalCSS = `
.content {
  position: fixed;
  translate: none;
  max-width: none;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  z-index: 51;
}
`;

const fixedCSS = `
.content {
  position: fixed;
  translate: none !important;
  max-width: none;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  z-index: 51;
}
`;

test("RED: original CSS — translate:none is stripped by lightningcss minification", () => {
  const minified = minify(originalCSS);
  // LightningCSS optimises translate+transform into a shorthand, dropping the
  // standalone translate:none reset. The minified output must NOT contain it.
  expect(minified).not.toContain("translate:none");
  // The transform centering must still be present (the translate stripping is
  // the bug — not a transform stripping).
  expect(minified).toContain("transform:translate(-50%,-50%)");
});

test("GREEN: fixed CSS — translate:none!important is preserved by lightningcss minification", () => {
  const minified = minify(fixedCSS);
  // !important prevents the optimizer from merging translate into the shorthand.
  expect(minified).toContain("translate:none!important");
  // The centering transform must still be present too.
  expect(minified).toContain("transform:translate(-50%,-50%)");
});

test("actual dialog.module.css contains translate:none!important (committed fix)", () => {
  const cssPath = path.join(
    appDir,
    "src/shared/portfolio/ui/dialog.module.css",
  );
  const source = readFileSync(cssPath, "utf8");
  expect(source).toContain("translate: none !important");
  // Centering transform must be preserved.
  expect(source).toContain("transform: translate(-50%, -50%)");
  // Rejected Qwen fix (translate3d) must not be present.
  expect(source).not.toContain("translate3d");
});

// ---------------------------------------------------------------------------
// Browser layout tests: actual dialog at real viewports
// ---------------------------------------------------------------------------

const viewports = [
  { name: "780x871", width: 780, height: 871 },
  { name: "390x844", width: 390, height: 844 },
  { name: "1440x900", width: 1440, height: 900 },
] as const;

const evidenceDir = "C:/HermesWork/capiro-resume-20261105/dialog-evidence/final";

async function openMeriStarterDialog(page: Page): Promise<void> {
  // Wait for the "Create with Meri" button (enabled when meri destination is set)
  const btn = page.getByRole("button", {
    name: "Create with Meri",
    exact: true,
  });
  await expect(btn).toBeVisible();
  await expect(btn).toBeEnabled();
  await btn.click();
  const dialog = page.getByRole("dialog", {
    name: "Create with Meri",
    exact: true,
  });
  await expect(dialog).toBeVisible();
}

for (const vp of viewports) {
  test(`dialog bounds and controls visible — empty state ${vp.name}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await installFixtures(page);
    await page.goto(`/portfolio/${clientId}/files`);
    await openMeriStarterDialog(page);

    const dialog = page.getByRole("dialog", {
      name: "Create with Meri",
      exact: true,
    });

    // Controls must be visible and not clipped.
    await expect(
      dialog.getByRole("heading", { name: "Create with Meri", exact: true }),
    ).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: "Close", exact: true }),
    ).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: "Cancel", exact: true }),
    ).toBeVisible();
    // "Continue in Meri" is disabled until a title is entered but must be visible.
    await expect(
      dialog.getByRole("button", { name: "Continue in Meri", exact: true }),
    ).toBeVisible();

    const bounds = await dialog.boundingBox();
    expect(bounds).not.toBeNull();
    if (!bounds) throw new Error("dialog has no rendered bounds");

    // Dialog must be fully within viewport.
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.y).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(vp.width);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(vp.height);

    // Must be horizontally centred (±2 px tolerance for sub-pixel rounding).
    expect(bounds.x + bounds.width / 2).toBeCloseTo(vp.width / 2, 0);

    const screenshotPath = `${evidenceDir}/dialog-empty-${vp.name}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: false });
    testInfo.attach(`dialog-empty-${vp.name}`, {
      path: screenshotPath,
      contentType: "image/png",
    });

    console.log(
      `[${vp.name} empty] x=${bounds.x.toFixed(1)} y=${bounds.y.toFixed(1)} ` +
        `w=${bounds.width.toFixed(1)} h=${bounds.height.toFixed(1)} ` +
        `cx=${(bounds.x + bounds.width / 2).toFixed(1)} vp_cx=${(vp.width / 2).toFixed(1)}`,
    );
  });

  test(`dialog bounds and controls visible — populated state ${vp.name}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await installFixtures(page);
    await page.goto(`/portfolio/${clientId}/files`);
    await openMeriStarterDialog(page);

    const dialog = page.getByRole("dialog", {
      name: "Create with Meri",
      exact: true,
    });

    // Populate the form.
    await dialog.getByLabel("Title").fill("Synthetic quarterly report");
    await dialog
      .getByLabel("Starting content")
      .fill(
        "This is a synthetic document body for layout validation. It adds height to the dialog.",
      );

    // Wait for layout to settle after content changes.
    await page.waitForTimeout(300);

    const bounds = await dialog.boundingBox();
    expect(bounds).not.toBeNull();
    if (!bounds) throw new Error("dialog has no rendered bounds (populated)");

    // Controls remain visible after population.
    await expect(
      dialog.getByRole("heading", { name: "Create with Meri", exact: true }),
    ).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: "Close", exact: true }),
    ).toBeVisible();
    // Continue button should now be enabled (title provided).
    await expect(
      dialog.getByRole("button", { name: "Continue in Meri", exact: true }),
    ).toBeEnabled();

    // Dialog must stay within viewport.
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.y).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(vp.width);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(vp.height);

    // Must remain horizontally centred.
    expect(bounds.x + bounds.width / 2).toBeCloseTo(vp.width / 2, 0);

    const screenshotPath = `${evidenceDir}/dialog-populated-${vp.name}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: false });
    testInfo.attach(`dialog-populated-${vp.name}`, {
      path: screenshotPath,
      contentType: "image/png",
    });

    console.log(
      `[${vp.name} populated] x=${bounds.x.toFixed(1)} y=${bounds.y.toFixed(1)} ` +
        `w=${bounds.width.toFixed(1)} h=${bounds.height.toFixed(1)} ` +
        `cx=${(bounds.x + bounds.width / 2).toFixed(1)} vp_cx=${(vp.width / 2).toFixed(1)}`,
    );
  });
}

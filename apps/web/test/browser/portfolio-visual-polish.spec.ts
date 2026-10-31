import { expect, test } from "@playwright/test";
import {
  clientId,
  prospectId,
  installFixtures,
} from "../../tests/browser/fixtures";

test("Client tab typography, assets and existing capability dialog survive visual polish", async ({
  page,
}, info) => {
  await installFixtures(page);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const [tab, name] of [
    ["objectives", "Objectives"],
    ["calendar", "Test Aerospace calendar"],
    ["relationships", "Relationships"],
    ["capabilities", "Capabilities"],
    ["files", "Client files"],
    ["opportunities", "Opportunities"],
    ["bills", "Bill Tracker"],
    ["work", "Client work"],
  ]) {
    await page.goto(`/portfolio/${clientId}/${tab}`);
    const heading = page.getByRole("heading", { name, exact: true, level: 1 });
    await expect(heading).toBeVisible();
    await expect(heading).toHaveCSS(
      "font-size",
      tab === "work" ? "20px" : "28px",
    );
    await expect(heading).toHaveCSS(
      "line-height",
      tab === "work" ? "26px" : "34px",
    );
    await expect(
      page.getByRole("link", { name: "Search intelligence" }),
    ).toHaveAttribute("href", "/modules/intelligence");
    await expect(
      page.getByRole("link", { name: "Updates", exact: true }),
    ).toHaveAttribute("href", "/meri/updates");
    const assets = await page
      .locator('header nav[aria-label="Global actions"] img')
      .evaluateAll((imgs) =>
        imgs.map((img) => ({
          src: img.getAttribute("src"),
          loaded: (img as HTMLImageElement).naturalWidth > 0,
          width: img.getBoundingClientRect().width,
          height: img.getBoundingClientRect().height,
        })),
      );
    expect(assets).toHaveLength(4);
    for (const asset of assets)
      expect(asset).toMatchObject({ loaded: true, width: 18, height: 18 });
    const staticAssets = page.locator('img[src*="/design/portfolio-34/"]');
    await expect
      .poll(() =>
        staticAssets.evaluateAll((imgs) =>
          imgs.every(
            (img) =>
              (img as HTMLImageElement).complete &&
              (img as HTMLImageElement).naturalWidth > 0,
          ),
        ),
      )
      .toBe(true);
    const geometry = await staticAssets.evaluateAll((imgs) =>
      imgs.map((img) => ({
        src: img.getAttribute("src")!,
        width: img.getBoundingClientRect().width,
        height: img.getBoundingClientRect().height,
      })),
    );
    for (const asset of geometry) {
      const size = asset.src.endsWith("capability-layers.svg")
        ? 20
        : /\/(quick-log|calendar|search|updates)\.svg$/.test(asset.src)
          ? 18
          : 16;
      expect(asset).toMatchObject({ width: size, height: size });
    }
    await info.attach(`${tab}-asset-geometry`, {
      body: JSON.stringify(geometry, null, 2),
      contentType: "application/json",
    });
    await page.screenshot({ path: info.outputPath(`${tab}-1440.png`) });
  }
  await page.goto(`/portfolio/${clientId}/capabilities`);
  const card = page.getByRole("button", {
    name: /Test sensor Synthetic capability/,
  });
  await expect(card).toBeVisible();
  expect((await card.boundingBox())!.height).toBeGreaterThanOrEqual(204);
  await card.click();
  await expect(
    page.getByRole("dialog", { name: "Capability: Test sensor", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(card).toBeFocused();
  expect(errors).toEqual([]);
});

test("Files retain selection and filtering with readable rows", async ({
  page,
}, info) => {
  await installFixtures(page);
  await page.goto(`/portfolio/${clientId}/files`);
  const report = page.getByRole("button", {
    name: "pdf Test report.pdf",
    exact: true,
  });
  await expect(report).toBeVisible();
  const row = page.getByRole("row").filter({ has: report });
  expect((await row.boundingBox())!.height).toBeGreaterThanOrEqual(72);
  await page
    .getByRole("checkbox", { name: "Select Test report.pdf", exact: true })
    .check();
  await expect(
    page.getByRole("checkbox", { name: "Select Test report.pdf", exact: true }),
  ).toBeChecked();
  await page
    .getByRole("textbox", { name: "Search files" })
    .fill("no matching record");
  await expect(report).toHaveCount(0);
  await expect(
    page.getByText("No files match this view.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("textbox", { name: "Search files" }).fill("Test report");
  await expect(report).toBeVisible();
  await page.screenshot({ path: info.outputPath("files-filtered-1440.png") });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: info.outputPath("files-mobile-390.png") });
});

test("Prospect title and overview fit the fixed scrolling shell", async ({
  page,
}, info) => {
  await installFixtures(page);
  await page.goto(`/portfolio/prospects/${prospectId}`);
  await expect(
    page.getByRole("heading", { name: "Test Prospect", exact: true }),
  ).toHaveCSS("font-size", "28px");
  await page.screenshot({ path: info.outputPath("prospect-1440.png") });
  await page.goto(`/portfolio/${clientId}`);
  await expect(
    page.getByRole("region", { name: "Client identity" }),
  ).toBeVisible();
  await page.setViewportSize({ width: 1024, height: 768 });
  const identity = await page
    .getByRole("region", { name: "Client identity" })
    .boundingBox();
  const government = await page
    .getByRole("button", { name: "Government & federal profile" })
    .boundingBox();
  const map = await page
    .getByRole("region", { name: "District nexus", exact: true })
    .boundingBox();
  const pulse = await page
    .getByRole("region", { name: "Engagement pulse" })
    .boundingBox();
  expect(identity!.x).toBe(256);
  expect(identity!.width).toBe(744);
  expect(government!.y).toBeGreaterThan(identity!.y);
  expect(map!.y).toBeGreaterThan(government!.y);
  expect(pulse!.y).toBeGreaterThan(map!.y);
  await page.screenshot({ path: info.outputPath("overview-tablet-1024.png") });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: info.outputPath("overview-mobile-390.png") });
});

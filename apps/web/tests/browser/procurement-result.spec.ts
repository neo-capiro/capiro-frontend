import { test, expect } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

const screenshotDir = "C:/dev/defproc-release1-evidence/ui";
fs.mkdirSync(screenshotDir, { recursive: true });

async function screenshot(page: import("@playwright/test").Page, name: string) {
  const dest = path.join(screenshotDir, `${name}.png`);
  await page.screenshot({ path: dest, fullPage: false });
  return dest;
}

test.describe("ProcurementResult populated 1440x1000", () => {
  test.use({ viewport: { width: 1440, height: 1000 } });

  test("Money Flow view: renders obligation, clocks, groups - no console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    await page.goto("/procurement-result.html?scenario=populated");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText("Observed obligations (USD)")).toBeVisible();
    await expect(page.getByText("Selected procurement action groups")).toBeVisible();
    const overflow = await page.evaluate(() => {
      const root = document.querySelector("[data-portfolio-root]");
      return root ? root.scrollWidth > root.clientWidth : false;
    });
    expect(overflow, "Root overflows horizontally").toBe(false);
    await screenshot(page, "1440x1000-money-flow-populated");
    expect(errors).toEqual([]);
  });

  test("Vendor Footprint view: switch, aggregation, source UEI - no console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    await page.goto("/procurement-result.html?scenario=populated");
    await page.getByRole("button", { name: "Vendor Footprint" }).click();
    await expect(page.getByText("Vendor footprint grouped by source-reported vendor key")).toBeVisible();
    // Source UEI appears in vendor identity column header and cell - use first
    await expect(page.locator("td").filter({ hasText: "Source UEI" }).first()).toBeVisible();
    await expect(page.getByRole("searchbox")).toBeVisible();
    await screenshot(page, "1440x1000-vendor-footprint-populated");
    expect(errors).toEqual([]);
  });

  test("Source coverage disclosures expand in footprint view", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/procurement-result.html?scenario=populated");
    await page.getByRole("button", { name: "Vendor Footprint" }).click();
    await expect(page.getByText("Vendor footprint grouped by source-reported vendor key")).toBeVisible();
    await page.getByText("Source coverage disclosures").click();
    await expect(page.getByText("AWARD A/B/C/D")).toBeVisible();
    await expect(page.getByText("90-day")).toBeVisible();
    await screenshot(page, "1440x1000-vendor-footprint-disclosures");
    expect(errors).toEqual([]);
  });

  test("Fiscal filter FY2025 in vendor footprint - no console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/procurement-result.html?scenario=populated");
    await page.getByRole("button", { name: "Vendor Footprint" }).click();
    await expect(page.getByText("Vendor footprint grouped by source-reported vendor key")).toBeVisible();
    await page.getByRole("button", { name: "FY2025", exact: true }).click();
    await screenshot(page, "1440x1000-vendor-footprint-fy2025");
    expect(errors).toEqual([]);
  });

  test("Paging: pagination navigation present in money flow", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/procurement-result.html?scenario=populated");
    await expect(page.getByRole("navigation", { name: "Procurement group pages" })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("Keyboard: Vendor Footprint button focusable and activatable via Enter", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/procurement-result.html?scenario=populated");
    const vendorBtn = page.getByRole("button", { name: "Vendor Footprint" });
    await vendorBtn.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByText("Vendor footprint grouped by source-reported vendor key")).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("Export button present; modal opens with analyst judgment prompt", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/procurement-result.html?scenario=populated");
    const exportBtn = page.getByRole("button", { name: "Download evidence finding" });
    await expect(exportBtn).toBeVisible();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await exportBtn.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByPlaceholder(/analyst judgment/)).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await screenshot(page, "1440x1000-export-modal");
    expect(errors).toEqual([]);
  });
});

test.describe("ProcurementResult populated 390x844 mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("Money Flow renders without horizontal overflow on mobile", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    await page.goto("/procurement-result.html?scenario=populated");
    await expect(page.getByText("Observed obligations (USD)")).toBeVisible();
    const overflow = await page.evaluate(() => {
      const root = document.querySelector("[data-portfolio-root]");
      return root ? root.scrollWidth > root.clientWidth : false;
    });
    expect(overflow, "Root overflows horizontally on mobile").toBe(false);
    await screenshot(page, "390x844-money-flow-populated");
    expect(errors).toEqual([]);
  });

  test("Vendor Footprint mobile renders without horizontal overflow", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/procurement-result.html?scenario=populated");
    await page.getByRole("button", { name: "Vendor Footprint" }).click();
    await expect(page.getByText("Vendor footprint grouped by source-reported vendor key")).toBeVisible();
    const overflow = await page.evaluate(() => {
      const root = document.querySelector("[data-portfolio-root]");
      return root ? root.scrollWidth > root.clientWidth : false;
    });
    expect(overflow, "Root overflows on mobile in footprint view").toBe(false);
    await screenshot(page, "390x844-vendor-footprint-populated");
    expect(errors).toEqual([]);
  });
});

test.describe("ProcurementResult unavailable state", () => {
  test.use({ viewport: { width: 1440, height: 1000 } });

  test("Unavailable state: no dollar amounts, spending warning visible, no export", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/procurement-result.html?scenario=unavailable");
    await expect(page.getByText("does not mean zero spending")).toBeVisible();
    await expect(page.getByRole("button", { name: "Download evidence finding" })).not.toBeVisible();
    await expect(page.getByRole("button", { name: "Vendor Footprint" })).not.toBeVisible();
    const html = await page.content();
    expect(html).not.toContain("$0");
    await screenshot(page, "1440x1000-unavailable");
    expect(errors).toEqual([]);
  });
});

test.describe("ProcurementResult negative obligations", () => {
  test.use({ viewport: { width: 1440, height: 1000 } });

  test("Negative obligations aggregate correctly in vendor footprint (sign fix)", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/procurement-result.html?scenario=negative");
    await page.getByRole("button", { name: "Vendor Footprint" }).click();
    await expect(page.getByText("Vendor footprint grouped by source-reported vendor key")).toBeVisible();
    // Aggregated total should be -2.00 (= -1.50 + -0.50); sign bug would show -0.50
    const content = await page.textContent("body");
    expect(content).toContain("-$2.00");
    expect(content).not.toContain("-$0.50");
    await screenshot(page, "1440x1000-vendor-footprint-negative");
    expect(errors).toEqual([]);
  });
});

import { expect, test } from "@playwright/test";
import { clientId, installFixtures } from "../../tests/browser/fixtures";

test("Portfolio desktop shell matches Figma rail anchors and keeps its toggle usable", async ({
  page,
}, info) => {
  const unexpected = await installFixtures(page);
  await page.setViewportSize({ width: 1440, height: 1040 });
  await page.goto("/portfolio");

  const toggle = page.getByRole("button", { name: "Toggle sidebar" });
  const rail = page.locator("#portfolio-navigation");
  const nav = rail.getByRole("navigation", { name: "Portfolio" });
  const overview = nav.getByRole("link", { name: "Portfolio Overview" });
  const clients = nav.getByRole("link", { name: "Portfolio Clients" });
  const prospects = nav.getByRole("link", { name: "Portfolio Prospects" });
  await expect(overview).toHaveAttribute("aria-current", "page");
  expect(await toggle.boundingBox()).toMatchObject({
    x: 180,
    y: 16,
    width: 32,
    height: 32,
  });
  expect(await rail.boundingBox()).toMatchObject({
    x: 0,
    y: 65,
    width: 232,
    height: 975,
  });
  const first = await overview.boundingBox();
  const second = await clients.boundingBox();
  const third = await prospects.boundingBox();
  expect(first!.y).toBeGreaterThan(106);
  expect(first!.y).toBeLessThan(109);
  expect(first!.height).toBe(40);
  expect(second!.y - first!.y).toBe(44);
  expect(third!.y - second!.y).toBe(44);
  await page.screenshot({ path: info.outputPath("portfolio-shell-1440.png") });

  await expect(toggle).toHaveAttribute("aria-controls", "portfolio-navigation");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await page.getByRole("link", { name: "Capiro Home" }).focus();
  await page.keyboard.press("Tab");
  await expect(toggle).toBeFocused();
  await expect(toggle).toHaveCSS("outline-style", "solid");
  await page.keyboard.press("Enter");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(rail).toBeVisible();
  expect((await rail.boundingBox())!.width).toBe(72);
  expect((await page.getByRole("main").boundingBox())!.x).toBe(72);
  await expect(toggle).toBeFocused();
  await expect(rail.getByRole("link", { name: "Settings" })).toBeVisible();
  await expect(prospects).toBeVisible();
  await page.screenshot({
    path: info.outputPath("portfolio-shell-collapsed-1440.png"),
  });
  await toggle.press("Enter");
  await expect(rail).toBeVisible();

  await page.goto("/portfolio?type=PROSPECT");
  await expect(prospects).toHaveAttribute("aria-current", "page");
  await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
  await expect(prospects).toHaveAttribute("href", "/portfolio?type=PROSPECT");
  await page.screenshot({
    path: info.outputPath("portfolio-prospects-canonical-1440.png"),
  });
  await page.goBack();
  await expect(overview).toHaveAttribute("aria-current", "page");
  await page.goForward();
  await expect(prospects).toHaveAttribute("aria-current", "page");

  await page.goto(`/portfolio/${clientId}`);
  const divider = rail.locator("hr");
  await expect(divider).toBeVisible();
  const dividerBox = await divider.boundingBox();
  expect(dividerBox!.y).toBeGreaterThan(246);
  expect(dividerBox!.y).toBeLessThan(249);
  await page.screenshot({
    path: info.outputPath("portfolio-client-shell-1440.png"),
  });
  expect(unexpected).toEqual([]);
});

test("Portfolio scroll stays inside main and tablet rail remains reversible", async ({
  page,
}, info) => {
  await installFixtures(page);
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto(`/portfolio/${clientId}`);
  const main = page.getByRole("main");
  const toggle = page.getByRole("button", { name: "Toggle sidebar" });
  const rail = page.locator("#portfolio-navigation");
  await expect(toggle).toBeVisible();
  const initial = await rail.boundingBox();
  await main.evaluate((element) => {
    element.scrollTop = 400;
  });
  expect(await main.evaluate((element) => element.scrollTop)).toBeGreaterThan(
    0,
  );
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  expect(await rail.boundingBox()).toEqual(initial);
  await toggle.focus();
  await toggle.press("Enter");
  expect((await rail.boundingBox())!.width).toBe(72);
  await expect(toggle).toBeFocused();
  await expect(
    rail.getByRole("link", { name: "Files", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath("portfolio-shell-tablet-collapsed.png"),
  });
  await toggle.press("Enter");
  expect((await rail.boundingBox())!.width).toBe(232);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("portfolio-shell-tablet-expanded.png"),
  });
});

test("Portfolio mobile navigation closes on Escape and returns focus", async ({
  page,
}) => {
  await installFixtures(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/portfolio");
  const toggle = page.getByRole("button", { name: "Toggle navigation" });
  const rail = page.locator("#portfolio-navigation");
  await toggle.click();
  await expect(rail).toBeVisible();
  await rail.getByRole("link", { name: "Portfolio Clients" }).focus();
  await page.keyboard.press("Escape");
  await expect(rail).toBeHidden();
  await expect(toggle).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

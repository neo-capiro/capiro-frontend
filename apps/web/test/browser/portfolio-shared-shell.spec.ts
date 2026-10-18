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
  expect(first!.height).toBe(36);
  expect(second!.y - first!.y).toBe(40);
  expect(third!.y - second!.y).toBe(40);
  await page.screenshot({ path: info.outputPath("portfolio-shell-1440.png") });

  await expect(toggle).toHaveAttribute("aria-controls", "portfolio-navigation");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await page.getByRole("link", { name: "Capiro Home" }).focus();
  await page.keyboard.press("Tab");
  await expect(toggle).toBeFocused();
  await expect(toggle).toHaveCSS("outline-style", "solid");
  await page.keyboard.press("Enter");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(rail).toBeHidden();
  expect((await page.getByRole("main").boundingBox())!.x).toBe(0);
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
  expect(dividerBox!.y).toBeGreaterThan(234);
  expect(dividerBox!.y).toBeLessThan(237);
  await page.screenshot({
    path: info.outputPath("portfolio-client-shell-1440.png"),
  });
  expect(unexpected).toEqual([]);
});

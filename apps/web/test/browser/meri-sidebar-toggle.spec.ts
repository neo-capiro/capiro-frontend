import { expect, test, type Page } from "@playwright/test";
import { json } from "../../tests/browser/fixtures";
import { testIdentity } from "./fixtures";
import { openFixtureScreen } from "./meri-fixture-screen-helpers";

async function expectDesktopSidebarToggle(page: Page) {
  const header = page.getByRole("banner");
  const toggle = header.getByRole("button", { name: "Toggle Meri sidebar" });
  const sidebar = page.getByRole("complementary", {
    name: "Meri navigation",
  });
  const main = page.locator("#main-content");
  const box = await toggle.boundingBox();
  expect(box).toBeTruthy();
  expect(Math.abs(box!.x - 180)).toBeLessThanOrEqual(1);
  expect(Math.abs(box!.y - 16)).toBeLessThanOrEqual(1);
  expect(box!.width).toBe(32);
  expect(box!.height).toBe(32);
  await expect(toggle.locator("svg")).toHaveAttribute("width", "18");
  await expect(toggle).toHaveAttribute("aria-controls", "meri-sidebar");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(sidebar).toBeVisible();
  expect((await main.boundingBox())!.x).toBe(232);

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(sidebar).toBeHidden();
  expect((await main.boundingBox())!.x).toBe(0);

  await header.getByRole("link", { name: "Capiro Home" }).focus();
  await page.keyboard.press("Tab");
  await expect(toggle).toBeFocused();
  await expect(toggle).toHaveCSS("outline-style", "solid");
  await page.keyboard.press("Enter");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(sidebar).toBeVisible();
  expect((await main.boundingBox())!.x).toBe(232);

  await page.setViewportSize({ width: 1024, height: 768 });
  await expect(toggle).toBeHidden();
  await expect(sidebar).toBeVisible();
}

test("Figma Home fixture keeps the brand toggle and desktop sidebar geometry", async ({
  page,
}, info) => {
  const finish = await openFixtureScreen(page, info, "home", "light");
  await expectDesktopSidebarToggle(page);
  await finish();
});

test("ordinary Meri route uses the same functional desktop sidebar", async ({
  page,
}) => {
  // The ordinary route resolves the same signed-in identity the shell renders.
  await page.route("**/api/backend/core/me", (route) => json(route, testIdentity));
  await page.route("**/api/capiro/me.read*", (route) =>
    json(route, testIdentity),
  );
  await page.goto("/meri");
  await expectDesktopSidebarToggle(page);
});

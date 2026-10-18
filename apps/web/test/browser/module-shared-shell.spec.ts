import { expect, test } from "@playwright/test";
import { onlyLocalRequests, operationFixtures, testIdentity } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await onlyLocalRequests(page);
  await operationFixtures(page, {
    "me.read": testIdentity,
    "clients.list": [],
    "me.emailSignature.read": { html: null, enabled: false },
  });
  await page.setViewportSize({ width: 1440, height: 1040 });
});

test("ordinary Modules hub keeps its viewport rail and functional desktop toggle", async ({
  page,
}, info) => {
  await page.goto("/modules");
  await expect(page.getByLabel("Client profile scope")).toBeEnabled();

  const header = page.locator("header").first();
  const toggle = page.getByRole("button", { name: "Toggle sidebar" });
  const rail = page.locator("#module-navigation");
  const settings = rail.getByRole("link", { name: "Settings" });
  const headerBox = await header.boundingBox();
  const toggleBox = await toggle.boundingBox();
  const railBox = await rail.boundingBox();
  const settingsBox = await settings.boundingBox();
  expect(headerBox!.height).toBe(65);
  await expect(header).toHaveCSS("border-bottom-width", "1px");
  expect(toggleBox).toMatchObject({ x: 176, y: 16, width: 32, height: 32 });
  expect(railBox).toMatchObject({ x: 0, y: 65, width: 232, height: 975 });
  expect(settingsBox!.y).toBeGreaterThan(970);
  expect(settingsBox!.y + settingsBox!.height).toBeLessThanOrEqual(1040);
  await expect(toggle).toHaveAttribute("aria-controls", "module-navigation");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await info.attach("modules-shell-anchors.json", {
    body: JSON.stringify({ headerBox, toggleBox, railBox, settingsBox }),
    contentType: "application/json",
  });
  await page.screenshot({ path: info.outputPath("modules-shell-1440.png") });

  const scrollRange = await page.evaluate(
    () => document.documentElement.scrollHeight - innerHeight,
  );
  expect(scrollRange).toBeGreaterThan(0);
  await page.evaluate(() =>
    window.scrollTo(0, document.documentElement.scrollHeight),
  );
  expect((await header.boundingBox())!.y).toBe(0);
  expect((await rail.boundingBox())!.y).toBe(65);
  await page.evaluate(() => window.scrollTo(0, 0));

  await page.getByRole("link", { name: "Capiro Home" }).focus();
  await page.keyboard.press("Tab");
  await expect(toggle).toBeFocused();
  await expect(toggle).toHaveCSS("outline-style", "solid");
  await page.keyboard.press("Enter");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(rail).toBeHidden();
  expect((await page.getByRole("main").boundingBox())!.x).toBe(0);
  await page.keyboard.press("Enter");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(settings).toBeVisible();

  await page.setViewportSize({ width: 1440, height: 420 });
  const links = rail.getByRole("navigation", { name: "Modules" });
  expect(
    await links.evaluate(
      (element) => element.scrollHeight > element.clientHeight,
    ),
  ).toBe(true);
  const compactSettingsBox = await settings.boundingBox();
  expect(
    compactSettingsBox!.y + compactSettingsBox!.height,
  ).toBeLessThanOrEqual(420);
  await links.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect(
    links.getByRole("link", { name: "Research portfolios" }),
  ).toBeVisible();

  await page.setViewportSize({ width: 1024, height: 768 });
  await expect(toggle).toBeHidden();
  await expect(rail).toBeVisible();
  expect((await rail.boundingBox())!.width).toBe(72);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Modules menu" }).click();
  await expect(rail.getByRole("link", { name: "Planner" })).toBeVisible();
});

test("ordinary Personal Settings toggle controls the authorized Settings rail", async ({
  page,
}, info) => {
  await page.goto("/settings/personal");
  await expect(page.getByRole("heading", { name: "Personal" })).toBeVisible();
  const toggle = page.getByRole("button", { name: "Toggle sidebar" });
  const rail = page.locator("#settings-navigation");
  await expect(
    rail.getByRole("navigation", { name: "Settings" }),
  ).toBeVisible();
  expect(await rail.boundingBox()).toMatchObject({
    x: 0,
    y: 65,
    width: 232,
    height: 975,
  });
  await expect(toggle).toHaveAttribute("aria-controls", "settings-navigation");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await info.attach("settings-shell-anchors.json", {
    body: JSON.stringify({
      headerBox: await page.locator("header").first().boundingBox(),
      toggleBox: await toggle.boundingBox(),
      railBox: await rail.boundingBox(),
    }),
    contentType: "application/json",
  });
  await page.screenshot({ path: info.outputPath("settings-shell-1440.png") });

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  expect((await rail.boundingBox())!.y).toBe(65);
  await page.evaluate(() => window.scrollTo(0, 0));

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(rail).toBeHidden();
  expect((await page.getByRole("main").boundingBox())!.x).toBe(0);
  await toggle.press("Enter");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(rail.getByRole("link", { name: "All modules" })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(toggle).toBeHidden();
  await expect(page.getByLabel("Settings section")).toBeVisible();
});

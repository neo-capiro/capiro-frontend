import { expect, test, type Page } from "@playwright/test";
import { MANAGEMENT_VERSION } from "@capiro/meri-contracts/conversation-history";
import { json } from "../../tests/browser/fixtures";
import { clientId, setupConversation } from "./meri-conversation-fixtures";
import {
  installCurrentRun,
  installHistory,
  conversation,
  selectedUrl,
} from "./meri-history-fixtures";

test.setTimeout(60_000);
const sidebar = (page: Page) =>
  page.getByRole("complementary", { name: "Meri navigation" });
async function prepare(page: Page) {
  await setupConversation(page);
  await page.addInitScript(() => {
    sessionStorage.setItem("memory-owner-review-enabled", "true");
    sessionStorage.setItem("meri-first-chat-enabled", "true");
  });
  const conversations = Array.from({ length: 20 }, (_, i) => ({
    ...conversation,
    conversationId: `30000000-0000-4000-8000-${String(i + 10).padStart(12, "0")}`,
    createdAt: new Date(
      Date.parse(conversation.createdAt) - i * 60000,
    ).toISOString(),
  }));
  const { native } = await installHistory(page, { conversations });
  await installCurrentRun(page, native);
  await page.route("**/api/conversations/summaries", (route) =>
    json(route, {
      version: MANAGEMENT_VERSION,
      conversations: Array.from({ length: 20 }, (_, i) => ({
        conversationId: `30000000-0000-4000-8000-${String(i + 10).padStart(12, "0")}`,
        title: `Synthetic saved conversation ${i + 1} with a long title to check wrapping`,
        revision: "1",
        scopeKind: "client",
        clientId,
        status: "active",
        updatedAt: conversations[i]!.createdAt,
        archivedAt: null,
        trashedAt: null,
        restoreUntil: null,
        hasTranscript: true,
        canManage: true,
      })),
      nextBefore: null,
    }),
  );
}

for (const width of [681, 1024, 1046, 1100]) {
  test(`tablet ${width}: rail controls fit and Workspace restores full navigation`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await prepare(page);
    await page.goto(`${selectedUrl}&navigation-audit=1`);
    await expect(sidebar(page)).toBeVisible();
    expect((await sidebar(page).boundingBox())!.width).toBe(72);
    const rail = await sidebar(page).boundingBox();
    expect(
      await sidebar(page).evaluate((n) => n.scrollWidth <= n.clientWidth),
    ).toBe(true);
    for (const control of await sidebar(page)
      .locator("button:visible, a:visible")
      .all()) {
      const box = (await control.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(rail!.x);
      expect(box.x + box.width).toBeLessThanOrEqual(rail!.x + rail!.width + 1);
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
    await expect(
      sidebar(page).getByRole("button", { name: /^Approvals/ }),
    ).toBeVisible();
    await expect(
      sidebar(page).getByRole("link", { name: "Preferences", exact: true }),
    ).toBeVisible();
    const trigger = page.getByRole("button", {
      name: "Workspace menu",
      exact: true,
    });
    await trigger.focus();
    await page.keyboard.press("Enter");
    const drawer = page.getByRole("dialog", { name: "Workspace", exact: true });
    await expect(drawer).toBeVisible();
    await expect(
      drawer.getByRole("button", { name: "Close Workspace" }),
    ).toBeFocused();
    expect((await drawer.boundingBox())!.width).toBe(280);
    await expect(
      drawer.getByRole("link", { name: /^Approvals/ }),
    ).toBeVisible();
    await expect(
      drawer.getByRole("heading", { name: "Recent", exact: true }),
    ).toBeAttached();
    await expect(
      drawer.getByRole("link", { name: "All conversations", exact: true }),
    ).toBeAttached();
    await expect(
      drawer.getByRole("link", { name: "Preferences", exact: true }),
    ).toBeInViewport();
    await page.keyboard.press("Shift+Tab");
    expect(
      await drawer.evaluate((n) => n.contains(document.activeElement)),
    ).toBe(true);
    await page.screenshot({ path: info.outputPath(`workspace-${width}.png`) });
    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
    await expect(trigger).toBeFocused();
    await page.screenshot({ path: info.outputPath(`rail-${width}.png`) });
  });
}

test("desktop keeps Preferences outside the scrolling library and retains resize", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await prepare(page);
  await page.goto(`${selectedUrl}&navigation-audit=1`);
  await expect(
    sidebar(page).getByRole("link", {
      name: "Synthetic saved conversation 1 with a long title to check wrapping",
      exact: true,
    }),
  ).toBeVisible();
  const preference = sidebar(page).getByRole("link", {
    name: "Preferences",
    exact: true,
  });
  await expect(preference).toBeInViewport();
  const before = (await preference.boundingBox())!.y;
  const scroll = sidebar(page).locator(
    '[aria-label="Library and recent conversations"]',
  );
  await scroll.hover();
  await page.mouse.wheel(0, 900);
  await expect
    .poll(() => scroll.evaluate((n) => n.scrollTop))
    .toBeGreaterThan(0);
  expect((await preference.boundingBox())!.y).toBe(before);
  await expect(
    sidebar(page).getByRole("link", { name: "All conversations", exact: true }),
  ).toBeAttached();
  const resize = page.getByRole("separator", { name: "Resize Meri sidebar" });
  await resize.focus();
  await page.keyboard.press("ArrowRight");
  await expect(resize).toHaveAttribute("aria-valuenow", "248");
  await page.keyboard.press("Home");
  await scroll.evaluate((n) => {
    n.scrollTop = 0;
  });
  await page.screenshot({ path: info.outputPath("desktop-navigation.png") });
});

test("phone drawer dismisses via backdrop and desktop resize releases modal focus", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await prepare(page);
  await page.goto(`${selectedUrl}&navigation-audit=1`);
  const trigger = page.getByRole("button", {
    name: "Workspace menu",
    exact: true,
  });
  await trigger.click();
  const drawer = page.getByRole("dialog", { name: "Workspace", exact: true });
  await expect(drawer).toBeVisible();
  await expect(
    drawer.getByRole("link", { name: "Preferences", exact: true }),
  ).toBeInViewport();
  await page.screenshot({ path: info.outputPath("phone-workspace.png") });
  await page.mouse.click(350, 400);
  await expect(drawer).toBeHidden();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.setViewportSize({ width: 1101, height: 900 });
  await expect(drawer).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Toggle Meri sidebar" }),
  ).toBeFocused();
});

test("held capabilities keep named explanations inside the short tablet rail", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 500 });
  await prepare(page);
  await page.goto(`${selectedUrl}&capabilities-off=1`);
  await expect(sidebar(page)).toBeVisible();
  expect(
    await sidebar(page).evaluate((n) => n.scrollWidth <= n.clientWidth),
  ).toBe(true);
  const explanation = sidebar(page).getByRole("button", {
    name: /^Approvals unavailable/,
  });
  await explanation.focus();
  await expect(explanation).toBeFocused();
  const rail = (await sidebar(page).boundingBox())!;
  const bounds = (await explanation.boundingBox())!;
  expect(bounds.x).toBeGreaterThanOrEqual(rail.x);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(rail.x + rail.width);
  await expect(
    sidebar(page).getByRole("button", { name: "Approvals", exact: true }),
  ).toBeDisabled();
});

test("dark Workspace portal keeps semantic colors and its footer visible", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await prepare(page);
  await page.goto(`${selectedUrl}&navigation-audit=1`);
  await page
    .getByRole("button", { name: "Workspace menu", exact: true })
    .click();
  const drawer = page.getByRole("dialog", { name: "Workspace", exact: true });
  await expect(drawer).toHaveCSS("color", "rgb(245, 245, 244)");
  await expect(
    drawer.getByRole("link", { name: "Preferences", exact: true }),
  ).toBeInViewport();
  await page.screenshot({ path: info.outputPath("workspace-dark.png") });
  await page.keyboard.press("Escape");
});

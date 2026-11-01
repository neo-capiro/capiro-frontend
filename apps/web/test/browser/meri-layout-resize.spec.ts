import { expect, test, type Page } from "@playwright/test";
import { MANAGEMENT_VERSION } from "@capiro/meri-contracts/conversation-history";
import type { UIEvent } from "@capiro/meri-contracts";
import { json } from "../../tests/browser/fixtures";
import {
  clientId,
  event,
  setupConversation,
  status,
} from "./meri-conversation-fixtures";
import {
  conversation,
  installCurrentRun,
  installHistory,
  selectedUrl,
} from "./meri-history-fixtures";

// The isolated development harness compiles this route on its first request.
test.setTimeout(60_000);

const title =
  "A long synthetic conversation title about committee priorities, appropriations and the next client briefing — " +
  "unbrokentitle".repeat(5);
const sidebar = (page: Page) =>
  page.getByRole("complementary", { name: "Meri navigation" });
const divider = (page: Page) =>
  page.getByRole("separator", { name: "Resize Meri sidebar" });
const composer = (page: Page) =>
  page.getByLabel("Meri message", { exact: true });

async function populated(page: Page) {
  await setupConversation(page);
  const conversations = Array.from({ length: 18 }, (_, index) => ({
    ...conversation,
    conversationId:
      index === 0
        ? conversation.conversationId
        : `30000000-0000-4000-8000-${String(index + 10).padStart(12, "0")}`,
    createdAt: new Date(
      Date.parse(conversation.createdAt) - index * 60000,
    ).toISOString(),
  }));
  const answer = Array.from(
    { length: 60 },
    (_, index) =>
      `Paragraph ${index + 1}. This is synthetic layout evidence. A long conversation must remain readable while the composer and navigation stay reachable.`,
  ).join("\n\n");
  const { native } = await installHistory(page, {
    conversations,
    events: [event(1, answer), status(2, "completed")].map((item) => ({
      sequence: item.sequence,
      event: item as UIEvent,
    })),
  });
  await installCurrentRun(page, native);
  await page.route("**/api/conversations/summaries", (route) =>
    json(route, {
      version: MANAGEMENT_VERSION,
      conversations: conversations.map((row, index) => ({
        conversationId: row.conversationId,
        title:
          index === 0 ? title : `Synthetic saved conversation ${index + 1}`,
        revision: "1",
        scopeKind: "client",
        clientId,
        status: "active",
        updatedAt: row.createdAt,
        archivedAt: null,
        trashedAt: null,
        restoreUntil: null,
        hasTranscript: true,
        canManage: true,
      })),
      nextBefore: null,
    }),
  );
  await page.goto(selectedUrl);
  await expect(
    page.getByRole("log", { name: "Conversation turns" }),
  ).toBeVisible();
  await expect(composer(page)).toBeVisible();
}

test("divider supports pointer, keyboard, limits, cancellation, reload and collapse", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await populated(page);
  const handle = divider(page);
  await expect(handle).toHaveAttribute("aria-valuenow", "232");
  const box = (await handle.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + 100);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 130, box.y + 100);
  await page.mouse.up();
  await expect(handle).toHaveAttribute("aria-valuenow", "362");
  expect((await sidebar(page).boundingBox())!.width).toBe(362);
  await page.reload();
  await expect(handle).toHaveAttribute("aria-valuenow", "362");
  await handle.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(handle).toHaveAttribute("aria-valuenow", "346");
  await page.keyboard.press("End");
  await page.keyboard.press("ArrowRight");
  await expect(handle).toHaveAttribute("aria-valuenow", "480");
  await page.keyboard.press("Home");
  await page.keyboard.press("ArrowLeft");
  await expect(handle).toHaveAttribute("aria-valuenow", "232");
  await page.keyboard.press("Shift+ArrowRight");
  await expect(handle).toHaveAttribute("aria-valuenow", "272");
  const start = (await handle.boundingBox())!;
  await page.mouse.move(start.x + 5, start.y + 100);
  await page.mouse.down();
  await page.mouse.move(start.x + 85, start.y + 100);
  await handle.dispatchEvent("pointercancel", { pointerId: 1 });
  await page.mouse.up();
  await expect(handle).toHaveAttribute("aria-valuenow", "272");
  await page.getByRole("button", { name: "Toggle Meri sidebar" }).click();
  await expect(handle).toHaveCount(0);
  await expect(sidebar(page)).toBeHidden();
  await page.getByRole("button", { name: "Toggle Meri sidebar" }).click();
  await expect(handle).toHaveAttribute("aria-valuenow", "272");
  await page.setViewportSize({ width: 1024, height: 768 });
  await expect(handle).toBeHidden();
  expect((await sidebar(page).boundingBox())!.width).toBe(72);
});

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 1200, height: 720 },
  { width: 390, height: 844 },
]) {
  test(`long transcript and history stay contained at ${viewport.width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize(viewport);
    if (viewport.width === 1200)
      await page.emulateMedia({ colorScheme: "dark" });
    await populated(page);
    await page.screenshot({
      path: info.outputPath(`meri-layout-${viewport.width}-initial.png`),
    });
    const log = page.getByRole("log", { name: "Conversation turns" });
    const scroll = log.locator(":scope > div").first();
    await expect
      .poll(() =>
        scroll.evaluate((node) => node.scrollHeight - node.clientHeight),
      )
      .toBeGreaterThan(1000);
    const bounds = (await composer(page).boundingBox())!;
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(viewport.width);
    expect(
      await page.evaluate(() => document.documentElement.scrollHeight),
    ).toBeLessThanOrEqual(viewport.height + 1);
    await scroll.hover();
    const bottom = await scroll.evaluate((node) => node.scrollTop);
    await page.mouse.wheel(0, -700);
    await expect
      .poll(() => scroll.evaluate((node) => node.scrollTop))
      .toBeLessThan(bottom - 100);
    await page
      .getByRole("button", { name: "Scroll to latest message" })
      .click();
    await expect
      .poll(() =>
        scroll.evaluate(
          (node) => node.scrollHeight - node.clientHeight - node.scrollTop,
        ),
      )
      .toBeLessThan(2);
    if (viewport.width > 1100) {
      const current = sidebar(page).getByRole("link", { name: title });
      await expect(current).toHaveAttribute("aria-current", "page");
      await expect(current).toHaveAttribute("title", title);
      expect(
        await current.evaluate((node) => node.scrollWidth <= node.clientWidth),
      ).toBe(true);
      expect(
        await sidebar(page).evaluate(
          (node) => node.scrollWidth <= node.clientWidth,
        ),
      ).toBe(true);
      await sidebar(page).hover();
      await page.mouse.wheel(0, 900);
      await expect
        .poll(() => sidebar(page).evaluate((node) => node.scrollTop))
        .toBeGreaterThan(0);
      expect(
        await scroll.evaluate(
          (node) => node.scrollHeight - node.clientHeight - node.scrollTop,
        ),
      ).toBeLessThan(2);
      await divider(page).focus();
      await page.keyboard.press("End");
      expect(
        (await page.locator("#main-content").boundingBox())!.width,
      ).toBeGreaterThanOrEqual(600);
      await sidebar(page).evaluate((node) => {
        node.scrollTop = 0;
      });
      await page.screenshot({
        path: info.outputPath(`meri-layout-${viewport.width}-wide.png`),
      });
    } else {
      await expect(sidebar(page)).toBeHidden();
      await expect(divider(page)).toBeHidden();
      await page.getByRole("button", { name: "Workspace menu" }).click();
      const current = page.getByRole("link", { name: title });
      await expect(current).toHaveAttribute("aria-current", "page");
      expect(
        await current.evaluate((node) => node.scrollWidth <= node.clientWidth),
      ).toBe(true);
      await page.getByRole("button", { name: "Workspace menu" }).click();
    }
    await page.screenshot({
      path: info.outputPath(`meri-layout-${viewport.width}.png`),
    });
  });
}

test("blocked preference storage leaves keyboard resizing usable", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new Error("Synthetic blocked storage");
      },
    });
  });
  await populated(page);
  await divider(page).focus();
  await page.keyboard.press("ArrowRight");
  await expect(divider(page)).toHaveAttribute("aria-valuenow", "248");
});

test("short phone window keeps a multiline composer and send control reachable", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 390, height: 500 });
  await populated(page);
  await composer(page).fill(
    Array.from(
      { length: 24 },
      (_, index) => `Unsent synthetic draft line ${index + 1}`,
    ).join("\n"),
  );
  const send = page.getByRole("button", { name: "Send message", exact: true });
  await page.locator("#main-content").hover();
  await page.mouse.wheel(0, 1000);
  await expect
    .poll(async () => {
      const box = (await send.boundingBox())!;
      return box.y + box.height;
    })
    .toBeLessThanOrEqual(500);
  const box = (await send.boundingBox())!;
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(500);
  await send.focus();
  await expect(send).toBeFocused();
  await page.screenshot({
    path: info.outputPath("meri-layout-short-composer.png"),
  });
});

test("invalid saved width falls back and transcript supports keyboard scrolling", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("capiro.meri.sidebar-width", "999999"),
  );
  await populated(page);
  await expect(divider(page)).toHaveAttribute("aria-valuenow", "232");
  const transcript = page.getByRole("region", {
    name: "Conversation transcript",
  });
  const scroll = page
    .getByRole("log", { name: "Conversation turns" })
    .locator(":scope > div")
    .first();
  await transcript.focus();
  await page.keyboard.press("Control+End");
  await expect
    .poll(() => scroll.evaluate((node) => node.scrollTop))
    .toBeGreaterThan(0);
  const start = await scroll.evaluate((node) => node.scrollTop);
  await page.keyboard.press("PageUp");
  await expect
    .poll(() => scroll.evaluate((node) => node.scrollTop))
    .toBeLessThan(start);
});

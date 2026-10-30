import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "@playwright/test";
import { CONVERSATION_SKILLS } from "@capiro/meri-contracts/conversation-application";
import { clientId, setupConversation } from "./meri-conversation-fixtures";
import { installInitialInput } from "./meri-initial-input-fixtures";
import {
  installCurrentRun,
  installHistory,
  selectedUrl,
} from "./meri-history-fixtures";
import { json } from "../../tests/browser/fixtures";
import { currentPreferencesFixture } from "../../tests/meri-user-preferences-fixtures";

const evidence = fileURLToPath(
  new URL(
    "../../../../docs/meri-chat-first-20261030/screenshots/",
    import.meta.url,
  ),
);
mkdirSync(evidence, { recursive: true });
const shot = (name: string) => `${evidence}${name}`;

const composer = (page: Page) =>
  page.getByLabel("Meri message", { exact: true });

/**
 * The healthy empty conversation: admitted identity/client/session plus the canonical not-started
 * history (404 NOT_FOUND), empty conversation list and permitted skill catalog. No mocked failure
 * stands in for the landing state.
 */
async function healthy(page: Page) {
  await setupConversation(page);
  await installInitialInput(page);
  await page.route("**/api/capiro/meri.quickActions.list*", (route) =>
    json(route, {
      version: 1,
      enabled: true,
      skills: CONVERSATION_SKILLS.map((skill) => ({ id: skill.skillId })),
    }),
  );
  await page.route("**/api/settings/user/read*", (route) =>
    json(route, currentPreferencesFixture.read),
  );
}

async function shellReady(page: Page) {
  await expect(page.locator("#main-content")).toBeVisible();
  await expect(composer(page)).toBeVisible();
}

/** The hero: the day's verified quotation, its author and a decoded Meri orb. */
async function heroReady(page: Page) {
  const blockquote = page.getByRole("blockquote");
  await expect(blockquote).not.toBeEmpty();
  await expect(blockquote.locator("footer")).toHaveText(
    /Marcus Aurelius|Epictetus|Seneca/,
  );
  // The source disclosure stays collapsed by default.
  await expect(blockquote.locator("details")).not.toHaveAttribute("open", "");
  const orb = page.locator('img[src="/design/home/meri-orb.png"]');
  await expect(orb).toBeVisible();
  await expect
    .poll(() => orb.evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBe(320);
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByRole("heading", { name: "Meri" })).toHaveCount(1);
}

test("desktop healthy empty conversation: quiet hero, one composer, no failure chrome", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1040 });
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await healthy(page);
  await page.goto(`/meri?clientId=${clientId}`);
  await shellReady(page);
  await heroReady(page);

  // Healthy history is silent: no warning, no permanent manual reload, no browser notice.
  await expect(
    page.getByText("Saved conversation history unavailable"),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Reload saved history", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByText("Browser control")).toHaveCount(0);
  await expect(
    page.getByText(/good morning|good afternoon|welcome/i),
  ).toHaveCount(0);
  await expect(page.getByText("Open Portfolio")).toHaveCount(0);
  // No duplicated landing footer or Library chat duplication.
  await expect(
    page.getByRole("link", { name: "Open task updates" }),
  ).toHaveCount(0);
  const library = page.getByRole("navigation", { name: "Meri workspace" });
  await expect(
    library.getByRole("button", { name: "Conversations", exact: true }),
  ).toHaveCount(0);
  await expect(
    library.getByRole("button", { name: "Runs", exact: true }),
  ).toHaveCount(0);

  // One composer with Attach, Tools, the single scope control and Send.
  await expect(composer(page)).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Attach", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Tools" })).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Verified conversation client",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Send message", exact: true }),
  ).toBeDisabled();
  expect(pageErrors).toEqual([]);

  // Default capture: Source collapsed, initial scroll position.
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await page.screenshot({ path: shot("desktop-new-chat.png") });
});

test("desktop tools: keyboard open, workspace links, skill chip and Escape focus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1040 });
  await healthy(page);
  await page.goto(`/meri?clientId=${clientId}`);
  await shellReady(page);

  const tools = page.getByRole("button", { name: "Tools" });
  await tools.focus();
  await page.keyboard.press("Enter");
  const panel = page.getByRole("dialog", { name: "Tools" });
  await expect(panel).toBeVisible();

  // The real workspaces stay reachable as secondary navigation on their canonical routes; which
  // of them are enabled follows the deployment's own capability state.
  const workspaceLinks = panel
    .getByRole("navigation", { name: "Meri workspaces" })
    .getByRole("link");
  expect(await workspaceLinks.count()).toBeGreaterThan(0);
  for (const link of await workspaceLinks.all())
    await expect(link).toHaveAttribute(
      "href",
      /^\/meri\/(actions|task-updates|runs|memory)/,
    );
  // No invented workspace-wide approvals inbox.
  await expect(panel.getByRole("link", { name: "Approvals" })).toHaveCount(0);

  // Desktop keeps the composer usable while the non-modal panel is open.
  await composer(page).fill("Draft stays editable");
  await expect(composer(page)).toHaveValue("Draft stays editable");
  await page.screenshot({ path: shot("desktop-tools-open.png") });

  // One selection becomes a compact removable chip carried by the next message.
  await panel.getByText("Skill · None").click();
  await panel.locator("select").first().selectOption({ index: 1 });
  await panel.getByRole("button", { name: "Apply to draft" }).click();
  const chip = page.getByRole("button", { name: /^Remove / });
  await expect(chip).toBeVisible();
  await chip.click();
  await expect(page.getByRole("button", { name: /^Remove / })).toHaveCount(0);

  await page.keyboard.press("Escape");
  await expect(panel).toHaveCount(0);
  await expect(tools).toBeFocused();
  await expect(composer(page)).toHaveValue("Draft stays editable");
});

test("a failed history read stays explicit with its retry, and is not an empty chat", async ({
  page,
}) => {
  // setupConversation alone answers the native reads with an explicit 503.
  await setupConversation(page);
  await page.goto(`/meri?clientId=${clientId}`);
  await shellReady(page);
  await expect(
    page.getByText("Saved conversation history unavailable"),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Reload saved history", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("blockquote")).toHaveCount(0);
});

test("existing conversation keeps its transcript and never shows the empty-chat hero", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1040 });
  await setupConversation(page);
  const { native } = await installHistory(page);
  await installCurrentRun(page, native);
  await page.goto(selectedUrl);
  await expect(page.getByText("First answer", { exact: true })).toBeVisible();
  await shellReady(page);
  await expect(page.getByRole("blockquote")).toHaveCount(0);
  await expect(
    page.locator('img[src="/design/home/meri-orb.png"]'),
  ).toHaveCount(0);
  await expect(
    page.getByText("Saved conversation history loaded."),
  ).toBeVisible();
  await page.screenshot({ path: shot("desktop-existing-conversation.png") });
});

for (const width of [390, 320]) {
  test(`phone ${width}px: hero and composer fit the initial viewport without overflow`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await healthy(page);
    await page.goto(`/meri?clientId=${clientId}`);
    await shellReady(page);
    await heroReady(page);

    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    // The landing is composed in the initial viewport: the composer is not below the fold.
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    const composerBox = await composer(page).boundingBox();
    const orbBox = await page
      .locator('img[src="/design/home/meri-orb.png"]')
      .boundingBox();
    expect(composerBox).toBeTruthy();
    expect(orbBox).toBeTruthy();
    expect(orbBox!.y + orbBox!.height).toBeLessThanOrEqual(composerBox!.y);
    expect(composerBox!.y + composerBox!.height).toBeLessThanOrEqual(844);
    if (width === 390)
      await page.screenshot({ path: shot("phone-new-chat.png") });

    // The sheet keeps the composer usable and dismisses with Escape.
    await page.getByRole("button", { name: "Tools" }).click();
    const panel = page.getByRole("dialog", { name: "Tools" });
    await expect(panel).toBeVisible();
    await expect(composer(page)).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    if (width === 390)
      await page.screenshot({ path: shot("phone-tools-open.png") });
    await page.keyboard.press("Escape");
    await expect(panel).toHaveCount(0);
  });
}

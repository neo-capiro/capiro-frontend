import { test, expect, type Page } from "@playwright/test";
import {
  clientId,
  composer,
  history,
  reply,
  sendButton,
  setupConversation,
} from "./meri-conversation-fixtures";

/**
 * VQA-029. Retained B010-06 evidence: one own-synthetic draft, entered once on a fresh client
 * profile and opened once, rendered as an increasing number of identical "Client profile draft"
 * cards in Meri (7 at capture, 8 at the DOM check, 10 after one Dismiss), and one Dismiss removed
 * nothing. The cause was the two admitted-handoff siblings in the composer sharing one React key:
 * every composer render re-mounted the pair and left one more card behind. These tests drive the
 * real profile producer and the real Meri route, so such a re-mount shows up as an extra section.
 */
const draftText = "Synthetic unsent scope-navigation QA.";
const cards = (page: Page) =>
  page.getByRole("region", { name: "Client profile draft", exact: true });

/** The client profile's own dialog writes the record before the soft navigation into Meri. */
async function openReviewedDraft(page: Page) {
  await page.goto(`/__test/client-handoff?clientId=${clientId}`);
  await expect(page.getByLabel("Your initial message")).toBeEnabled();
  await page.getByLabel("Your initial message").fill(draftText);
  await page.getByRole("button", { name: "Open draft in Meri" }).click();
  await expect(page).toHaveURL(new RegExp(`/meri\\?clientId=${clientId}`));
  await expect(
    page.getByRole("heading", { name: "Conversation", exact: true }),
  ).toBeVisible();
}

/** No client draft may reach the conversation without an explicit send. */
async function countSubmits(page: Page) {
  const submits: unknown[] = [];
  await page.route("**/api/conversations/submit", (route) => {
    submits.push(route.request().postDataJSON());
    return route.abort();
  });
  return submits;
}

test.beforeEach(async ({ page }) => {
  await setupConversation(page);
  await page.route("**/api/conversations/history", (route) =>
    reply(route, history([], { state: "running" })),
  );
});

test("one reviewed client draft stays one card and is adopted only when used", async ({
  page,
}) => {
  const submits = await countSubmits(page);
  await openReviewedDraft(page);
  await expect(cards(page)).toHaveCount(1);
  await expect(cards(page)).toContainText(draftText);
  // The retained incident grew while nothing was clicked; a passive wait adds no section.
  await page.waitForTimeout(5_000);
  await expect(cards(page)).toHaveCount(1);
  await expect(composer(page)).toHaveValue("");
  await expect(sendButton(page)).toBeDisabled();
  expect(submits).toEqual([]);
  // The draft is only a draft: using it fills the box and still sends nothing.
  await page.getByRole("button", { name: "Use reviewed draft" }).click();
  await expect(composer(page)).toHaveValue(draftText);
  await expect(cards(page)).toHaveCount(0);
  expect(submits).toEqual([]);
});

test("one Dismiss removes the single card and it does not return on reload", async ({
  page,
}) => {
  const submits = await countSubmits(page);
  await openReviewedDraft(page);
  await expect(cards(page)).toHaveCount(1);
  await page
    .getByRole("button", { name: "Dismiss client draft", exact: true })
    .click();
  await expect(cards(page)).toHaveCount(0);
  await expect(composer(page)).toHaveValue("");
  await page.waitForTimeout(2_000);
  await expect(cards(page)).toHaveCount(0);
  // The record itself is retired, not just this presentation's local copy.
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Conversation", exact: true }),
  ).toBeVisible();
  await page.waitForTimeout(2_000);
  await expect(cards(page)).toHaveCount(0);
  expect(submits).toEqual([]);
});

test("a current nonempty draft keeps the reviewed draft unusable until it is cleared", async ({
  page,
}) => {
  const submits = await countSubmits(page);
  await openReviewedDraft(page);
  await expect(cards(page)).toHaveCount(1);
  await composer(page).fill("Text I am still writing");
  const use = page.getByRole("button", { name: "Use reviewed draft" });
  await expect(use).toBeDisabled();
  await expect(
    page.getByText(
      "Keep or clear your current draft before using this message.",
      { exact: true },
    ),
  ).toBeVisible();
  await composer(page).fill("");
  await expect(use).toBeEnabled();
  await expect(composer(page)).toHaveValue("");
  expect(submits).toEqual([]);
});

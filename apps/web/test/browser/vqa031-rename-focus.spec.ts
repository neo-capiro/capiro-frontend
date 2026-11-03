import { test, expect, type ElementHandle, type Page } from "@playwright/test";

/**
 * VQA-031: selected-row Rename dialog focus return after keyboard dismissal.
 * Retained B012-A01 evidence: Escape closed the Rename dialog without Save and the passive observation
 * then found focus on BODY while the same selected-row Rename control was still visible. These tests
 * mount the real `SelectedConversationActions` owner (the real Rename button plus the real
 * `RenameConversationDialog`/`MeriDialog`/Radix composition) on one synthetic selected row and assert
 * return to the exact still-mounted, visible, enabled trigger. Fixtures are synthetic; no live app,
 * authentication, backend or provider is contacted.
 */
const url = "/vqa031-rename-focus.html";
const revised = "Synthetic revised title";
const trigger = (page: Page) =>
  page.getByRole("button", { name: "Rename", exact: true });
const renameDialog = (page: Page) =>
  page.getByRole("dialog", { name: "Rename conversation" });
const title = (page: Page) => page.getByLabel("Title", { exact: true });
const save = (page: Page) =>
  page.getByRole("button", { name: "Save title", exact: true });
const bodyHasFocus = (page: Page) =>
  page.evaluate(() => document.activeElement === document.body);
const focusedInsideDialog = (page: Page) =>
  page.evaluate(() => {
    const panel = document.querySelector('[role="dialog"]');
    return Boolean(
      panel && document.activeElement && panel.contains(document.activeElement),
    );
  });

/**
 * Harness state controls are outside the modal, which Radix marks aria-hidden while a dialog is open.
 * These clicks therefore drive the harness's own synthetic state directly instead of the product UI.
 */
const harnessClick = (page: Page, label: string) =>
  page.evaluate((name) => {
    const controls = document.querySelectorAll<HTMLElement>(
      '[aria-label="Synthetic harness controls"] button',
    );
    const control = Array.from(controls).find(
      (node) => node.textContent?.trim() === name,
    );
    if (!control) throw new Error(`Missing synthetic harness control: ${name}`);
    control.click();
  }, label);

/** The trigger is still mounted but its area is hidden while the read is not current. */
const hiddenFromLayout = (handle: ElementHandle<Element> | null) =>
  handle?.evaluate(
    (node) => node.isConnected && node.getClientRects().length === 0,
  );

/** Keyboard open: focus the real selected-row Rename control and press Enter. */
async function openWithKeyboard(page: Page) {
  const button = trigger(page);
  await expect(button).toBeEnabled();
  await button.focus();
  const opener = await button.elementHandle();
  expect(opener).not.toBeNull();
  await page.keyboard.press("Enter");
  await expect(renameDialog(page)).toBeVisible();
  await expect(title(page)).toBeFocused();
  return opener;
}

/** Records every product request; these cases must never send one. */
async function recordRequests(page: Page) {
  const requests: string[] = [];
  await page.route("**/api/**", async (route) => {
    requests.push(route.request().url());
    await route.abort();
  });
  return requests;
}

test("VQA-031 Escape returns focus to the same selected-row Rename trigger and keeps the draft", async ({
  page,
}) => {
  await page.goto(url);
  const requests = await recordRequests(page);
  const opener = await openWithKeyboard(page);
  await expect(save(page)).toBeDisabled();
  await title(page).fill(revised);
  await expect(save(page)).toBeEnabled();
  for (let press = 0; press < 6; press++) {
    await page.keyboard.press("Tab");
    expect(await focusedInsideDialog(page)).toBe(true);
  }
  for (let press = 0; press < 3; press++) {
    await page.keyboard.press("Shift+Tab");
    expect(await focusedInsideDialog(page)).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(renameDialog(page)).toBeHidden();
  expect(
    await page.evaluate(
      (node) => Boolean(node?.isConnected) && document.activeElement === node,
      opener,
    ),
  ).toBe(true);
  // No Save happened: nothing was sent, and the local unsaved draft still follows the dialog policy.
  expect(requests).toEqual([]);
  await page.keyboard.press("Enter");
  await expect(renameDialog(page)).toBeVisible();
  await expect(title(page)).toHaveValue(revised);
  await expect(title(page)).toBeFocused();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(renameDialog(page)).toBeHidden();
  expect(
    await page.evaluate(
      (node) => Boolean(node?.isConnected) && document.activeElement === node,
      opener,
    ),
  ).toBe(true);
  expect(requests).toEqual([]);
});

test("VQA-031 the dialog close control also returns focus to the Rename trigger", async ({
  page,
}) => {
  await page.goto(url);
  const opener = await openWithKeyboard(page);
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await expect(renameDialog(page)).toBeHidden();
  expect(
    await page.evaluate(
      (node) => Boolean(node?.isConnected) && document.activeElement === node,
      opener,
    ),
  ).toBe(true);
});

test("VQA-031 losing read currentness closes the dialog without stale focus", async ({
  page,
}) => {
  await page.goto(url);
  const opener = await openWithKeyboard(page);
  await harnessClick(page, "Toggle current read");
  await expect(renameDialog(page)).toBeHidden();
  expect(await hiddenFromLayout(opener)).toBe(true);
  expect(
    await page.evaluate((node) => document.activeElement === node, opener),
  ).toBe(false);
  expect(await bodyHasFocus(page)).toBe(true);
});

test("VQA-031 a disabled trigger is refused and later eligibility still returns focus", async ({
  page,
}) => {
  await page.goto(url);
  const opener = await openWithKeyboard(page);
  await harnessClick(page, "Toggle access");
  expect(
    await opener?.evaluate((node) => (node as HTMLButtonElement).disabled),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(renameDialog(page)).toBeHidden();
  expect(
    await page.evaluate((node) => document.activeElement === node, opener),
  ).toBe(false);
  expect(await bodyHasFocus(page)).toBe(true);
  await harnessClick(page, "Toggle access");
  await expect(trigger(page)).toBeEnabled();
  await openWithKeyboard(page);
  await page.keyboard.press("Escape");
  await expect(renameDialog(page)).toBeHidden();
  expect(
    await page.evaluate(
      (node) => Boolean(node?.isConnected) && document.activeElement === node,
      await trigger(page).elementHandle(),
    ),
  ).toBe(true);
});

test("VQA-031 a replaced selected row does not receive focus for the closed dialog", async ({
  page,
}) => {
  await page.goto(url);
  const opener = await openWithKeyboard(page);
  await harnessClick(page, "Replace selected row");
  await expect(renameDialog(page)).toBeHidden();
  const replacement = trigger(page);
  await expect(replacement).toBeEnabled();
  expect(
    await page.evaluate((node) => Boolean(node?.isConnected), opener),
  ).toBe(false);
  expect(
    await replacement.evaluate((node) => document.activeElement === node),
  ).toBe(false);
  expect(await bodyHasFocus(page)).toBe(true);
});

test("VQA-031 a replaced account does not receive focus for the closed dialog", async ({
  page,
}) => {
  await page.goto(url);
  const opener = await openWithKeyboard(page);
  await harnessClick(page, "Replace signed-in account");
  await expect(renameDialog(page)).toBeHidden();
  const replacement = trigger(page);
  await expect(replacement).toBeEnabled();
  expect(
    await page.evaluate((node) => Boolean(node?.isConnected), opener),
  ).toBe(false);
  expect(
    await replacement.evaluate((node) => document.activeElement === node),
  ).toBe(false);
  expect(await bodyHasFocus(page)).toBe(true);
});

test("VQA-031 a dialog without an explicit opener keeps its captured-trigger behaviour", async ({
  page,
}) => {
  await page.goto(url);
  const remove = page.getByRole("button", { name: "Delete", exact: true });
  const opener = await remove.elementHandle();
  expect(opener).not.toBeNull();
  await remove.click();
  const confirm = page.getByRole("dialog", {
    name: "Delete this conversation?",
  });
  await expect(confirm).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(confirm).toBeHidden();
  expect(
    await page.evaluate(
      (node) => Boolean(node?.isConnected) && document.activeElement === node,
      opener,
    ),
  ).toBe(true);
});

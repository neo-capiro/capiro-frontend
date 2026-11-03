/**
 * SOURCE STAGE ONLY mounted proof of the native procedure picker. Runs through
 * playwright.procedure-stage.config.ts against tests/browser/procedure-selection.tsx, which mounts
 * the real SessionComposer (the product mount path) inside the product's own Capiro data provider,
 * with only the boundary answer for GET /clio/procedure-catalog stubbed. No session, account, model
 * or network call is used.
 *
 * The contract these cases pin is the one Skill already has: a choice made in the panel is local
 * until Apply to draft, so it never becomes the composer's applied selection or chip by itself, and
 * Escape keeps the panel's own close/focus behaviour while an unapplied choice leaves with the panel.
 */
import { expect, test, type Page } from "@playwright/test";

/** The control's own standing help line, so it can be found even when nothing can be listed. */
const picker = (page: Page) =>
  page
    .locator("details")
    .filter({ hasText: "A procedure shapes how Meri handles" });
const list = (page: Page) =>
  picker(page).getByLabel("Procedure for the next message");
const apply = (page: Page) =>
  picker(page).getByRole("button", { name: "Apply to draft" });
const applied = (page: Page) => page.getByLabel("Applied selection");
/** The composer chip's own remove control is the visible proof that a chip exists. */
const chip = (page: Page) =>
  page.getByRole("button", { name: /^Remove Procedure ·/ });
const optionValue = async (page: Page, text: string) =>
  (await list(page)
    .locator("option")
    .filter({ hasText: text })
    .first()
    .getAttribute("value"))!;

test("stages a keyboard choice, and only Apply commits it", async ({
  page,
}) => {
  await page.goto("/procedure-selection.html");
  await expect(
    page.getByRole("button", { name: "Send message" }),
  ).toBeVisible();
  await expect(picker(page)).toHaveCount(1);
  await expect(picker(page).locator("summary")).toHaveText(
    /Procedure · No procedure/,
  );
  // Keyboard-only: the summary opens the control, the select takes the choice.
  await picker(page).locator("summary").focus();
  await page.keyboard.press("Enter");
  await expect(picker(page)).toHaveAttribute("open", "");
  await expect(list(page).locator("optgroup")).toHaveCount(2);
  await expect(list(page).locator("option")).toHaveCount(8);
  await expect(
    list(page).locator("option").filter({ hasText: "Case brief · client" }),
  ).toHaveCount(1);
  await expect(apply(page)).toBeDisabled();
  await list(page).focus();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  // The keyboard choice is staged only: the applied selection, the summary and the chip stay empty.
  await expect(applied(page)).toHaveText("{}");
  await expect(picker(page).locator("summary")).toHaveText(
    /Procedure · No procedure/,
  );
  await expect(chip(page)).toHaveCount(0);
  await expect(list(page)).toHaveValue(await optionValue(page, "Briefing"));
  await expect(picker(page)).toContainText("Not applied yet");
  await expect(apply(page)).toBeEnabled();
  await apply(page).click();
  await expect(applied(page)).toContainText(
    '"procedure":{"source":"builtin","id":"briefing"',
  );
  await expect(picker(page).locator("summary")).toHaveText(
    /Procedure · Briefing/,
  );
  await expect(chip(page)).toHaveCount(1);
  await expect(picker(page)).toContainText("Available for general");
  await expect(picker(page)).not.toContainText("Not applied yet");
  await expect(apply(page)).toBeDisabled();
  // The exact selector stays the value and the applied request, never the visible label.
  await expect(picker(page)).not.toContainText("builtin:briefing");
  await expect(picker(page).getByRole("alert")).toHaveCount(0);
  // Staging the empty option removes the applied choice the same explicit way.
  await list(page).selectOption("");
  await expect(chip(page)).toHaveCount(1);
  await apply(page).click();
  await expect(applied(page)).toHaveText("{}");
  await expect(chip(page)).toHaveCount(0);
  await expect(picker(page).locator("summary")).toHaveText(
    /Procedure · No procedure/,
  );
  // The changed layout is the one new visual surface this lane adds, so keep a current capture.
  await page.screenshot({ path: "test-results/procedure-picker-mounted.png" });
});

test("Escape closes the panel and drops only the unapplied choice", async ({
  page,
}) => {
  await page.goto("/procedure-selection.html");
  await picker(page).locator("summary").click();
  await list(page).selectOption(await optionValue(page, "Briefing"));
  await apply(page).click();
  await expect(applied(page)).toContainText('"id":"briefing"');
  // Stage a different procedure, then leave the way the owner already allows: Escape from the panel.
  await list(page).selectOption(await optionValue(page, "Draft"));
  await expect(picker(page)).toContainText("Not applied yet");
  await expect(applied(page)).toContainText('"id":"briefing"');
  await page.keyboard.press("Escape");
  // SessionTools' own contract: close, then focus back to the composer's Tools control.
  await expect(page.locator("#meri-tools-button")).toBeFocused();
  await expect(picker(page)).toHaveCount(0);
  await expect(applied(page)).toContainText('"id":"briefing"');
  // Reopening starts from what is applied; the abandoned choice is gone, never committed later.
  await page.locator("#meri-tools-button").click();
  await expect(picker(page)).toHaveCount(1);
  await picker(page).locator("summary").click();
  await expect(picker(page)).toHaveAttribute("open", "");
  await expect(picker(page).locator("summary")).toHaveText(
    /Procedure · Briefing/,
  );
  await expect(list(page)).toHaveValue(await optionValue(page, "Briefing"));
  await expect(apply(page)).toBeDisabled();
  await expect(applied(page)).toContainText('"id":"briefing"');
});

test("keeps the canonical mutual exclusion between the static skill and the procedure", async ({
  page,
}) => {
  await page.goto("/procedure-selection.html");
  await picker(page).locator("summary").click();
  const draft = await optionValue(page, "draft");
  await list(page).selectOption(draft);
  await expect(applied(page)).toHaveText("{}");
  await apply(page).click();
  await expect(applied(page)).toContainText('"source":"builtin","id":"draft"');
  // Choosing a skill is the canonical receiver's own rule: the two are mutually exclusive.
  const skill = page
    .locator("details")
    .filter({ hasText: "Skill for next message" });
  await skill.locator("summary").click();
  await skill.locator("select").first().selectOption({ index: 1 });
  await skill.getByRole("button", { name: "Apply to draft" }).click();
  await expect(applied(page)).toContainText('"skill"');
  await expect(applied(page)).not.toContainText('"procedure"');
  await expect(picker(page).locator("summary")).toHaveText(
    /Procedure · No procedure/,
  );
  // Choosing the procedure again is exactly one choice: the skill pin leaves with it.
  await list(page).selectOption(draft);
  await apply(page).click();
  await expect(applied(page)).toContainText('"procedure"');
  await expect(applied(page)).not.toContainText('"skill"');
});

test("retires a chosen procedure the refreshed catalog no longer lists exactly", async ({
  page,
}) => {
  await page.goto("/procedure-selection.html?scenario=retire-on-refresh");
  await picker(page).locator("summary").click();
  await list(page).selectOption(await optionValue(page, "briefing"));
  await apply(page).click();
  await expect(applied(page)).toContainText(
    '"procedure":{"source":"builtin","id":"briefing"',
  );
  await expect(picker(page).locator("summary")).toHaveText(
    /Procedure · Briefing/,
  );
  // The refreshed catalog carries briefing at version 2 and no firm row: the applied choice leaves.
  await picker(page)
    .getByRole("button", { name: "Refresh the catalog" })
    .click();
  await expect(applied(page)).not.toContainText('"procedure"');
  await expect(picker(page).getByRole("alert")).toContainText(
    "no longer offered to this account",
  );
  await expect(list(page).locator("option")).toHaveCount(7);
  await expect(
    list(page).locator("option").filter({ hasText: "Case brief" }),
  ).toHaveCount(0);
});

test("drops a staged choice the refreshed catalog no longer lists, without applying it", async ({
  page,
}) => {
  await page.goto("/procedure-selection.html?scenario=retire-on-refresh");
  await picker(page).locator("summary").click();
  // The firm procedure exists only in the first catalog: staging it and then refreshing leaves
  // nothing to apply over, and it never becomes the applied selection.
  await list(page).selectOption(await optionValue(page, "Case brief"));
  await expect(picker(page)).toContainText("Not applied yet");
  await expect(applied(page)).toHaveText("{}");
  await picker(page)
    .getByRole("button", { name: "Refresh the catalog" })
    .click();
  await expect(picker(page).getByRole("alert")).toContainText(
    "no longer offered to this account",
  );
  await expect(picker(page)).not.toContainText("Not applied yet");
  await expect(apply(page)).toBeDisabled();
  await expect(applied(page)).toHaveText("{}");
  await expect(list(page)).toHaveValue("");
});

test("lists nothing when the catalog is another tenant's or is not the reviewed shape", async ({
  page,
}) => {
  for (const [scenario, message] of [
    ["foreign", "different tenant"],
    ["malformed", "expected shape"],
  ] as const) {
    await page.goto(`/procedure-selection.html?scenario=${scenario}`);
    await picker(page).locator("summary").click();
    await expect(picker(page).getByRole("alert")).toContainText(message);
    await expect(list(page)).toHaveCount(0);
    await expect(picker(page).locator("summary")).toHaveText(
      /Procedure · No procedure/,
    );
    await expect(applied(page)).toHaveText("{}");
  }
});

test("drops a late answer that belongs to a previous scope lifetime", async ({
  page,
}) => {
  await page.goto("/procedure-selection.html?scenario=late");
  await picker(page).locator("summary").click();
  await expect(picker(page)).toContainText(
    "Loading the current procedure catalog",
  );
  // The account's client scope changes: the read for the old lifetime answers only after this point.
  await page.getByRole("button", { name: "Switch scope" }).click();
  await expect(list(page).locator("option")).toHaveCount(7);
  await page.waitForTimeout(400);
  await expect(list(page).locator("option")).toHaveCount(7);
  await expect(
    list(page).locator("option").filter({ hasText: "Case brief" }),
  ).toHaveCount(0);
  await expect(applied(page)).toHaveText("{}");
});

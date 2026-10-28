/**
 * SOURCE STAGE ONLY mounted proof of the native procedure picker. Runs through
 * playwright.work-stage.config.ts against tests/browser/procedure-selection.tsx, which mounts the real
 * SessionComposer (the product mount path) inside the product's own Capiro data provider, with only
 * the boundary answer for GET /clio/procedure-catalog stubbed. No session, account, model or network
 * call is used.
 */
import { expect, test, type Page } from "@playwright/test";

/** The control's own standing help line, so it can be found even when nothing can be listed. */
const picker = (page: Page) =>
  page
    .locator("details")
    .filter({ hasText: "A procedure is a named native capability" });
const list = (page: Page) =>
  picker(page).getByLabel("Procedure for the next message");
const applied = (page: Page) => page.getByLabel("Applied selection");
const optionValue = async (page: Page, text: string) =>
  (await list(page)
    .locator("option")
    .filter({ hasText: text })
    .first()
    .getAttribute("value"))!;

test("mounts the native procedure control with the six built-ins and the eligible firm procedure", async ({
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
  await list(page).focus();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(applied(page)).toContainText(
    '"procedure":{"source":"builtin","id":"briefing"',
  );
  await expect(picker(page).locator("summary")).toHaveText(
    /Procedure · briefing \(builtin\)/,
  );
  await expect(picker(page)).toContainText("Built-in briefing");
  await expect(picker(page)).toContainText(
    "exact selector: builtin:briefing:1:",
  );
  await expect(picker(page).getByRole("alert")).toHaveCount(0);
  // The changed layout is the one new visual surface this lane adds, so keep a current capture.
  await page.screenshot({ path: "test-results/procedure-picker-mounted.png" });
});

test("keeps the canonical mutual exclusion between the static skill and the procedure", async ({
  page,
}) => {
  await page.goto("/procedure-selection.html");
  await picker(page).locator("summary").click();
  const draft = await optionValue(page, "draft");
  await list(page).selectOption(draft);
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
  await expect(applied(page)).toContainText('"procedure"');
  await expect(applied(page)).not.toContainText('"skill"');
});

test("retires a chosen procedure the refreshed catalog no longer lists exactly", async ({
  page,
}) => {
  await page.goto("/procedure-selection.html?scenario=retire-on-refresh");
  await picker(page).locator("summary").click();
  await list(page).selectOption(await optionValue(page, "briefing"));
  await expect(applied(page)).toContainText(
    '"procedure":{"source":"builtin","id":"briefing"',
  );
  await expect(picker(page).locator("summary")).toHaveText(
    /Procedure · briefing \(builtin\)/,
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

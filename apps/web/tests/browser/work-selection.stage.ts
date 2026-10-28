/**
 * SOURCE STAGE ONLY mounted proof of the Start Work / Delegate consumer. Runs through
 * playwright.work-stage.config.ts against tests/browser/work-selection.tsx, which mounts the real
 * SessionComposer (the product mount path) with the successor contracts resolved.
 */
import { expect, test, type Page } from "@playwright/test";

const work = {
  entry: "start-work",
  jobKind: "research",
  deliverables: ["Current bill text", "Sponsor summary"],
  dependencies: ["Prior client briefing"],
};
const picker = (page: Page) =>
  page.locator("details").filter({ hasText: "Work for next message" });
const skillPicker = (page: Page) =>
  page.locator("details").filter({ hasText: "Skill for next message" });
const apply = async (page: Page) => {
  await picker(page)
    .getByRole("button", { name: "Apply to draft" })
    .focus();
  await page.keyboard.press("Enter");
};
/** The picker remounts when the applied definition changes, so open it only when it is closed. */
const openWork = async (page: Page) => {
  const details = picker(page);
  if (!(await details.evaluate((node) => (node as HTMLDetailsElement).open)))
    await details.locator("summary").click();
  await expect(details).toHaveAttribute("open", "");
};

test("mounts Start Work / Delegate in the real composer", async ({ page }) => {
  await page.goto("/work-selection.html");
  await expect(page.getByRole("button", { name: "Send message" })).toBeVisible();
  await expect(picker(page)).toHaveCount(1);
  await expect(picker(page).locator("summary")).toHaveText(/Work · None/);
  await openWork(page);
  await expect(picker(page)).toHaveAttribute("open", "");
  await expect(page.getByLabel("Entry")).toBeEnabled();
});

test("selects a definition by keyboard and reports each required field", async ({
  page,
}) => {
  await page.goto("/work-selection.html");
  const summary = picker(page).locator("summary");
  await summary.focus();
  await expect(summary).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(picker(page)).toHaveAttribute("open", "");
  await apply(page);
  await expect(picker(page).getByRole("alert")).toHaveText(
    "Choose whether to start the work or delegate it.",
  );
  await page.getByLabel("Entry").focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByLabel("Entry")).toHaveValue("start-work");
  await apply(page);
  await expect(picker(page).getByRole("alert")).toHaveText(
    "Choose the kind of work.",
  );
  await page.getByLabel("Job kind").focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByLabel("Job kind")).toHaveValue("research");
  await apply(page);
  await expect(picker(page).getByRole("alert")).toHaveText(
    "Name at least one deliverable, one per line.",
  );
  await page.getByLabel("Deliverables, one per line").focus();
  await page.keyboard.type("Current bill text\nSponsor summary");
  await page.getByLabel("Dependencies, one per line").focus();
  await page.keyboard.type("Prior client briefing");
  await apply(page);
  await expect(picker(page).locator("summary")).toHaveText(
    /Work · Start work · Research/,
  );
  await expect(page.getByLabel("Applied work")).toHaveText(JSON.stringify(work));
  await expect(picker(page).getByRole("alert")).toHaveCount(0);
});

test("keeps the applied definition when a document revision is adopted and removed", async ({
  page,
}) => {
  await page.goto("/work-selection.html");
  await openWork(page);
  await page.getByLabel("Entry").selectOption("start-work");
  await page.getByLabel("Job kind").selectOption("research");
  await page
    .getByLabel("Deliverables, one per line")
    .fill("Current bill text\nSponsor summary");
  await page
    .getByLabel("Dependencies, one per line")
    .fill("Prior client briefing");
  await apply(page);
  await expect(page.getByLabel("Applied work")).toHaveText(JSON.stringify(work));
  // The Files surface handed this exact version to the conversation before it mounted.
  const adopt = page.getByRole("button", {
    name: "Use document for next message",
  });
  await expect(adopt).toBeEnabled();
  await adopt.click();
  await expect(page.getByLabel("Applied selection")).toContainText(
    "documentRevision",
  );
  await expect(page.getByLabel("Applied work")).toHaveText(JSON.stringify(work));
  // Removing the revision removes one choice only: the definition stays applied.
  await page
    .getByRole("button", { name: "Remove document selection" })
    .click();
  await expect(page.getByLabel("Applied selection")).not.toContainText(
    "documentRevision",
  );
  await expect(page.getByLabel("Applied work")).toHaveText(JSON.stringify(work));
});

test("keeps an applied definition when a skill is chosen and removes only the work", async ({
  page,
}) => {
  await page.goto("/work-selection.html");
  await openWork(page);
  await page.getByLabel("Entry").selectOption("delegate");
  await page.getByLabel("Job kind").selectOption("scheduled");
  await page
    .getByLabel("Deliverables, one per line")
    .fill("Scheduled deliverable");
  await apply(page);
  await expect(page.getByLabel("Applied work")).toContainText("delegate");
  // The scheduled kind records the kind only; it points at the existing Routines surface.
  await openWork(page);
  await expect(
    picker(page).getByRole("link", { name: "Routines" }),
  ).toHaveAttribute("href", "/meri/routines");
  const skill = skillPicker(page);
  await skill.locator("summary").click();
  await skill.locator("select").first().selectOption({ index: 1 });
  await skill.getByRole("button", { name: "Apply to draft" }).click();
  await expect(page.getByLabel("Applied skill")).not.toHaveText("None");
  await expect(page.getByLabel("Applied work")).toContainText("delegate");
  await openWork(page);
  await picker(page)
    .getByRole("button", { name: "Remove work selection" })
    .click();
  await expect(page.getByLabel("Applied work")).toHaveText("null");
  await expect(page.getByLabel("Applied skill")).not.toHaveText("None");
});

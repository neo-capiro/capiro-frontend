import { expect, test } from "@playwright/test";

test("changing and clearing a skill preserves the website task through actual draft reload", async ({
  page,
}) => {
  await page.goto("/site-workflow-selection.html");
  const applied = page.getByLabel("Saved draft selection");
  const before = JSON.parse((await applied.textContent())!);
  const picker = page
    .locator("details")
    .filter({
      has: page.getByText("Skill for next message:", { exact: true }),
    });
  await picker.locator("summary").focus();
  await page.keyboard.press("Enter");
  const first = await picker
    .getByRole("combobox", { name: "Skill", exact: true })
    .locator("option")
    .nth(1)
    .getAttribute("value");
  await picker.getByRole("combobox", { name: "Skill", exact: true }).selectOption(first!);
  await picker.getByRole("button", { name: "Apply to draft" }).click();
  await expect(applied).toContainText('"skill"');
  expect(JSON.parse((await applied.textContent())!).siteWorkflow).toEqual(
    before.siteWorkflow,
  );
  await page.reload();
  await picker.locator("summary").click();
  await picker.getByRole("combobox", { name: "Skill", exact: true }).selectOption("");
  await picker.getByRole("button", { name: "Apply to draft" }).click();
  expect(JSON.parse((await applied.textContent())!)).toEqual(before);
});

test("website receipt stays beside the applied document and exposes no task-launch control", async ({
  page,
}) => {
  await page.goto("/site-workflow-selection.html");
  await expect(
    page.getByText("Applied document revision", { exact: true }),
  ).toBeVisible();
  const receipt = page
    .locator("details")
    .filter({
      has: page.getByText("Applied website task: synthetic-task", {
        exact: true,
      }),
    });
  await receipt.locator("summary").click();
  await expect(receipt).toContainText("Configuration version: 3");
  await expect(receipt).toContainText("checked when it runs");
  await expect(receipt.getByRole("button")).toHaveCount(0);
  await page.screenshot({ path: "test-results/site-workflow-selection.png" });
});

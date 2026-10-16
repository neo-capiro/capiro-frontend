import { expect } from "@playwright/test";
import { test } from "./runtime-observed-test";
import { client, clientId, setup } from "./next-modules-fixtures";

test("Commitment title edit preserves its due instant and fences pending dismissal and duplicate save", async ({
  page,
}, info) => {
  const task = {
    id: "51000000-0000-4000-8000-000000000001",
    title: "Synthetic commitment",
    description: "Original text",
    dueDate: "2026-10-20T08:15:00.000Z",
    status: "todo",
    ownerUserId: null,
    client,
  };
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  const writes: unknown[] = [];
  await setup(page, { "engagement.tasks": [task] });
  await page.route("**/api/capiro/engagement.task.update", async (route) => {
    const input = route.request().postDataJSON();
    writes.push(input);
    await held;
    await route.fulfill({ json: { ...task, title: input.body.title } });
  });
  await page.goto(`/modules/engagement?clientId=${clientId}&view=commitments`);
  await expect(
    page.getByRole("button", { name: task.title, exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath("commitments-list-desktop.png"),
  });
  await page.getByRole("button", { name: task.title, exact: true }).click();
  const dialog = page.getByRole("dialog", {
    name: "Edit commitment",
    exact: true,
  });
  await dialog.getByLabel("Title", { exact: true }).fill("Reviewed commitment");
  await page.screenshot({
    path: info.outputPath("commitment-edit-desktop.png"),
  });
  await dialog
    .getByRole("button", { name: "Save commitment", exact: true })
    .click();
  await expect(
    dialog.getByRole("button", { name: "Cancel", exact: true }),
  ).toBeDisabled();
  await expect(dialog.getByLabel("Title", { exact: true })).toBeDisabled();
  await dialog
    .getByRole("button", { name: "Close dialog", exact: true })
    .click();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  await dialog
    .locator("form")
    .evaluate((form) =>
      form.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      ),
    );
  expect(writes).toEqual([
    {
      params: { id: task.id },
      body: { title: "Reviewed commitment", description: task.description },
    },
  ]);
  release();
  await expect(dialog).toBeHidden();
  await page
    .getByRole("button", { name: "+ New commitment", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "New commitment", exact: true }),
  ).toBeVisible();
});

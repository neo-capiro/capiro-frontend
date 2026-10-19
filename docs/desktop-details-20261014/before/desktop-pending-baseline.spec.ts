import { test } from "./runtime-observed-test";
import { expect } from "@playwright/test";
import { operationFixtures, testIdentity } from "./fixtures";
import { nextTask } from "./next-modules-fixtures";
for (const width of [1440]) {
  test(`Planner pending writes freeze the submitted draft and dismissal until rejection at ${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1040 });
    await operationFixtures(page, {
      "me.read": testIdentity,
      "planner.bootstrap": {
        me: { id: "test-user", name: "Test User" },
        people: [],
        projects: [],
      },
      "planner.tasks": { items: [nextTask], nextCursor: null },
    });
    let release!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    let writes = 0;
    await page.route("**/api/capiro/planner.task.create", async (route) => {
      writes++;
      await held;
      await route.fulfill({
        status: 409,
        json: { message: "Synthetic concurrent edit" },
      });
    });
    await page.goto("/modules/planner");
    await page.getByRole("button", { name: "+ New task", exact: true }).click();
    const name = page.getByLabel("Task name", { exact: true });
    await page.getByRole("button", { name: "Save task", exact: true }).click();
    expect(writes).toBe(0);
    expect(
      await name.evaluate(
        (input) => (input as HTMLInputElement).validity.valueMissing,
      ),
    ).toBe(true);
    await name.fill("Test submitted draft");
    await page
      .getByText("Task type, repeat, collaborators and dependencies", {
        exact: true,
      })
      .click();
    await page
      .getByRole("dialog")
      .getByLabel("Task type", { exact: true })
      .click();
    await page.getByRole("option", { name: "approval", exact: true }).click();
    await page.getByRole("button", { name: "Save task", exact: true }).click();
    try {
      await expect(
        page.getByRole("button", { name: "Saving…", exact: true }),
      ).toBeDisabled();
      await expect(name).toBeDisabled();
      for (const label of [
        "Assignee",
        "Priority",
        "Status",
        "Task type",
        "Approval",
        "Repeat",
      ]) {
        const trigger = page
          .getByRole("dialog")
          .getByLabel(label, { exact: true });
        await trigger.scrollIntoViewIfNeeded();
        const box = await trigger.boundingBox();
        expect(box).not.toBeNull();
        await page.mouse.click(
          box!.x + box!.width / 2,
          box!.y + box!.height / 2,
        );
        await expect(page.getByRole("listbox")).toHaveCount(0);
      }
      await expect(
        page.getByRole("button", { name: "Cancel", exact: true }),
      ).toBeDisabled();
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toBeVisible();
      await page
        .getByRole("button", { name: "Close dialog", exact: true })
        .click();
      await expect(page.getByRole("dialog")).toBeVisible();
      expect(writes).toBe(1);
    } finally {
      release();
    }
    await expect(page.getByRole("alert")).toContainText(
      "Synthetic concurrent edit",
    );
    await expect(name).toBeEnabled();
    await expect(name).toHaveValue("Test submitted draft");
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
  });
}

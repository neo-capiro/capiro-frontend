import { test } from "./runtime-observed-test";
import { expect } from "@playwright/test";
import { nextTask, setup, taskId } from "./next-modules-fixtures";

test("MS05 linked task resolves beyond the current list and opens its detail", async ({
  page,
}) => {
  const reads: unknown[] = [];
  await setup(page, {
    "planner.tasks": { items: [], nextCursor: null },
    "planner.task": (input) => {
      reads.push(input);
      return nextTask;
    },
  });
  await page.goto(`/modules/planner?task=${taskId}`);
  await expect(
    page.getByRole("dialog", { name: nextTask.name, exact: true }),
  ).toBeVisible();
  expect(reads).toEqual([{ params: { id: taskId } }]);
  await expect(
    page.getByRole("button", { name: "Edit task", exact: true }),
  ).toBeEnabled();
});

import { expect, test } from "@playwright/test";
import { clientId, nextTask, setup, taskId } from "./next-modules-fixtures";

test("MS02 verified Calendar entry dispatches only the selected client scope", async ({
  page,
}) => {
  const reads: unknown[] = [];
  await setup(page, {
    "engagement.meetings": (input) => {
      reads.push(input);
      return [];
    },
  });
  await page.goto(`/modules/calendar?clientId=${clientId}`);
  await expect(page.getByLabel("Calendar client scope")).toHaveValue(clientId);
  await expect.poll(() => reads.length).toBeGreaterThan(0);
  expect(
    reads.every(
      (input) =>
        (input as { query: { clientId?: string } }).query.clientId === clientId,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Agenda", exact: true }).click();
  await expect(page.getByText(/Client-associated/)).toBeVisible();
});

test("MS03 agenda preserves both Planner start and due occurrences", async ({
  page,
}) => {
  await setup(page, {
    "planner.tasks": {
      items: [
        {
          ...nextTask,
          startOn: "2026-10-10",
          dueOn: "2026-10-12",
          startTime: "09:00",
          dueTime: "17:00",
          timeZone: "America/New_York",
        },
      ],
      nextCursor: null,
    },
  });
  await page.goto("/modules/calendar");
  await page.getByRole("button", { name: "Agenda", exact: true }).click();
  const rows = page.getByRole("row").filter({ hasText: nextTask.name });
  await expect(rows).toHaveCount(2);
  await expect(rows.filter({ hasText: "Start date" })).toContainText("09:00");
  await expect(rows.filter({ hasText: "Due date" })).toContainText("17:00");
});

test("MS04 meeting failure leaves successful agenda feeds visible", async ({
  page,
}) => {
  await setup(page);
  await page.route("**/api/capiro/engagement.meetings*", (route) =>
    route.fulfill({
      status: 403,
      json: { message: "Meetings currently denied" },
    }),
  );
  await page.goto("/modules/calendar");
  await page.getByRole("button", { name: "Agenda", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Meetings currently denied",
  );
  await expect(page.getByRole("table")).toContainText(nextTask.name);
  await expect(
    page.getByRole("heading", { name: "No events match this view" }),
  ).toHaveCount(0);
});

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

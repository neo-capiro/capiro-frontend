import { expect, test } from "@playwright/test";
import { clientId, installFixtures, json } from "./fixtures";

const task = {
  id: "task-date-1",
  name: "Synthetic scheduled follow-up",
  status: "todo",
  archived: false,
  startOn: "2026-10-12",
  dueOn: null,
  startTime: null,
  dueTime: null,
  timeZone: null,
  clientId,
};

test("Master Agenda retains scheduled starts and due dates while client Calendar stays meeting-scoped", async ({
  page,
}) => {
  const unexpected = await installFixtures(page);
  const calls: URL[] = [];
  await page.route("**/strategy/planner/tasks?**", (route) => {
    calls.push(new URL(route.request().url()));
    return json(route, {
      items: [
        task,
        {
          ...task,
          id: "task-date-2",
          name: "Synthetic report delivery",
          dueOn: "2026-10-16",
        },
        {
          ...task,
          id: "task-date-3",
          name: "Archived synthetic task",
          archived: true,
        },
      ],
      nextCursor: null,
    });
  });
  await page.goto(
    "/calendar?view=agenda&date=2026-10-15&zone=America%2FLos_Angeles",
  );
  await expect(
    page.getByRole("heading", { name: task.name, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Synthetic report delivery",
      exact: true,
    }),
  ).toHaveCount(2);
  const delivery = page.locator("article").filter({
    has: page.getByRole("heading", {
      name: "Synthetic report delivery",
      exact: true,
    }),
  });
  await expect(delivery.filter({ hasText: "scheduled start" })).toHaveCount(1);
  await expect(delivery.filter({ hasText: "due date" })).toHaveCount(1);
  await expect(
    page.getByRole("heading", { name: "Archived synthetic task", exact: true }),
  ).toHaveCount(0);
  expect(calls).toHaveLength(1);
  expect(calls[0]?.searchParams.has("clientId")).toBe(false);
  expect(calls[0]?.searchParams.has("from")).toBe(false);
  await page.getByRole("button", { name: "Planner", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: task.name, exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(
    page.getByRole("heading", { name: task.name, exact: true }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Calendar scope" })
    .selectOption(clientId);
  await expect(
    page.getByRole("heading", { name: task.name, exact: true }),
  ).toHaveCount(0);
  expect(calls).toHaveLength(1);
  expect(unexpected).toEqual([]);
});

test("invalid timed Planner source is a visible feed error", async ({
  page,
}) => {
  const unexpected = await installFixtures(page);
  await page.route("**/strategy/planner/tasks?**", (route) =>
    json(route, {
      items: [{ ...task, startTime: "09:00", timeZone: null }],
      nextCursor: null,
    }),
  );
  await page.goto("/calendar?view=agenda&date=2026-10-15&zone=UTC");
  await expect(
    page.getByRole("heading", { name: task.name, exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Retry", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Master Calendar", exact: true }),
  ).toBeVisible();
  expect(unexpected).toEqual([]);
});

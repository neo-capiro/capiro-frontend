import { expect } from "@playwright/test";
import { test } from "./runtime-observed-test";
import {
  bootstrap,
  clientId,
  nextTask,
  otherTaskId,
  setup,
  taskId,
} from "./next-modules-fixtures";

const projectId = "52000000-0000-4000-8000-000000000001";
const sectionId = "53000000-0000-4000-8000-000000000001";
const project = {
  id: projectId,
  name: "Editable current project",
  description: "",
  color: "#123456",
  privacy: "team",
  defaultView: "list",
  sections: [{ id: sectionId, name: "Current section" }],
  fields: [],
  members: [],
  startOn: null,
  dueOn: null,
  health: "on_track",
  clientId,
  ownerId: "test-user",
  version: 1,
  archived: false,
  createdAt: "2026-10-01T00:00:00Z",
  updatedAt: "2026-10-01T00:00:00Z",
  access: "editor",
};
const source = {
  ...nextTask,
  version: 9,
  status: "done",
  approval: "approved",
  clientId,
  startOn: "2026-10-01",
  dueOn: "2026-10-12",
  completedAt: "2026-10-12T12:00:00Z",
  actualMinutes: 180,
  parentId: otherTaskId,
  dependencies: [otherTaskId],
  collaborators: ["test-user"],
  tags: ["source-only"],
  memberships: [{ projectId, sectionId, position: 15 }],
  recurrence: { frequency: "daily", interval: 1 },
};

test("Duplicate opens a reviewed create draft, cancels without writes and creates only copied editable data", async ({
  page,
}) => {
  await setup(page, {
    "planner.bootstrap": { ...bootstrap, projects: [project] },
    "planner.task": source,
  });
  const creates: unknown[] = [],
    updates: unknown[] = [];
  await page.route("**/api/capiro/planner.task.update", (route) => {
    updates.push(route.request().postDataJSON());
    return route.fulfill({
      status: 500,
      json: { message: "Unexpected source update" },
    });
  });
  await page.route("**/api/capiro/planner.task.create", (route) => {
    const body = route.request().postDataJSON().body;
    creates.push(body);
    return route.fulfill({
      json: {
        ...nextTask,
        ...body.data,
        id: otherTaskId,
        version: 1,
        actualMinutes: 0,
      },
    });
  });
  await page.goto(`/modules/planner?clientId=${clientId}&task=${taskId}`);
  await page
    .getByRole("button", { name: "Duplicate task", exact: true })
    .click();
  let dialog = page.getByRole("dialog", { name: "New task", exact: true });
  await expect(dialog.getByLabel("Task name", { exact: true })).toHaveValue(
    `Copy of ${source.name}`,
  );
  await expect(dialog.getByLabel("Description", { exact: true })).toHaveValue(
    source.description,
  );
  await expect(dialog.getByLabel("Priority", { exact: true })).toHaveText(
    "high",
  );
  await expect(dialog.getByLabel("Assignee", { exact: true })).toHaveText(
    "Unassigned",
  );
  await expect(dialog.getByLabel("Due date", { exact: true })).toHaveValue("");
  await expect(dialog.getByLabel(project.name, { exact: true })).toBeChecked();
  expect(creates).toHaveLength(0);
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(dialog).toBeHidden();
  expect(creates).toHaveLength(0);
  await page
    .getByRole("button", { name: "Duplicate task", exact: true })
    .click();
  dialog = page.getByRole("dialog", { name: "New task", exact: true });
  await dialog
    .getByLabel("Task name", { exact: true })
    .fill("Reviewed duplicate");
  await dialog.getByLabel("Due date", { exact: true }).fill("2026-10-20");
  await dialog.getByRole("button", { name: "Save task", exact: true }).click();
  await expect(dialog).toBeHidden();
  expect(creates).toEqual([
    {
      data: {
        name: "Reviewed duplicate",
        description: source.description,
        assigneeId: null,
        dueOn: "2026-10-20",
        startOn: null,
        status: "todo",
        priority: "high",
        estimateMinutes: 0,
        startTime: null,
        dueTime: null,
        timeZone: null,
        subtype: "task",
        approval: "pending",
        tags: [],
        collaborators: [],
        dependencies: [],
        recurrence: null,
        clientId,
        parentId: null,
        memberships: [{ projectId, sectionId, position: 0 }],
      },
    },
  ]);
  expect(updates).toEqual([]);
  await expect(
    page.getByRole("dialog", { name: source.name, exact: true }),
  ).toBeVisible();
});

test("Duplicate pending admits one create and freezes fields and dismissal; rejection retains the reviewed draft", async ({
  page,
}) => {
  await setup(page);
  let writes = 0,
    release!: () => void;
  const held = new Promise<void>((resolve) => (release = resolve));
  await page.route("**/api/capiro/planner.task.create", async (route) => {
    writes++;
    await held;
    await route.fulfill({
      status: 409,
      json: { message: "Synthetic create refused" },
    });
  });
  await page.goto(`/modules/planner?task=${taskId}`);
  await page
    .getByRole("button", { name: "Duplicate task", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "New task", exact: true });
  await dialog.locator("form").evaluate((element) => {
    (element as HTMLFormElement).requestSubmit();
    (element as HTMLFormElement).requestSubmit();
    (element as HTMLFormElement).requestSubmit();
  });
  try {
    await expect.poll(() => writes).toBe(1);
    await expect(
      dialog.getByLabel("Task name", { exact: true }),
    ).toBeDisabled();
    await expect(dialog.getByLabel("Priority", { exact: true })).toBeDisabled();
    await dialog
      .getByRole("button", { name: "Cancel", exact: true })
      .evaluate((button) => (button as HTMLButtonElement).click());
    await page.keyboard.press("Escape");
    await expect(dialog).toBeVisible();
    expect(writes).toBe(1);
  } finally {
    release();
  }
  await expect(dialog.getByRole("alert")).toHaveText(
    "Synthetic create refused",
  );
  await expect(dialog.getByLabel("Task name", { exact: true })).toHaveValue(
    `Copy of ${nextTask.name}`,
  );
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(dialog).toBeHidden();
});

for (const access of ["viewer", "commenter"] as const) {
  test(`Duplicate does not grant create access to ${access}`, async ({
    page,
  }) => {
    await setup(page, { "planner.task": { ...nextTask, access } });
    await page.goto(`/modules/planner?task=${taskId}`);
    await expect(
      page.getByRole("button", { name: "Duplicate task", exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByRole("dialog", { name: "New task", exact: true }),
    ).toHaveCount(0);
  });
}

test("Replacing the source receipt retires a held duplicate without stale saved or close callbacks", async ({
  page,
}) => {
  await setup(page);
  let writes = 0,
    release!: () => void;
  const held = new Promise<void>((resolve) => (release = resolve));
  let settle!: () => void;
  const settled = new Promise<void>((resolve) => (settle = resolve));
  await page.route("**/api/capiro/planner.task.create", async (route) => {
    writes++;
    await held;
    try {
      await route.fulfill({ json: { ...nextTask, id: otherTaskId } });
    } catch (error) {
      if (!route.request().failure()) throw error;
    } finally {
      settle();
    }
  });
  await page.goto("/__test/task-detail-refresh");
  await page
    .getByRole("button", { name: "Duplicate task", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "New task", exact: true });
  await dialog.getByRole("button", { name: "Save task", exact: true }).click();
  await expect.poll(() => writes).toBe(1);
  await page.evaluate(
    (task) =>
      dispatchEvent(
        new CustomEvent("capiro-task-receipt-refresh", {
          detail: { ...task, version: 2, name: "Replacement current task" },
        }),
      ),
    nextTask,
  );
  await expect(dialog).toBeHidden();
  release();
  await settled;
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  await expect(
    page.getByRole("dialog", { name: "Replacement current task", exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("task-saved")).toHaveText("Saved callbacks: 0");
  await expect(page.getByTestId("task-closed")).toHaveText(
    "Closed callbacks: 0",
  );
});

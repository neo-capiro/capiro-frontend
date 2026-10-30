import { test } from "./runtime-observed-test";
import { expect } from "@playwright/test";
import { operationFixtures, testIdentity } from "./fixtures";
const taskId = "51000000-0000-4000-8000-000000000001";
const blankTask = {
  id: taskId,
  name: "Test appropriation review",
  description: "Synthetic review work",
  ownerId: "test-user",
  assigneeId: "test-user",
  version: 1,
  archived: false,
  status: "todo",
  priority: "high",
  subtype: "task",
  approval: "pending",
  startOn: null,
  dueOn: "2026-10-12",
  startTime: null,
  dueTime: null,
  timeZone: null,
  parentId: null,
  dependencies: [],
  collaborators: [],
  tags: [],
  memberships: [],
  customValues: {},
  estimateMinutes: 90,
  actualMinutes: 15,
  recurrence: null,
  clientId: null,
  meetingId: null,
  completedAt: null,
  createdAt: "2026-10-08T12:00:00Z",
  updatedAt: "2026-10-08T12:00:00Z",
  access: "admin",
};

test("Planner modes use the same permitted task data and exact board assets", async ({
  page,
}) => {
  await operationFixtures(page, {
    "me.read": testIdentity,
    "planner.bootstrap": {
      me: { id: "test-user", name: "Test User" },
      people: [{ id: "test-user", name: "Test User" }],
      projects: [],
    },
    "planner.tasks": { items: [blankTask], nextCursor: null },
  });
  await page.goto("/modules/planner?view=board");
  await expect(
    page.getByRole("heading", { name: "Planner", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("tab", { name: "Board", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(
    page.getByRole("button", { name: /Test appropriation review/ }).first(),
  ).toBeVisible();
  const dots = page.locator('img[src*="planner-board-imgEllipse"]');
  await expect(dots).toHaveCount(4);
  for (const image of await dots.all()) {
    expect(
      await image.evaluate(
        (element) => (element as HTMLImageElement).naturalWidth,
      ),
    ).toBe(7);
  }
  await page.getByRole("tab", { name: "Calendar", exact: true }).click();
  await expect(page.getByText("October 2026")).toBeVisible();
  await page.getByRole("tab", { name: "Timeline", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Timeline", exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Gantt", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Gantt", exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "List", exact: true }).click();
  await expect(page.getByRole("table")).toContainText(
    "Test appropriation review",
  );
  await page.screenshot({
    path: "test-results/planner-list.png",
    fullPage: true,
    animations: "disabled",
  });
});
test("Planner failed writes retain drafts and a successful save uses only reviewed fields", async ({
  page,
}) => {
  const writes: unknown[] = [];
  let tasks = [blankTask];
  let fail = true;
  await operationFixtures(page, {
    "me.read": testIdentity,
    "planner.bootstrap": {
      me: { id: "test-user", name: "Test User" },
      people: [{ id: "test-user", name: "Test User" }],
      projects: [],
    },
    "planner.tasks": (input) => ({
      items: (input as { query?: { parentId?: string } }).query?.parentId
        ? []
        : tasks,
      nextCursor: null,
    }),
    "planner.task.events": [],
    "planner.task.attachments": [],
    "planner.task.update": (input) => {
      writes.push(input);
      const request = input as {
        params: { id: string };
        body: { version: number; data: Partial<typeof blankTask> };
      };
      const saved = {
        ...tasks.find((task) => task.id === request.params.id)!,
        ...request.body.data,
        version: request.body.version + 1,
      };
      tasks = tasks.map((task) => (task.id === saved.id ? saved : task));
      return saved;
    },
    "planner.task.create": (input) => {
      writes.push(input);
      const body = (input as { body: { data: Partial<typeof blankTask> } })
        .body;
      const saved = {
        ...blankTask,
        ...body.data,
        id: "51000000-0000-4000-8000-000000000002",
      };
      tasks = [...tasks, saved];
      return saved;
    },
  });
  await page.route("**/api/capiro/planner.task.create", (route) =>
    fail
      ? route.fulfill({
          status: 409,
          json: { message: "Synthetic concurrent edit" },
        })
      : route.fallback(),
  );
  await page.goto("/modules/planner");
  await page.getByRole("button", { name: "+ New task", exact: true }).click();
  await page.getByLabel("Task name", { exact: true }).fill("Test new work");
  await page.getByRole("button", { name: "Save task", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Synthetic concurrent edit",
  );
  await expect(page.getByLabel("Task name", { exact: true })).toHaveValue(
    "Test new work",
  );
  fail = false;
  await page.getByRole("button", { name: "Save task", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByRole("table")).toContainText("Test new work");
  expect(writes).toHaveLength(1);
  const request = writes[0] as { body: { data: Record<string, unknown> } };
  expect(request.body.data.name).toBe("Test new work");
  expect(request.body.data).not.toHaveProperty("tenantId");
  expect(request.body.data).not.toHaveProperty("actorId");
  await page.reload();
  await page
    .getByRole("button", { name: "Test new work", exact: true })
    .click();
  await page.getByRole("button", { name: "Edit task", exact: true }).click();
  await expect(page.getByLabel("Task name", { exact: true })).toHaveValue(
    "Test new work",
  );
  await page.getByLabel("Task name", { exact: true }).fill("Test updated work");
  await page.getByRole("button", { name: "Save task", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Edit task", exact: true }),
  ).toBeHidden();
  await expect(page.getByRole("dialog")).toBeHidden();
  await page.reload();
  await page
    .getByRole("button", { name: "Test updated work", exact: true })
    .click();
  await page.getByRole("button", { name: "Edit task", exact: true }).click();
  await expect(page.getByLabel("Task name", { exact: true })).toHaveValue(
    "Test updated work",
  );
  expect(writes).toHaveLength(2);
  expect(writes[1]).toMatchObject({
    params: { id: "51000000-0000-4000-8000-000000000002" },
    body: { version: 1, data: { name: "Test updated work" } },
  });
});
for (const width of [1440, 390]) {
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
      "planner.tasks": { items: [blankTask], nextCursor: null },
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
      .getByText(
        width >= 1024
          ? "More task options"
          : "Task type, repeat, collaborators and dependencies",
        { exact: true },
      )
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

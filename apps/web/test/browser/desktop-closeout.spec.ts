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
import { expectAccessibleHome } from "../accessibility";
const projectId = "52000000-0000-4000-8000-000000000001";
const sectionId = "53000000-0000-4000-8000-000000000001";
const project = {
  id: projectId,
  name: "Synthetic current project",
  description: "",
  color: "#123456",
  privacy: "team",
  defaultView: "list",
  sections: [{ id: sectionId, name: "Synthetic current section" }],
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
const task = {
  ...nextTask,
  version: 7,
  startOn: "2026-10-08",
  startTime: "09:00",
  dueTime: "17:00",
  timeZone: "America/New_York",
  memberships: [{ projectId, sectionId, position: 7 }],
  recurrence: {
    frequency: "weekly",
    interval: 2,
    basedOn: "completion_date",
    weekdays: [1, 3],
    endsOn: "2026-12-31",
    anchorOn: "2026-10-01",
  },
};
for (const colorScheme of ["light", "dark"] as const) {
  test(`Desktop detail edits directly, saves the versioned membership and reads back ${colorScheme}`, async ({
    page,
  }, info) => {
    await page.emulateMedia({ colorScheme });
    let saved = { ...task };
    await setup(page, {
      "planner.bootstrap": { ...bootstrap, projects: [project] },
      "planner.task": () => saved,
    });
    const writes: unknown[] = [];
    await page.route("**/api/capiro/planner.task.update", async (route) => {
      const body = route.request().postDataJSON().body;
      writes.push(body);
      expect(body.version).toBe(saved.version);
      expect(body.data.memberships).toEqual(task.memberships);
      expect(body.data.recurrence).toEqual(task.recurrence);
      saved = { ...saved, ...body.data, version: saved.version + 1 };
      await route.fulfill({ json: saved });
    });
    await page.goto(`/modules/planner?task=${taskId}`);
    let dialog = page.getByRole("dialog", { name: task.name, exact: true });
    const form = dialog.locator('[data-slot="task-detail-editor"]');
    await expect(form).toBeVisible();
    expect(writes).toHaveLength(0);
    await expect(dialog.locator("form form")).toHaveCount(0);
    await form
      .getByLabel("Task name", { exact: true })
      .fill("Synthetic directly edited task");
    await form
      .getByLabel("Description", { exact: true })
      .fill("Synthetic directly edited description");
    await form.getByLabel("Priority", { exact: true }).click();
    await page.getByRole("option", { name: "medium", exact: true }).click();
    const footer = dialog.locator(":scope > footer");
    const before = await footer.boundingBox();
    await dialog
      .locator('[data-slot="modal-body"]')
      .evaluate((element) => (element.scrollTop = element.scrollHeight));
    expect(await footer.boundingBox()).toEqual(before);
    await expect(
      footer.getByRole("button", { name: "Save task", exact: true }),
    ).toBeVisible();
    await dialog
      .locator('[data-slot="modal-body"]')
      .evaluate((element) => (element.scrollTop = 0));
    await page.screenshot({
      path: info.outputPath("desktop-inline-task-detail.png"),
    });
    await expectAccessibleHome(page, info);
    await footer
      .getByRole("button", { name: "Save task", exact: true })
      .click();
    await expect(dialog).toBeHidden();
    expect(writes).toHaveLength(1);
    await page.goto(`/modules/planner?task=${taskId}`);
    dialog = page.getByRole("dialog", { name: saved.name, exact: true });
    await expect(dialog.getByLabel("Task name", { exact: true })).toHaveValue(
      saved.name,
    );
    await expect(dialog.getByLabel("Description", { exact: true })).toHaveValue(
      saved.description,
    );
    await expect(dialog.getByLabel("Priority", { exact: true })).toHaveText(
      "medium",
    );
    expect(saved.version).toBe(8);
  });
}
for (const outcome of ["success", "rejection"] as const) {
  test(`Desktop inline ${outcome} holds one save and fences comment, archive and dismissal`, async ({
    page,
  }) => {
    await setup(page);
    let release!: () => void;
    const held = new Promise<void>((resolve) => (release = resolve));
    let writes = 0;
    await page.route("**/api/capiro/planner.task.update", async (route) => {
      writes++;
      await held;
      await route.fulfill(
        outcome === "success"
          ? { json: { ...nextTask, name: "Synthetic held draft", version: 2 } }
          : { status: 409, json: { message: "Synthetic stale version" } },
      );
    });
    await page.goto(`/modules/planner?task=${taskId}`);
    const dialog = page.getByRole("dialog", {
      name: nextTask.name,
      exact: true,
    });
    const form = dialog.locator('[data-slot="task-detail-editor"]');
    await form
      .getByLabel("Task name", { exact: true })
      .fill("Synthetic held draft");
    await form.evaluate((element) => {
      (element as HTMLFormElement).requestSubmit();
      (element as HTMLFormElement).requestSubmit();
    });
    try {
      await expect(
        form.getByLabel("Task name", { exact: true }),
      ).toBeDisabled();
      await expect(
        dialog.getByLabel("Comment", { exact: true }),
      ).toBeDisabled();
      for (const label of [
        "Archive",
        "Add time",
        "+ Subtask",
        "Close",
        "Edit task",
      ])
        await expect(
          dialog.getByRole("button", { name: label, exact: true }),
        ).toBeDisabled();
      await page.keyboard.press("Escape");
      await expect(dialog).toBeVisible();
      expect(writes).toBe(1);
    } finally {
      release();
    }
    if (outcome === "success") await expect(dialog).toBeHidden();
    else {
      await expect(form.getByRole("alert")).toHaveText(
        "Synthetic stale version",
      );
      await expect(form.getByLabel("Task name", { exact: true })).toHaveValue(
        "Synthetic held draft",
      );
      await expect(form.getByLabel("Task name", { exact: true })).toBeEnabled();
    }
    expect(writes).toBe(1);
  });
}
test("Desktop nested editor reuses inline draft; cancel resets and a breakpoint retains current fields", async ({
  page,
}) => {
  await setup(page);
  await page.goto(`/modules/planner?task=${taskId}`);
  const detail = page.getByRole("dialog", { name: nextTask.name, exact: true });
  await detail
    .getByLabel("Task name", { exact: true })
    .fill("Synthetic shared draft");
  await detail.getByRole("button", { name: "Edit task", exact: true }).click();
  const nested = page.getByRole("dialog", { name: "Edit task", exact: true });
  await expect(nested.getByLabel("Task name", { exact: true })).toHaveValue(
    "Synthetic shared draft",
  );
  await expect(page.locator('[data-slot="task-detail-editor"]')).toHaveCount(0);
  await nested.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(detail.getByLabel("Task name", { exact: true })).toHaveValue(
    nextTask.name,
  );
  await detail
    .getByLabel("Task name", { exact: true })
    .fill("Synthetic breakpoint draft");
  await page.setViewportSize({ width: 1023, height: 1040 });
  await page.setViewportSize({ width: 1440, height: 1040 });
  await expect(detail.getByLabel("Task name", { exact: true })).toHaveValue(
    "Synthetic breakpoint draft",
  );
});
test("Desktop held save cannot close or erase a replacement task draft", async ({
  page,
}) => {
  await setup(page, {
    "planner.task": (input: unknown) => ({
      ...nextTask,
      id: (input as { params: { id: string } }).params.id,
      name:
        (input as { params: { id: string } }).params.id === taskId
          ? nextTask.name
          : "Synthetic replacement",
    }),
  });
  let release!: () => void;
  const held = new Promise<void>((resolve) => (release = resolve));
  await page.route("**/api/capiro/planner.task.update", async (route) => {
    await held;
    await route.fulfill({
      status: 409,
      json: { message: "Retired synthetic save" },
    });
  });
  await page.goto(`/modules/planner?task=${taskId}`);
  const request = page.waitForRequest((request) =>
    request.url().endsWith("planner.task.update"),
  );
  await page.getByRole("button", { name: "Save task", exact: true }).click();
  await request;
  await page.goto(`/modules/planner?task=${otherTaskId}`);
  const replacement = page.getByRole("dialog", {
    name: "Synthetic replacement",
    exact: true,
  });
  await replacement
    .getByLabel("Task name", { exact: true })
    .fill("Synthetic newer draft");
  release();
  await expect(
    replacement.getByLabel("Task name", { exact: true }),
  ).toHaveValue("Synthetic newer draft");
  await expect(replacement.getByRole("alert")).toHaveCount(0);
});
test("Desktop same-ID receipt replacement discards the former draft before saving the fresh version", async ({
  page,
}) => {
  await setup(page);
  const writes: unknown[] = [];
  const fresh = {
    ...nextTask,
    version: 2,
    name: "Synthetic current receipt",
    description: "Synthetic new description",
  };
  await page.route("**/api/capiro/planner.task.update", async (route) => {
    const body = route.request().postDataJSON().body;
    writes.push(body);
    await route.fulfill({ json: { ...fresh, ...body.data, version: 3 } });
  });
  await page.goto("/__test/task-detail-refresh");
  await page
    .getByLabel("Task name", { exact: true })
    .fill("Synthetic retired unsaved draft");
  await page.evaluate(
    (receipt) =>
      window.dispatchEvent(
        new CustomEvent("capiro-task-receipt-refresh", { detail: receipt }),
      ),
    fresh,
  );
  await expect(page.getByLabel("Task name", { exact: true })).toHaveValue(
    fresh.name,
  );
  await expect(page.getByLabel("Description", { exact: true })).toHaveValue(
    fresh.description,
  );
  await page.getByRole("button", { name: "Save task", exact: true }).click();
  await expect(page.getByTestId("task-saved")).toHaveText("Saved callbacks: 1");
  expect(writes).toEqual([
    expect.objectContaining({
      version: 2,
      data: expect.objectContaining({
        name: fresh.name,
        description: fresh.description,
      }),
    }),
  ]);
});
test("Desktop same-ID receipt replacement retires the held save and its completion callbacks", async ({
  page,
}) => {
  await setup(page);
  let release!: () => void, fulfilled!: () => void;
  const held = new Promise<void>((resolve) => (release = resolve)),
    response = new Promise<void>((resolve) => (fulfilled = resolve));
  await page.route("**/api/capiro/planner.task.update", async (route) => {
    await held;
    await route.fulfill({ json: { ...nextTask, version: 2 } });
    fulfilled();
  });
  await page.goto("/__test/task-detail-refresh");
  const request = page.waitForRequest((request) =>
    request.url().endsWith("planner.task.update"),
  );
  await page.getByRole("button", { name: "Save task", exact: true }).click();
  await request;
  const fresh = {
    ...nextTask,
    version: 2,
    name: "Synthetic same-ID current receipt",
  };
  await page.evaluate(
    (receipt) =>
      window.dispatchEvent(
        new CustomEvent("capiro-task-receipt-refresh", { detail: receipt }),
      ),
    fresh,
  );
  await expect(page.getByLabel("Task name", { exact: true })).toHaveValue(
    fresh.name,
  );
  await page
    .getByLabel("Task name", { exact: true })
    .fill("Synthetic replacement draft");
  release();
  await response;
  await page.getByLabel("Task name", { exact: true }).press("Tab");
  await expect(page.getByTestId("task-saved")).toHaveText("Saved callbacks: 0");
  await expect(page.getByTestId("task-closed")).toHaveText(
    "Closed callbacks: 0",
  );
  await expect(page.getByLabel("Task name", { exact: true })).toHaveValue(
    "Synthetic replacement draft",
  );
  await expect(page.getByRole("alert")).toHaveCount(0);
});
for (const operation of [
  "planner.task.comment",
  "planner.task.update",
] as const) {
  test(`Desktop held ${operation} prevents native inline save`, async ({
    page,
  }) => {
    await setup(page);
    let release!: () => void;
    const held = new Promise<void>((resolve) => (release = resolve));
    const writes: string[] = [];
    await page.route("**/api/capiro/planner.task.comment", async (route) => {
      writes.push("comment");
      if (operation === "planner.task.comment") await held;
      await route.fulfill({
        status: 409,
        json: { message: "Synthetic comment hold" },
      });
    });
    await page.route("**/api/capiro/planner.task.update", async (route) => {
      writes.push("update");
      if (operation === "planner.task.update") await held;
      await route.fulfill({
        status: 409,
        json: { message: "Synthetic archive hold" },
      });
    });
    await page.goto(`/modules/planner?task=${taskId}`);
    const form = page.locator('[data-slot="task-detail-editor"]');
    if (operation === "planner.task.comment") {
      await page
        .getByLabel("Comment", { exact: true })
        .fill("Synthetic held comment");
      await page
        .getByRole("button", { name: "Post comment", exact: true })
        .click();
    } else
      await page.getByRole("button", { name: "Archive", exact: true }).click();
    try {
      await expect(
        form.getByLabel("Task name", { exact: true }),
      ).toBeDisabled();
      await form.evaluate((element) =>
        (element as HTMLFormElement).requestSubmit(),
      );
      await expect(
        page.getByRole("button", { name: "Save task", exact: true }),
      ).toBeDisabled();
      expect(writes).toEqual([
        operation === "planner.task.comment" ? "comment" : "update",
      ]);
    } finally {
      release();
    }
    await expect(form.getByLabel("Task name", { exact: true })).toBeEnabled();
    expect(writes).toHaveLength(1);
  });
}

import { expect } from "@playwright/test";
import { test } from "./runtime-observed-test";
import {
  bootstrap,
  clientId,
  nextTask,
  setup,
  taskId,
} from "./next-modules-fixtures";
const projectId = "52000000-0000-4000-8000-000000000001";
const sectionId = "53000000-0000-4000-8000-000000000001";
const unavailableSectionId = "53000000-0000-4000-8000-000000000002";
const unavailableProjectId = "52000000-0000-4000-8000-000000000002";
const project = {
  id: projectId,
  name: "Synthetic policy project",
  description: "",
  color: "#123456",
  privacy: "team",
  defaultView: "list",
  sections: [{ id: sectionId, name: "Synthetic research" }],
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
for (const colorScheme of ["light", "dark"] as const) {
  test(`Desktop task body follows reference order and preserves draft across breakpoint ${colorScheme}`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width: 1440, height: 1040 });
    await page.emulateMedia({ colorScheme });
    await setup(page, {
      "planner.bootstrap": { ...bootstrap, projects: [project] },
    });
    let writes = 0;
    await page.route("**/api/capiro/planner.task.create", (route) => {
      writes++;
      return route.fulfill({
        status: 409,
        json: { message: "Synthetic create conflict" },
      });
    });
    await page.goto("/modules/planner");
    await page.getByRole("button", { name: "+ New task", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "New task", exact: true });
    await dialog
      .getByLabel("Task name", { exact: true })
      .fill("Unsaved synthetic draft");
    await dialog
      .getByLabel("Description", { exact: true })
      .fill("Plain description survives resizing.");
    await dialog.getByLabel("Start date", { exact: true }).fill("2026-10-14");
    await dialog.getByLabel("Task type", { exact: true }).click();
    await page.getByRole("option", { name: "milestone", exact: true }).click();
    await dialog.getByLabel("Repeat", { exact: true }).click();
    await page.getByRole("option", { name: "weekly", exact: true }).click();
    await dialog
      .getByLabel("Synthetic policy project", { exact: true })
      .check();
    await dialog
      .getByLabel("Synthetic policy project section", { exact: true })
      .click();
    await page
      .getByRole("option", { name: "Synthetic research", exact: true })
      .click();
    const order = await dialog
      .locator("input, textarea, button[role=combobox]")
      .evaluateAll((elements) => elements.map((element) => element.id));
    expect(order.indexOf("task-name")).toBeLessThan(
      order.indexOf("task-assignee"),
    );
    expect(order.indexOf("task-assignee")).toBeLessThan(
      order.indexOf("task-status"),
    );
    expect(order.indexOf("task-status")).toBeLessThan(
      order.indexOf("task-priority"),
    );
    expect(order.indexOf("task-priority")).toBeLessThan(
      order.indexOf("task-type"),
    );
    expect(order.indexOf("task-type")).toBeLessThan(
      order.indexOf("task-start"),
    );
    expect(order.indexOf("task-repeat")).toBeLessThan(
      order.indexOf("task-description"),
    );
    await dialog
      .locator('[data-slot="task-editor-content"]')
      .evaluate((element) => (element.scrollTop = 0));
    await page.screenshot({ path: info.outputPath("desktop-task-body.png") });
    await info.attach("reference-order", {
      body: JSON.stringify({ reference: "819:146478", order }),
      contentType: "application/json",
    });
    for (const width of [1023, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1040 });
      await expect(dialog.getByLabel("Task name", { exact: true })).toHaveValue(
        "Unsaved synthetic draft",
      );
      await expect(
        dialog.getByLabel("Description", { exact: true }),
      ).toHaveValue("Plain description survives resizing.");
      await expect(
        dialog.getByLabel("Start date", { exact: true }),
      ).toHaveValue("2026-10-14");
      if (width < 1024)
        await dialog
          .getByText("Task type, repeat, collaborators and dependencies", {
            exact: true,
          })
          .click();
      await expect(dialog.getByLabel("Task type", { exact: true })).toHaveText(
        "milestone",
      );
      await expect(dialog.getByLabel("Repeat", { exact: true })).toHaveText(
        "weekly",
      );
      if (width >= 1024)
        await expect(
          dialog.getByLabel("Synthetic policy project section", {
            exact: true,
          }),
        ).toHaveText("Synthetic research");
      else
        await expect(
          dialog.getByLabel("Synthetic policy project section", {
            exact: true,
          }),
        ).toHaveCount(0);
      expect(writes).toBe(0);
    }
    await dialog
      .getByRole("button", { name: "Save task", exact: true })
      .click();
    await expect(dialog.getByRole("alert")).toContainText(
      "Synthetic create conflict",
    );
    expect(writes).toBe(1);
  });
}
for (const clear of [false, true]) {
  test(`Desktop edit ${clear ? "clears" : "preserves"} unavailable saved section without losing other memberships`, async ({
    page,
  }) => {
    const saved = {
      ...nextTask,
      memberships: [
        { projectId, sectionId: unavailableSectionId, position: 7 },
        { projectId: unavailableProjectId, sectionId, position: 13 },
      ],
    };
    await setup(page, {
      "planner.bootstrap": { ...bootstrap, projects: [project] },
      "planner.task": saved,
    });
    let body: { version: number; data: { memberships: unknown[] } } | undefined;
    await page.route("**/api/capiro/planner.task.update", (route) => {
      body = route.request().postDataJSON().body;
      return route.fulfill({
        status: 409,
        json: { message: "Synthetic section conflict" },
      });
    });
    await page.goto(`/modules/planner?task=${taskId}`);
    await page.getByRole("button", { name: "Edit task", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Edit task", exact: true });
    const section = dialog.getByLabel("Synthetic policy project section", {
      exact: true,
    });
    await expect(section).toHaveText("Saved section unavailable");
    if (clear) {
      await section.click();
      await page
        .getByRole("option", { name: "Unsectioned", exact: true })
        .click();
    }
    await dialog
      .getByRole("button", { name: "Save task", exact: true })
      .click();
    await expect(dialog.getByRole("alert")).toContainText(
      "Synthetic section conflict",
    );
    expect(body?.version).toBe(1);
    expect(body?.data.memberships).toEqual([
      {
        projectId,
        sectionId: clear ? null : unavailableSectionId,
        position: 7,
      },
      { projectId: unavailableProjectId, sectionId, position: 13 },
    ]);
  });
}

for (const access of ["viewer", "archived"] as const) {
  test(`Desktop task section preserves ${access} membership behind its edit wall`, async ({
    page,
  }) => {
    const locked = {
      ...project,
      access: access === "viewer" ? "viewer" : "editor",
      archived: access === "archived",
    };
    const foreign = {
      ...project,
      id: unavailableProjectId,
      name: "Synthetic foreign project",
      sections: [{ id: unavailableSectionId, name: "Foreign section" }],
    };
    await setup(page, {
      "planner.bootstrap": { ...bootstrap, projects: [locked, foreign] },
      "planner.task": {
        ...nextTask,
        memberships: [{ projectId, sectionId, position: 7 }],
      },
    });
    await page.goto(`/modules/planner?task=${taskId}`);
    await page.getByRole("button", { name: "Edit task", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Edit task", exact: true });
    await expect(
      dialog.getByLabel("Synthetic policy project section", { exact: true }),
    ).toBeDisabled();
    await expect(
      dialog.getByLabel("Synthetic policy project section", { exact: true }),
    ).toHaveText("Synthetic research");
    await expect(
      dialog.getByLabel("Synthetic foreign project section", { exact: true }),
    ).toHaveCount(0);
  });
}

test("Desktop section edit saves canonical membership and reads it back", async ({
  page,
}) => {
  let saved = {
    ...nextTask,
    memberships: [{ projectId, sectionId: null as string | null, position: 7 }],
  };
  await setup(page, {
    "planner.bootstrap": { ...bootstrap, projects: [project] },
    "planner.task": () => saved,
  });
  await page.route("**/api/capiro/planner.task.update", async (route) => {
    const body = route.request().postDataJSON().body;
    expect(body.version).toBe(saved.version);
    expect(body.data.memberships).toEqual([
      { projectId, sectionId, position: 7 },
    ]);
    saved = { ...saved, ...body.data, version: saved.version + 1 };
    await route.fulfill({ json: saved });
  });
  await page.goto(`/modules/planner?task=${taskId}`);
  await page.getByRole("button", { name: "Edit task", exact: true }).click();
  let editor = page.getByRole("dialog", { name: "Edit task", exact: true });
  await editor
    .getByLabel("Synthetic policy project section", { exact: true })
    .click();
  await expect(
    page.getByRole("option", { name: "Foreign section", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("option", { name: "Synthetic research", exact: true })
    .click();
  await editor.getByRole("button", { name: "Save task", exact: true }).click();
  await expect(editor).toBeHidden();
  await page.reload();
  await page.getByRole("button", { name: "Edit task", exact: true }).click();
  editor = page.getByRole("dialog", { name: "Edit task", exact: true });
  await expect(
    editor.getByLabel("Synthetic policy project section", { exact: true }),
  ).toHaveText("Synthetic research");
  expect(saved.version).toBe(2);
});

test("Desktop held section save stays frozen through breakpoint and native resubmission", async ({
  page,
}) => {
  await setup(page, {
    "planner.bootstrap": { ...bootstrap, projects: [project] },
    "planner.task": {
      ...nextTask,
      memberships: [{ projectId, sectionId, position: 7 }],
    },
  });
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let writes = 0;
  await page.route("**/api/capiro/planner.task.update", async (route) => {
    writes++;
    await held;
    await route.fulfill({
      status: 409,
      json: { message: "Synthetic held section conflict" },
    });
  });
  await page.goto(`/modules/planner?task=${taskId}`);
  await page.getByRole("button", { name: "Edit task", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Edit task", exact: true });
  await editor.getByRole("button", { name: "Save task", exact: true }).click();
  try {
    await expect(
      editor.getByLabel("Task name", { exact: true }),
    ).toBeDisabled();
    for (const width of [1023, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1040 });
      await editor
        .locator("form")
        .evaluate((form) => (form as HTMLFormElement).requestSubmit());
      const selectors = editor.getByRole("combobox");
      for (const select of await selectors.all())
        await expect(select).toBeDisabled();
      await page.keyboard.press("Escape");
      await expect(editor).toBeVisible();
      expect(writes).toBe(1);
    }
  } finally {
    release();
  }
  await expect(editor.getByRole("alert")).toContainText(
    "Synthetic held section conflict",
  );
  await expect(
    editor.getByLabel("Synthetic policy project section", { exact: true }),
  ).toBeEnabled();
  await expect(
    editor.getByLabel("Synthetic policy project section", { exact: true }),
  ).toHaveText("Synthetic research");
  expect(writes).toBe(1);
});

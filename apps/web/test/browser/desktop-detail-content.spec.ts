import { expect } from "@playwright/test";
import { test } from "./runtime-observed-test";
import {
  bootstrap,
  clientId,
  nextTask,
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
for (const colorScheme of ["light", "dark"] as const) {
  test(`Desktop task detail shows returned schedule and section with persistent actions ${colorScheme}`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width: 1440, height: 1040 });
    await page.emulateMedia({ colorScheme });
    const task = {
      ...nextTask,
      startOn: "2026-10-08",
      startTime: "09:00",
      dueTime: "17:00",
      timeZone: "America/New_York",
      recurrence: {
        frequency: "weekly",
        interval: 2,
        basedOn: "completion_date",
        weekdays: [1, 3],
        endsOn: "2026-12-31",
        anchorOn: "2026-10-01",
      },
      memberships: [{ projectId, sectionId, position: 7 }],
    };
    await setup(page, {
      "planner.bootstrap": { ...bootstrap, projects: [project] },
      "planner.task": task,
    });
    let writes = 0;
    for (const operation of [
      "planner.task.create",
      "planner.task.update",
      "planner.task.comment",
    ]) {
      await page.route(`**/api/capiro/${operation}`, async (route) => {
        writes++;
        await route.fulfill({
          status: 409,
          json: { message: "Unexpected synthetic detail write" },
        });
      });
    }
    await page.goto(`/modules/planner?task=${taskId}`);
    const dialog = page.getByRole("dialog", {
      name: nextTask.name,
      exact: true,
    });
    const fields = dialog.locator('[data-slot="task-detail-editor"]');
    await expect(fields).toBeVisible();
    for (const [label, value] of [
      ["Start date", "2026-10-08"],
      ["Due date", "2026-10-12"],
      ["Start time", "09:00"],
      ["Due time", "17:00"],
      ["Time zone", "America/New_York"],
      ["Repeat interval", "2"],
    ] as const)
      await expect(fields.getByLabel(label, { exact: true })).toHaveValue(
        value,
      );
    await expect(fields.getByLabel("Repeat", { exact: true })).toHaveText(
      "weekly",
    );
    await expect(
      fields.getByLabel("Synthetic current project section", { exact: true }),
    ).toHaveText("Synthetic current section");
    for (const [label, value] of [
      ["Repeat from", "Completion date"],
      ["Repeat on", "Monday, Wednesday"],
      ["Repeat ends", "2026-12-31"],
      ["Repeat anchor", "2026-10-01"],
    ] as const)
      await expect(
        fields
          .locator("dl > div")
          .filter({ has: page.getByText(label, { exact: true }) })
          .locator("dd"),
      ).toHaveText(value);
    await expect(fields.getByLabel("Description", { exact: true })).toHaveValue(
      task.description,
    );
    const footer = dialog.locator(":scope > footer");
    const before = await footer.boundingBox();
    await dialog
      .locator('[data-slot="modal-body"]')
      .evaluate((element) => (element.scrollTop = element.scrollHeight));
    expect(await footer.boundingBox()).toEqual(before);
    expect(before!.y + before!.height).toBeCloseTo(1039, 0);
    await expect(
      footer.getByRole("button", { name: "Edit task", exact: true }),
    ).toBeVisible();
    expect(writes).toBe(0);
    await dialog
      .locator('[data-slot="modal-body"]')
      .evaluate((element) => (element.scrollTop = 0));
    await page.screenshot({
      path: info.outputPath("desktop-task-detail-content.png"),
    });
    await expectAccessibleHome(page, info);
    await footer
      .getByRole("button", { name: "Edit task", exact: true })
      .click();
    const editor = page.getByRole("dialog", { name: "Edit task", exact: true });
    await expect(editor.getByLabel("Time zone", { exact: true })).toHaveValue(
      task.timeZone,
    );
    await page.keyboard.press("Escape");
    await expect(
      footer.getByRole("button", { name: "Edit task", exact: true }),
    ).toBeFocused();
  });
}
test("Desktop viewer can read schedule while task edit and archive remain unavailable", async ({
  page,
}) => {
  await setup(page, { "planner.task": { ...nextTask, access: "viewer" } });
  await page.goto(`/modules/planner?task=${taskId}`);
  const dialog = page.getByRole("dialog", { name: nextTask.name, exact: true });
  await expect(
    dialog.getByRole("region", { name: "Schedule", exact: true }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Edit task", exact: true }),
  ).toBeDisabled();
  await expect(
    dialog.getByRole("button", { name: "Archive", exact: true }),
  ).toBeDisabled();
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await expect(dialog).toBeHidden();
});

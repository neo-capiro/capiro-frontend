import {
  expect,
  type Locator,
  type Page,
  type TestInfo,
} from "@playwright/test";
import { test } from "./runtime-observed-test";
import { nextTask, setup, taskId } from "./next-modules-fixtures";
import { expectAccessibleHome } from "../accessibility";
import { tabTo, expectFocusEvidence } from "../accessibility-interaction";
import { expectRenderedContrast } from "../rendered-contrast";

async function expectScrollableEditor(
  page: Page,
  dialog: Locator,
  info: TestInfo,
) {
  const header = dialog.locator(":scope > header");
  expect((await header.boundingBox())!.height).toBeCloseTo(58, 0);
  await expect(header.getByRole("heading")).toHaveCSS("font-size", "14px");
  await dialog
    .getByText("More task options", {
      exact: true,
    })
    .click();
  const content = dialog.locator('[data-slot="task-editor-content"]');
  const footer = dialog.locator('[data-slot="task-editor-footer"]');
  const before = await footer.boundingBox();
  await content.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  expect(
    await content.evaluate((element) => element.scrollTop),
  ).toBeGreaterThan(0);
  const after = await footer.boundingBox();
  expect(after).toEqual(before);
  expect(after!.y + after!.height).toBeCloseTo(1039, 0);
  const save = dialog.getByRole("button", { name: "Save task", exact: true });
  const saveBounds = await save.boundingBox();
  expect(saveBounds!.x + saveBounds!.width).toBeCloseTo(1411, 0);
  expect(saveBounds!.y).toBeGreaterThanOrEqual(after!.y);
  await tabTo(page, save);
  await expectFocusEvidence(save, info);
  await expectRenderedContrast(save, info, "Desktop persistent save");
  await page.screenshot({
    path: info.outputPath("desktop-editor-scrolled.png"),
  });
  await info.attach("persistent-footer", {
    body: JSON.stringify({ before, after, saveBounds }),
    contentType: "application/json",
  });
}

for (const colorScheme of ["light", "dark"] as const) {
  for (const state of ["new", "detail", "edit", "subtask"] as const) {
    test(`Desktop Planner ${state} uses the Figma drawer at 1440 ${colorScheme}`, async ({
      page,
    }, info) => {
      await page.setViewportSize({ width: 1440, height: 1040 });
      await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
      await setup(page);
      await page.goto(
        state === "new"
          ? "/modules/planner"
          : `/modules/planner?task=${taskId}`,
      );
      if (state === "new")
        await page
          .getByRole("button", { name: "+ New task", exact: true })
          .click();
      if (state === "edit")
        await page
          .getByRole("button", { name: "Edit task", exact: true })
          .click();
      if (state === "subtask")
        await page
          .getByRole("button", { name: "+ Subtask", exact: true })
          .click();
      const title =
        state === "new"
          ? "New task"
          : state === "edit"
            ? "Edit task"
            : state === "subtask"
              ? "Add subtask"
              : nextTask.name;
      const dialog = page.getByRole("dialog", { name: title, exact: true });
      await expect(dialog).toBeVisible();
      const bounds = await dialog.boundingBox();
      await info.attach("drawer-geometry", {
        body: JSON.stringify({
          state,
          colorScheme,
          reference: state === "detail" ? "411:100367" : "819:146214",
          bounds,
        }),
        contentType: "application/json",
      });
      await page.screenshot({ path: info.outputPath("desktop-drawer.png") });
      expect(bounds!.x).toBeCloseTo(760, 0);
      expect(bounds!.y).toBeCloseTo(0, 0);
      expect(bounds!.width).toBeCloseTo(680, 0);
      expect(bounds!.height).toBeCloseTo(1040, 0);
      if (state !== "detail") await expectScrollableEditor(page, dialog, info);
      await expectAccessibleHome(page, info);
      if (state === "edit" || state === "subtask")
        await page.keyboard.press("Escape");
      else
        await dialog
          .getByRole("button", { name: "Close dialog", exact: true })
          .click();
      await expect(dialog).toBeHidden();
      if (state === "edit" || state === "subtask") {
        await expect(
          page.getByRole("dialog", { name: nextTask.name, exact: true }),
        ).toBeVisible();
        await expect(
          page.getByRole("button", {
            name: state === "edit" ? "Edit task" : "+ Subtask",
            exact: true,
          }),
        ).toBeFocused();
      }
      if (state === "new")
        await expect(
          page.getByRole("button", { name: "+ New task", exact: true }),
        ).toBeFocused();
    });
  }
}

for (const colorScheme of ["light", "dark"] as const) {
  test(`Desktop long task description keeps the body and nested editor reachable at 1440 ${colorScheme}`, async ({
    page,
  }, info) => {
    const description =
      "Synthetic task context with a complete permitted description. ".repeat(
        700,
      );
    await page.setViewportSize({ width: 1440, height: 1040 });
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    await setup(page, { "planner.task": { ...nextTask, description } });
    await page.goto(`/modules/planner?task=${taskId}`);
    const detail = page.getByRole("dialog", {
      name: nextTask.name,
      exact: true,
    });
    await expect(detail).toBeVisible();
    await expect(detail.locator('[data-slot="dialog-description"]')).toHaveText(
      description,
    );
    const header = detail.locator(":scope > header");
    expect((await header.boundingBox())!.height).toBeLessThanOrEqual(180);
    const body = detail.locator('[data-slot="modal-body"]');
    expect((await body.boundingBox())!.height).toBeGreaterThan(800);
    const close = header.getByRole("button", {
      name: "Close dialog",
      exact: true,
    });
    await close.focus();
    await expect(
      detail.getByRole("region", { name: "Description", exact: true }),
    ).toHaveText(`Description${description}`);
    const subtask = detail.getByRole("button", {
      name: "+ Subtask",
      exact: true,
    });
    await tabTo(page, subtask);
    await expectFocusEvidence(subtask, info);
    await expect
      .poll(() => body.evaluate((element) => element.scrollTop))
      .toBeGreaterThan(0);
    const edit = detail.getByRole("button", { name: "Edit task", exact: true });
    await tabTo(page, edit);
    await expectFocusEvidence(edit, info);
    await edit.press("Enter");
    await expect(
      page.getByRole("dialog", { name: "Edit task", exact: true }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(detail).toBeVisible();
    await expect(edit).toBeFocused();
    await expectAccessibleHome(page, info);
    await page.screenshot({
      path: info.outputPath("desktop-long-description.png"),
    });
  });
}

test("Desktop Planner pending native resubmission keeps one request and the visible footer disabled", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1440, height: 1040 });
  await setup(page);
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
      json: { message: "Synthetic pending resubmission conflict" },
    });
  });
  await page.goto("/modules/planner");
  await page.getByRole("button", { name: "+ New task", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "New task", exact: true });
  const name = dialog.getByLabel("Task name", { exact: true });
  await name.fill("Test submitted desktop draft");
  await dialog.getByRole("button", { name: "Save task", exact: true }).click();
  try {
    await expect(name).toBeDisabled();
    await dialog.locator("form").evaluate((form) => {
      (form as HTMLFormElement).requestSubmit();
      (form as HTMLFormElement).requestSubmit();
    });
    const footer = dialog.locator('[data-slot="task-editor-footer"]');
    await expect(
      footer.getByRole("button", { name: "Cancel", exact: true }),
    ).toBeDisabled();
    await expect(
      footer.getByRole("button", { name: "Saving…", exact: true }),
    ).toBeDisabled();
    const bounds = await footer.boundingBox();
    expect(bounds!.y + bounds!.height).toBeCloseTo(1039, 0);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeVisible();
    expect(writes).toBe(1);
    await page.screenshot({
      path: info.outputPath("desktop-pending-footer.png"),
    });
  } finally {
    release();
  }
  await expect(dialog.getByRole("alert")).toContainText(
    "Synthetic pending resubmission conflict",
  );
  await expect(name).toBeEnabled();
  await expect(name).toHaveValue("Test submitted desktop draft");
  expect(writes).toBe(1);
});

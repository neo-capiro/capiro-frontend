import { expect } from "@playwright/test";
import { test } from "./runtime-observed-test";
import { nextTask, setup, taskId } from "./next-modules-fixtures";
import { expectAccessibleHome } from "../accessibility";
import {
  binding,
  boundTask,
  clientId,
  taskId as objectiveTaskId,
} from "../../tests/objective-work-fixtures";
const source =
  '### Saved heading\r\n\r\n**Bold** and *italic*\r\n\r\n- [ ] Open\r\n- [x] Done\r\n\r\n[Safe](https://example.test/path) [Unsafe](javascript:alert(1))\r\n\r\n<img src=x onerror="window.markdownExecuted=true">\r\n\r\n![Tracking](https://tracker.invalid/a)';
test("preview renders Markdown/GFM safely and an unchanged save preserves every stored byte", async ({
  page,
}, info) => {
  await setup(page, { "planner.task": { ...nextTask, description: source } });
  const writes: unknown[] = [];
  await page.route("**/api/capiro/planner.task.update", (route) => {
    const body = route.request().postDataJSON().body;
    writes.push(body);
    return route.fulfill({ json: { ...nextTask, ...body.data, version: 2 } });
  });
  await page.goto(`/modules/planner?task=${taskId}`);
  const dialog = page.getByRole("dialog", { name: nextTask.name, exact: true });
  await expect(dialog).toHaveAccessibleDescription(
    "Review task details, description and activity.",
  );
  const toolbar = dialog.getByRole("toolbar", {
    name: "Description formatting",
    exact: true,
  });
  await toolbar.getByRole("button", { name: "Preview", exact: true }).click();
  const preview = dialog.getByRole("region", { name: "Description preview" });
  await expect(
    preview.getByRole("heading", { name: "Saved heading", exact: true }),
  ).toBeVisible();
  await expect(preview.locator("strong")).toHaveText("Bold");
  await expect(preview.getByRole("checkbox")).toHaveCount(2);
  await expect(preview.getByRole("checkbox").first()).toBeDisabled();
  await expect(
    preview.getByRole("link", { name: "Safe", exact: true }),
  ).toHaveAttribute("href", "https://example.test/path");
  await expect(
    preview.getByRole("link", { name: "Unsafe", exact: true }),
  ).toHaveCount(0);
  await expect(preview.locator("img,script,iframe")).toHaveCount(0);
  expect(
    await page.evaluate(() =>
      Boolean(
        (window as unknown as { markdownExecuted?: boolean }).markdownExecuted,
      ),
    ),
  ).toBe(false);
  expect(writes).toHaveLength(0);
  await expectAccessibleHome(page, info);
  await page.screenshot({
    path: info.outputPath("markdown-preview-desktop.png"),
  });
  await toolbar.getByRole("button", { name: "Preview", exact: true }).click();
  await dialog.getByRole("button", { name: "Save task", exact: true }).click();
  await expect(dialog).toBeHidden();
  expect(writes).toHaveLength(1);
  expect(
    (writes[0] as { data: { description: string } }).data.description,
  ).toBe(source);
});
test("toolbar and shortcuts retain selection and native undo/redo without HTML conversion", async ({
  page,
}, info) => {
  await setup(page, {
    "planner.task": { ...nextTask, description: "Alpha beta" },
  });
  await page.goto(`/modules/planner?task=${taskId}`);
  const dialog = page.getByRole("dialog", { name: nextTask.name, exact: true });
  const input = dialog.getByLabel("Description", { exact: true });
  const toolbar = dialog.getByRole("toolbar", {
    name: "Description formatting",
  });
  await input.focus();
  await input.evaluate((node) =>
    (node as HTMLTextAreaElement).setSelectionRange(0, 5),
  );
  await toolbar.getByRole("button", { name: "Bold", exact: true }).click();
  await expect(input).toHaveValue("**Alpha** beta");
  expect(
    await input.evaluate((node) => [
      (node as HTMLTextAreaElement).selectionStart,
      (node as HTMLTextAreaElement).selectionEnd,
    ]),
  ).toEqual([2, 7]);
  await input.press("Control+z");
  await expect(input).toHaveValue("Alpha beta");
  await input.press("Control+Shift+z");
  await expect(input).toHaveValue("**Alpha** beta");
  await input.evaluate((node) =>
    (node as HTMLTextAreaElement).setSelectionRange(2, 7),
  );
  await input.press("Control+i");
  await expect(input).toHaveValue("***Alpha*** beta");
  for (const [name, expected] of [
    ["Heading", "### one\n### two"],
    ["List", "- one\n- two"],
    ["Checklist", "- [ ] one\n- [ ] two"],
  ] as const) {
    await input.fill("one\ntwo");
    await input.evaluate((node) =>
      (node as HTMLTextAreaElement).setSelectionRange(0, 7),
    );
    await toolbar.getByRole("button", { name, exact: true }).click();
    await expect(input).toHaveValue(expected!);
  }
  await toolbar.getByRole("button", { name: "Bold", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    toolbar.getByRole("button", { name: "Italic", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("End");
  await expect(
    toolbar.getByRole("button", { name: "Preview", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(
    dialog.getByRole("region", { name: "Description preview" }),
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath("markdown-toolbar-desktop.png"),
  });
});
test("link insertion rejects unsafe URLs, restores selection for native undo, and refuses oversize formatting", async ({
  page,
}) => {
  await setup(page, { "planner.task": { ...nextTask, description: "Alpha" } });
  let writes = 0;
  await page.route("**/api/capiro/planner.task.update", (route) => {
    writes++;
    return route.fulfill({
      status: 500,
      json: { message: "Unexpected write" },
    });
  });
  await page.goto(`/modules/planner?task=${taskId}`);
  const dialog = page.getByRole("dialog", { name: nextTask.name, exact: true });
  const toolbar = dialog.getByRole("toolbar", {
    name: "Description formatting",
    exact: true,
  });
  const input = dialog.getByLabel("Description", { exact: true });
  await input.focus();
  await input.evaluate((node) =>
    (node as HTMLTextAreaElement).setSelectionRange(0, 5),
  );
  await toolbar.getByRole("button", { name: "Link", exact: true }).click();
  const link = page.getByRole("dialog", {
    name: "Insert description link",
    exact: true,
  });
  await link
    .getByLabel("Link URL", { exact: true })
    .fill("javascript:alert(1)");
  await link.getByRole("button", { name: "Insert link", exact: true }).click();
  await expect(link.getByRole("alert")).toContainText("Use an http");
  await link
    .getByLabel("Link URL", { exact: true })
    .fill("https://example.test/a(b)");
  await link.getByRole("button", { name: "Insert link", exact: true }).click();
  await expect(link).toBeHidden();
  await expect(input).toHaveValue("[Alpha](https://example.test/a%28b%29)");
  await expect(input).toBeFocused();
  await input.press("Control+z");
  await expect(input).toHaveValue("Alpha");
  await input.fill("A".repeat(50000));
  await input.evaluate((node) =>
    (node as HTMLTextAreaElement).setSelectionRange(0, 1),
  );
  await toolbar.getByRole("button", { name: "Bold", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("character limit");
  expect((await input.inputValue()).length).toBe(50000);
  expect(writes).toBe(0);
});

test("linked Objective task description uses the same safe Markdown reader", async ({
  page,
}) => {
  await setup(page, {
    "planner.objectiveDestination": {
      ...boundTask,
      task: { ...boundTask.task, description: source },
    },
  });
  await page.route("**/api/backend/core/clients/*", (route) =>
    route.fulfill({
      json: {
        id: clientId,
        name: "Synthetic client",
        status: "ACTIVE",
        profileStatus: "ACTIVE",
      },
    }),
  );
  await page.goto(
    `/modules/planner?${new URLSearchParams({ taskId: objectiveTaskId, clientId, objectiveId: binding.objectiveId, objectiveVersion: "1" })}`,
  );
  await expect(
    page.getByRole("heading", { name: boundTask.task.name, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Saved heading", exact: true }),
  ).toBeVisible();
  await expect(page.locator("strong")).toHaveText("Bold");
  await expect(
    page.getByRole("link", { name: "Unsafe", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.locator(
      'img[src="x"],img[src*="tracker.invalid"],script[src="x"],iframe',
    ),
  ).toHaveCount(0);
});
test("readonly description rendering and receipt replacement never retain a former link draft", async ({
  page,
}) => {
  await setup(page);
  await page.goto("/__test/task-detail-refresh");
  await page
    .getByRole("toolbar", { name: "Description formatting", exact: true })
    .getByRole("button", { name: "Link", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "Insert description link", exact: true })
    .getByLabel("Link URL")
    .fill("https://example.test/stale");
  await page.evaluate(
    (task) =>
      dispatchEvent(
        new CustomEvent("capiro-task-receipt-refresh", {
          detail: {
            ...task,
            version: 2,
            access: "viewer",
            description: "### Current receipt\n\n**Readable**",
          },
        }),
      ),
    nextTask,
  );
  await expect(
    page.getByRole("dialog", { name: "Insert description link", exact: true }),
  ).toHaveCount(0);
  const dialog = page.getByRole("dialog", { name: nextTask.name, exact: true });
  await expect(
    dialog.getByRole("heading", { name: "Current receipt", exact: true }),
  ).toBeVisible();
  await expect(dialog.locator("strong")).toHaveText("Readable");
  await expect(dialog.getByRole("link", { name: "stale" })).toHaveCount(0);
  await expect(page.getByTestId("task-saved")).toHaveText("Saved callbacks: 0");
});
test("pending save synchronously fences formatting and link changes", async ({
  page,
}) => {
  await setup(page);
  let release!: () => void;
  const held = new Promise<void>((resolve) => (release = resolve));
  let submitted = "";
  await page.route("**/api/capiro/planner.task.update", async (route) => {
    submitted = route.request().postDataJSON().body.data.description;
    await held;
    await route.fulfill({
      status: 409,
      json: { message: "Synthetic held save" },
    });
  });
  await page.goto(`/modules/planner?task=${taskId}`);
  const dialog = page.getByRole("dialog", { name: nextTask.name, exact: true });
  const toolbar = dialog.getByRole("toolbar", {
    name: "Description formatting",
    exact: true,
  });
  await dialog.locator('[data-slot="task-detail-editor"]').evaluate((form) => {
    (form as HTMLFormElement).requestSubmit();
    form.querySelector<HTMLButtonElement>('button[aria-label="Bold"]')?.click();
  });
  try {
    await expect.poll(() => submitted).toBe(nextTask.description);
    await expect(
      toolbar.getByRole("button", { name: "Bold", exact: true }),
    ).toBeDisabled();
    await expect(
      toolbar.getByRole("button", { name: "Link", exact: true }),
    ).toBeDisabled();
    await expect(dialog.getByLabel("Description", { exact: true })).toHaveValue(
      nextTask.description,
    );
  } finally {
    release();
  }
  await expect(dialog.getByRole("alert")).toHaveText("Synthetic held save");
});

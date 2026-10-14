import { expect } from "@playwright/test";
import { test } from "./runtime-observed-test";
import {
  clientId,
  nextTask,
  otherTaskId,
  setup,
  taskId,
  navigate,
} from "./next-modules-fixtures";
const eventId = "54000000-0000-4000-8000-000000000001";
const commentReceipt = {
  id: eventId,
  kind: "comment",
  text: "Synthetic captured comment",
  createdAt: "2026-10-14T19:00:00Z",
  minutes: null,
  actorId: "test-user",
};
for (const outcome of ["success", "rejection"] as const) {
  test(`Desktop task comment ${outcome} freezes the captured draft and sends one request`, async ({
    page,
  }) => {
    await setup(page);
    let release!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    let writes = 0;
    await page.route("**/api/capiro/planner.task.comment", async (route) => {
      writes++;
      await held;
      await route.fulfill(
        outcome === "success"
          ? { json: commentReceipt }
          : { status: 409, json: { message: "Synthetic comment refusal" } },
      );
    });
    await page.goto(`/modules/planner?task=${taskId}`);
    const dialog = page.getByRole("dialog", {
      name: nextTask.name,
      exact: true,
    });
    const comment = dialog.getByLabel("Comment", { exact: true });
    await comment.fill(commentReceipt.text);
    await dialog
      .getByRole("button", { name: "Post comment", exact: true })
      .click();
    try {
      await expect(comment).toBeDisabled();
      await comment.locator("xpath=ancestor::form").evaluate((form) => {
        (form as HTMLFormElement).requestSubmit();
        (form as HTMLFormElement).requestSubmit();
      });
      await expect(
        dialog.getByRole("button", { name: "Edit task", exact: true }),
      ).toBeDisabled();
      await expect(
        dialog.getByRole("button", { name: "Archive", exact: true }),
      ).toBeDisabled();
      await expect(
        dialog.getByRole("button", { name: "+ Subtask", exact: true }),
      ).toBeDisabled();
      await page.keyboard.press("Escape");
      await expect(dialog).toBeVisible();
      expect(writes).toBe(1);
    } finally {
      release();
    }
    if (outcome === "success") await expect(comment).toHaveValue("");
    else {
      await expect(dialog.getByRole("alert")).toContainText(
        "Synthetic comment refusal",
      );
      await expect(comment).toHaveValue(commentReceipt.text);
    }
    await expect(comment).toBeEnabled();
    expect(writes).toBe(1);
  });
}
test("Desktop native comment resubmission cannot dispatch while the first post is held", async ({
  page,
}) => {
  await setup(page);
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let writes = 0;
  await page.route("**/api/capiro/planner.task.comment", async (route) => {
    writes++;
    await held;
    await route.fulfill({
      status: 409,
      json: { message: "Synthetic held comment" },
    });
  });
  await page.goto(`/modules/planner?task=${taskId}`);
  const dialog = page.getByRole("dialog", { name: nextTask.name, exact: true });
  const comment = dialog.getByLabel("Comment", { exact: true });
  await comment.fill(commentReceipt.text);
  await dialog
    .getByRole("button", { name: "Post comment", exact: true })
    .click();
  try {
    await expect.poll(() => writes).toBe(1);
    await comment.locator("xpath=ancestor::form").evaluate((form) => {
      (form as HTMLFormElement).requestSubmit();
      (form as HTMLFormElement).requestSubmit();
    });
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
    );
    expect(writes).toBe(1);
  } finally {
    release();
  }
  await expect(dialog.getByRole("alert")).toContainText(
    "Synthetic held comment",
  );
  expect(writes).toBe(1);
});
test("Desktop comment completion after task replacement cannot clear the replacement draft", async ({
  page,
}) => {
  const other = {
    ...nextTask,
    id: otherTaskId,
    name: "Synthetic replacement task",
  };
  await setup(page, {
    "planner.task": (input) =>
      (input as { params: { id: string } }).params.id === taskId
        ? nextTask
        : other,
  });
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/capiro/planner.task.comment", async (route) => {
    await held;
    await route.fulfill({ json: commentReceipt }).catch(() => undefined);
  });
  await page.goto(`/modules/planner?task=${taskId}`);
  let dialog = page.getByRole("dialog", { name: nextTask.name, exact: true });
  await dialog.getByLabel("Comment", { exact: true }).fill(commentReceipt.text);
  await dialog
    .getByRole("button", { name: "Post comment", exact: true })
    .click();
  await expect(dialog.getByLabel("Comment", { exact: true })).toBeDisabled();
  await navigate(page, `/modules/planner?task=${otherTaskId}`);
  dialog = page.getByRole("dialog", { name: other.name, exact: true });
  await dialog
    .getByLabel("Comment", { exact: true })
    .fill("Synthetic replacement draft");
  release();
  await expect(dialog.getByLabel("Comment", { exact: true })).toHaveValue(
    "Synthetic replacement draft",
  );
  await expect(dialog.getByRole("alert")).toHaveCount(0);
});
test("Desktop subtasks use parent and cursor reads and open a fresh current child receipt", async ({
  page,
}) => {
  const childA = {
    ...nextTask,
    id: otherTaskId,
    name: "Synthetic child A",
    parentId: taskId,
    clientId,
  };
  const childB = {
    ...childA,
    id: "51000000-0000-4000-8000-000000000003",
    name: "Synthetic child B",
  };
  const seen: { parentId?: string; cursor?: string }[] = [];
  let childReads = 0;
  await setup(page, {
    "planner.task": (input) => {
      const id = (input as { params: { id: string } }).params.id;
      if (id === childB.id) {
        childReads++;
        return childB;
      }
      return { ...nextTask, clientId };
    },
    "planner.tasks": (input) => {
      const query = (
        input as { query?: { parentId?: string; cursor?: string } }
      ).query;
      if (!query?.parentId)
        return { items: [{ ...nextTask, clientId }], nextCursor: null };
      seen.push(query);
      return query.cursor
        ? { items: [childB], nextCursor: null }
        : { items: [childA], nextCursor: childA.id };
    },
  });
  await page.goto(
    `/modules/planner?task=${taskId}&clientId=${clientId}&view=all-tasks`,
  );
  const dialog = page.getByRole("dialog", { name: nextTask.name, exact: true });
  await expect(
    dialog.getByRole("link", { name: childA.name, exact: true }),
  ).toBeVisible();
  await dialog
    .getByRole("button", { name: "Next subtask page", exact: true })
    .click();
  await expect(
    dialog.getByRole("link", { name: childA.name, exact: true }),
  ).toHaveCount(0);
  const link = dialog.getByRole("link", { name: childB.name, exact: true });
  await expect(link).toBeVisible();
  expect(seen).toEqual([
    { parentId: taskId },
    { parentId: taskId, cursor: childA.id },
  ]);
  await link.click();
  await expect(page).toHaveURL(new RegExp(`task=${childB.id}`));
  await expect(page).toHaveURL(new RegExp(`clientId=${clientId}`));
  await expect(page).toHaveURL(/view=all-tasks/);
  await expect(
    page.getByRole("dialog", { name: childB.name, exact: true }),
  ).toBeVisible();
  expect(childReads).toBe(1);
});
test("Desktop foreign-parent subtask receipts expose no navigable child", async ({
  page,
}) => {
  await setup(page, {
    "planner.tasks": (input) =>
      (input as { query?: { parentId?: string } }).query?.parentId
        ? {
            items: [
              {
                ...nextTask,
                id: otherTaskId,
                name: "Synthetic foreign child",
                parentId: null,
              },
            ],
            nextCursor: null,
          }
        : { items: [nextTask], nextCursor: null },
  });
  await page.goto(`/modules/planner?task=${taskId}`);
  const dialog = page.getByRole("dialog", { name: nextTask.name, exact: true });
  await expect(dialog.getByRole("alert")).toContainText(
    "Subtasks could not be verified for this task.",
  );
  await expect(
    dialog.getByRole("link", { name: "Synthetic foreign child", exact: true }),
  ).toHaveCount(0);
});

for (const paged of [false, true]) {
  test(`Desktop saved subtask refreshes ${paged ? "the paged list from its first page" : "the initially empty first page"}`, async ({
    page,
  }) => {
    const existing = {
      ...nextTask,
      id: "51000000-0000-4000-8000-000000000003",
      name: "Synthetic existing subtask",
      parentId: taskId,
    };
    const saved = {
      ...nextTask,
      id: otherTaskId,
      name: "Synthetic new saved subtask",
      parentId: taskId,
    };
    let created = false;
    const reads: (string | undefined)[] = [];
    await setup(page, {
      "planner.tasks": (input) => {
        const query = (
          input as { query?: { parentId?: string; cursor?: string } }
        ).query;
        if (!query?.parentId) return { items: [nextTask], nextCursor: null };
        reads.push(query.cursor);
        return created
          ? { items: [saved], nextCursor: null }
          : paged
            ? {
                items: [existing],
                nextCursor: query.cursor ? null : existing.id,
              }
            : { items: [], nextCursor: null };
      },
    });
    await page.route("**/api/capiro/planner.task.create", async (route) => {
      const input = route.request().postDataJSON();
      expect(input.body.data.parentId).toBe(taskId);
      expect(input.body.data.name).toBe(saved.name);
      created = true;
      await route.fulfill({ json: saved });
    });
    await page.goto(`/modules/planner?task=${taskId}`);
    const detail = page.getByRole("dialog", {
      name: nextTask.name,
      exact: true,
    });
    if (paged) {
      await detail
        .getByRole("button", { name: "Next subtask page", exact: true })
        .click();
      await expect(
        detail.getByRole("button", { name: "First subtask page", exact: true }),
      ).toBeVisible();
    } else
      await expect(
        detail.getByRole("heading", {
          name: "No subtasks on this page",
          exact: true,
        }),
      ).toBeVisible();
    await detail
      .getByRole("button", { name: "+ Subtask", exact: true })
      .click();
    const editor = page.getByRole("dialog", {
      name: "Add subtask",
      exact: true,
    });
    await editor.getByLabel("Task name", { exact: true }).fill(saved.name);
    await editor
      .getByRole("button", { name: "Save task", exact: true })
      .click();
    await expect(editor).toBeHidden();
    await expect(
      detail.getByRole("link", { name: saved.name, exact: true }),
    ).toBeVisible();
    await expect(
      detail.getByRole("button", { name: "First subtask page", exact: true }),
    ).toHaveCount(0);
    expect(reads).toEqual(
      paged ? [undefined, existing.id, undefined] : [undefined, undefined],
    );
  });
}

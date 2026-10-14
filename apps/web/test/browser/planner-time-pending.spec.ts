import { expect } from "@playwright/test";
import { test } from "./runtime-observed-test";
import {
  navigate,
  nextTask,
  otherTaskId,
  setup,
  taskId,
} from "./next-modules-fixtures";
const settings = {
  version: 1,
  canManage: true,
  reviewers: {},
  options: {
    timeTrackingEnabled: true,
    billableEnabled: true,
    billableDefault: false,
    generalWorkEnabled: true,
    approvalProcess: "simple",
    categories: [],
    pastLockWeeks: null,
    futureWeeks: null,
    timeZone: "America/New_York",
  },
};
const receipt = {
  id: "54000000-0000-4000-8000-000000000001",
  kind: "time",
  text: "Synthetic captured time",
  minutes: 60,
  actorId: "test-user",
  createdAt: "2026-10-08T16:00:00Z",
};
for (const outcome of ["success", "rejection"] as const) {
  test(`held time ${outcome} freezes input and dismissal and admits one native submission`, async ({
    page,
  }) => {
    await setup(page, { "planner.time.settings": settings });
    let writes = 0,
      release!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route("**/api/capiro/planner.time.add", async (route) => {
      writes++;
      expect(route.request().postDataJSON()).toMatchObject({
        params: { id: taskId },
        body: {
          minutes: 60,
          text: receipt.text,
          time: { timeZone: "America/New_York" },
        },
      });
      await held;
      await route.fulfill(
        outcome === "success"
          ? { json: receipt }
          : { status: 409, json: { message: "Synthetic time rejection" } },
      );
    });
    await page.goto(`/modules/planner?task=${taskId}`);
    await page
      .getByRole("dialog", { name: nextTask.name, exact: true })
      .getByRole("button", { name: "Add time", exact: true })
      .click();
    const dialog = page.getByRole("dialog", { name: "Add time", exact: true });
    await dialog.getByLabel("Description", { exact: true }).fill(receipt.text);
    await dialog.locator("form").evaluate((form) => {
      (form as HTMLFormElement).requestSubmit();
      (form as HTMLFormElement).requestSubmit();
      (form as HTMLFormElement).requestSubmit();
    });
    try {
      await expect.poll(() => writes).toBe(1);
      for (const label of [
        "Worked on",
        "Minutes",
        "Project",
        "Description",
        "Billable",
      ])
        await expect(dialog.getByLabel(label, { exact: true })).toBeDisabled();
      await expect(
        dialog.getByRole("button", { name: "Cancel", exact: true }),
      ).toBeDisabled();
      await dialog.locator("form").evaluate((form) => {
        (form as HTMLFormElement).requestSubmit();
        (form as HTMLFormElement).requestSubmit();
      });
      await page.keyboard.press("Escape");
      await dialog
        .getByRole("button", { name: "Close dialog", exact: true })
        .click();
      await page.mouse.click(5, 100);
      await expect(dialog).toBeVisible();
      expect(writes).toBe(1);
    } finally {
      release();
    }
    if (outcome === "success") await expect(dialog).toHaveCount(0);
    else {
      await expect(dialog.getByRole("alert")).toHaveText(
        "Synthetic time rejection",
      );
      await expect(
        dialog.getByLabel("Description", { exact: true }),
      ).toHaveValue(receipt.text);
      await expect(dialog.getByLabel("Minutes", { exact: true })).toBeEnabled();
      await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
      await expect(dialog).toHaveCount(0);
    }
    expect(writes).toBe(1);
  });
}
test("replaced task retires held time completion without closing its replacement", async ({
  page,
}) => {
  await setup(page, { "planner.time.settings": settings });
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let settled!: () => void;
  const settledRoute = new Promise<void>((resolve) => {
    settled = resolve;
  });
  let writes = 0;
  await page.route("**/api/capiro/planner.time.add", async (route) => {
    writes++;
    await held;
    try {
      await route.fulfill({ json: receipt });
    } catch (cause) {
      if (!route.request().failure()) throw cause;
    } finally {
      settled();
    }
  });
  await page.route("**/api/capiro/planner.task?*", (route) =>
    route.fulfill({
      json: route.request().url().includes(otherTaskId)
        ? { ...nextTask, id: otherTaskId, name: "Synthetic replacement task" }
        : nextTask,
    }),
  );
  await page.goto(`/modules/planner?task=${taskId}`);
  await page
    .getByRole("dialog", { name: nextTask.name, exact: true })
    .getByRole("button", { name: "Add time", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Add time", exact: true });
  await dialog.getByLabel("Description", { exact: true }).fill(receipt.text);
  await dialog.getByRole("button", { name: "Add time", exact: true }).click();
  try {
    await expect.poll(() => writes).toBe(1);
    const retired = page.waitForEvent("requestfailed", {
      predicate: (request) =>
        request.url().endsWith("/api/capiro/planner.time.add"),
    });
    await navigate(page, `/modules/planner?task=${otherTaskId}`);
    await retired;
    await expect(
      page.getByRole("dialog", {
        name: "Synthetic replacement task",
        exact: true,
      }),
    ).toBeVisible();
  } finally {
    release();
  }
  await settledRoute;
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  await expect(
    page.getByRole("dialog", {
      name: "Synthetic replacement task",
      exact: true,
    }),
  ).toBeVisible();
  expect(writes).toBe(1);
});

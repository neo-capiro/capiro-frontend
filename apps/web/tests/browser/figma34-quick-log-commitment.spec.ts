import { expect, test } from "@playwright/test";
import { clientId, json } from "./fixtures";
import { installRemoval } from "./overview-removal-fixtures";

async function fillCommitment(page: import("@playwright/test").Page) {
  await page.goto(`/portfolio/${clientId}?log=1`);
  const dialog = page.getByRole("dialog", { name: "Quick log", exact: true });
  await dialog
    .getByRole("combobox", { name: "Activity type" })
    .selectOption("commitment");
  await dialog
    .getByLabel("Title", { exact: true })
    .fill("Synthetic commitment");
  await dialog
    .getByLabel("Details", { exact: true })
    .fill("Promised a one-pager");
  await dialog.getByLabel("When", { exact: true }).fill("2026-10-05T21:40");
  await dialog.getByLabel("Due date", { exact: true }).fill("2026-10-22");
  return dialog;
}

test("commitment sends Core's supported occurrence and due fields and retains exact Undo", async ({
  page,
}, info) => {
  const { state, unexpected } = await installRemoval(page);
  const posts: Record<string, unknown>[] = [];
  page.on("request", (request) => {
    if (
      request.method() === "POST" &&
      new URL(request.url()).pathname ===
        `/api/backend/core/clients/${clientId}/activity-commands`
    )
      posts.push(request.postDataJSON().activity);
  });
  const dialog = await fillCommitment(page);
  await expect(
    dialog.getByText("Due at 11:59 p.m. in your local time."),
  ).toBeVisible();
  await expect(
    dialog.getByRole("checkbox", { name: "Add generic follow-up" }),
  ).toBeEnabled();
  await page.screenshot({
    path: info.outputPath("commitment-direct-1440x1040.png"),
  });
  await dialog
    .getByRole("button", { name: "Save activity", exact: true })
    .click();
  await dialog.getByRole("button", { name: "Done", exact: true }).click();
  const result = page.getByRole("complementary", { name: "Quick log result" });
  await expect(result).toContainText("Logged to Test Aerospace");
  expect(state.posts).toBe(1);
  expect(posts).toHaveLength(1);
  expect(posts[0]).toMatchObject({
    kind: "commitment",
    title: "Synthetic commitment",
    body: "Promised a one-pager",
  });
  expect(new Date(String(posts[0]?.occurredAt)).getTime()).toBe(
    new Date("2026-10-05T21:40").getTime(),
  );
  expect(new Date(String(posts[0]?.dueAt)).getTime()).toBe(
    new Date("2026-10-22T23:59:59").getTime(),
  );
  await result.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(result).toContainText("Quick log removed");
  expect(state.deletes).toHaveLength(1);
  expect(unexpected).toEqual([]);
});

test("a command whose current commitment has a different due date freezes retry and Undo", async ({
  page,
}) => {
  const { state, unexpected } = await installRemoval(page);
  await page.route(
    `**/api/backend/core/clients/${clientId}/activity?limit=500`,
    (route) => {
      return json(
        route,
        state.activities.map((row) => ({ ...row, dueAt: null })),
      );
    },
  );
  const dialog = await fillCommitment(page);
  await dialog
    .getByRole("button", { name: "Save activity", exact: true })
    .click();
  await expect(dialog).toContainText(
    "command activity details are not confirmed",
  );
  await expect(
    dialog.getByRole("button", { name: "Save activity", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Undo", exact: true }),
  ).toHaveCount(0);
  expect(state.posts).toBe(1);
  expect(unexpected).toEqual([]);
});

test("blank When explicitly records at save time without sending a stale timestamp", async ({
  page,
}, info) => {
  const { unexpected } = await installRemoval(page);
  const posts: Record<string, unknown>[] = [];
  page.on("request", (request) => {
    if (
      request.method() === "POST" &&
      new URL(request.url()).pathname ===
        `/api/backend/core/clients/${clientId}/activity-commands`
    )
      posts.push(request.postDataJSON().activity);
  });
  await page.goto(`/portfolio/${clientId}?log=1`);
  const dialog = page.getByRole("dialog", { name: "Quick log", exact: true });
  await expect(dialog.getByLabel("When", { exact: true })).toHaveValue("");
  await expect(dialog).toContainText(
    "Leave blank to record the time when saved.",
  );
  await page.screenshot({
    path: info.outputPath("quick-log-blank-when-1440x1040.png"),
  });
  await dialog.getByLabel("Title", { exact: true }).fill("Synthetic note");
  await dialog.getByLabel("Details", { exact: true }).fill("Saved now");
  await dialog
    .getByRole("button", { name: "Save activity", exact: true })
    .click();
  await dialog.getByRole("button", { name: "Done", exact: true }).click();
  await expect(
    page.getByRole("complementary", { name: "Quick log result" }),
  ).toContainText("Logged to Test Aerospace");
  expect(posts).toHaveLength(1);
  expect(posts[0]).not.toHaveProperty("occurredAt");
  expect(unexpected).toEqual([]);
});

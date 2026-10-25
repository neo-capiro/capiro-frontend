import { createHash } from "node:crypto";
import { test, expect, type Page } from "@playwright/test";
import {
  clientId,
  file,
  installFixtures,
  json,
} from "../../tests/browser/fixtures";
import type { BatchMoveCommand } from "../../src/features/portfolio/files/batch-move";
const files = [
  { ...file, fileName: "Alpha.txt", metadataRevision: 3, folder: "Reports" },
  {
    ...file,
    id: "60000000-0000-4000-8000-000000000002",
    fileName: "Beta.txt",
    metadataRevision: 9,
    folder: null,
  },
];
const receipt = (command: BatchMoveCommand) => ({
  schemaVersion: 1,
  requestId: command.requestId,
  clientId,
  payloadDigest: createHash("sha256")
    .update(JSON.stringify(command))
    .digest("hex"),
  outcome: "moved",
  committedAt: "2026-10-24T12:00:00Z",
  files: command.files.map((entry) => ({
    id: entry.id,
    previousRevision: entry.expectedRevision,
    revision: entry.expectedRevision + 1,
    folder: command.folder,
  })),
});
async function setup(page: Page) {
  await page.route("**/core/engagement/attachments?**", (route) =>
    json(route, files),
  );
  await page.goto("/files");
  await page
    .getByRole("checkbox", { name: "Select Alpha.txt", exact: true })
    .check();
  await page
    .getByRole("checkbox", { name: "Select Beta.txt", exact: true })
    .check();
  await page.getByLabel("Search files", { exact: true }).fill("Alpha");
  await page
    .getByRole("button", { name: "Move to folder", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Move selected files",
    exact: true,
  });
  await expect(dialog.getByText("Alpha.txt", { exact: true })).toBeVisible();
  await expect(dialog.getByText("Beta.txt", { exact: true })).toBeVisible();
  await dialog.getByLabel("Destination folder").fill("Reviewed");
  return dialog;
}
test.beforeEach(async ({ page }) => {
  await installFixtures(page);
});
test("moves the full reviewed selection including hidden rows with one atomic POST", async ({
  page,
}) => {
  const commands: BatchMoveCommand[] = [];
  await page.route("**/core/clients/*/files/batch-moves", (route) => {
    const command = route.request().postDataJSON() as BatchMoveCommand;
    commands.push(command);
    return json(route, receipt(command));
  });
  const dialog = await setup(page);
  await dialog
    .getByRole("button", { name: "Move 2 files", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  expect(commands).toHaveLength(1);
  expect(commands[0]).toMatchObject({
    clientId,
    folder: "Reviewed",
    files: files
      .map((file) => ({ id: file.id, expectedRevision: file.metadataRevision }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  });
  await expect(
    page.getByText("1 files · 0 selected", { exact: true }),
  ).toBeVisible();
});
test("lost batch response survives dialog closure, remount and hard reload; explicit check never reposts", async ({
  page,
}) => {
  const commands: BatchMoveCommand[] = [];
  let reads = 0;
  await page.route("**/core/clients/*/files/batch-moves", (route) => {
    commands.push(route.request().postDataJSON());
    return route.abort("failed");
  });
  await page.route("**/core/clients/*/files/batch-moves/*", (route) => {
    reads++;
    return json(route, receipt(commands[0]!));
  });
  let dialog = await setup(page);
  await dialog
    .getByRole("button", { name: "Move 2 files", exact: true })
    .click();
  await expect(
    dialog.getByRole("button", { name: "Check move outcome" }),
  ).toBeEnabled();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await page.getByRole("button", { name: "Toggle file view" }).click();
  await page.getByRole("button", { name: "Toggle file view" }).click();
  await page.reload();
  expect(commands).toHaveLength(1);
  expect(reads).toBe(0);
  await page.getByRole("button", { name: "Review pending move" }).click();
  dialog = page.getByRole("dialog", {
    name: "Move selected files",
    exact: true,
  });
  await expect(dialog.getByLabel("Destination folder")).toHaveValue("Reviewed");
  await expect(dialog.getByLabel("Destination folder")).toBeDisabled();
  await dialog.getByRole("button", { name: "Check move outcome" }).click();
  await expect(dialog).toHaveCount(0);
  expect(commands).toHaveLength(1);
  expect(reads).toBe(1);
});
test("reader replacement retires the pending dialog and ignores its late response", async ({
  page,
}) => {
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let calls = 0;
  await page.route("**/core/clients/*/files/batch-moves", async (route) => {
    calls++;
    const command = route.request().postDataJSON();
    await held;
    await json(route, receipt(command)).catch(() => {});
  });
  const dialog = await setup(page);
  await dialog
    .getByRole("button", { name: "Move 2 files", exact: true })
    .click();
  await expect.poll(() => calls).toBe(1);
  // A session event may occur while the modal owns focus.
  await page
    .getByRole("button", { name: "Replace file reader", includeHidden: true })
    .evaluate((button: HTMLButtonElement) => button.click());
  await expect(dialog).toHaveCount(0);
  release();
  await expect(
    page.getByRole("button", { name: "Review pending move" }),
  ).toHaveCount(0);
  await expect(
    page.getByText("2 files · 0 selected", { exact: true }),
  ).toBeVisible();
  expect(calls).toBe(1);
});

test("a durable Core refusal survives reload and clears only after explicit fresh authority and files review", async ({
  page,
}) => {
  const commands: BatchMoveCommand[] = [];
  let meReads = 0,
    fileReads = 0;
  page.on("request", (request) => {
    if (request.url().endsWith("/core/me")) meReads++;
    if (request.url().includes("/core/engagement/attachments?")) fileReads++;
  });
  await page.route("**/core/clients/*/files/batch-moves", (route) => {
    const command = route.request().postDataJSON() as BatchMoveCommand;
    commands.push(command);
    return route.fulfill({
      status: 409,
      contentType: "application/json",
      body: JSON.stringify({
        schemaVersion: 1,
        code: "FILE_BATCH_MOVE_REFUSED",
        requestId: command.requestId,
        clientId,
        payloadDigest: receipt(command).payloadDigest,
        status: 409,
        message: "The saved move was refused; no files were moved.",
      }),
    });
  });
  let dialog = await setup(page);
  await dialog
    .getByRole("button", { name: "Move 2 files", exact: true })
    .click();
  await expect(
    dialog.getByRole("button", {
      name: "Review fresh files and clear refused move",
    }),
  ).toBeEnabled();
  await expect(
    dialog.getByRole("button", { name: "Retry same move" }),
  ).toHaveCount(0);
  await page.reload();
  await page.getByRole("button", { name: "Review pending move" }).click();
  dialog = page.getByRole("dialog", {
    name: "Move selected files",
    exact: true,
  });
  await expect(
    dialog.getByText(/Core confirmed this move was refused/),
  ).toBeVisible();
  const before = { meReads, fileReads };
  expect(commands).toHaveLength(1);
  await dialog
    .getByRole("button", { name: "Review fresh files and clear refused move" })
    .click();
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Review pending move" }),
  ).toHaveCount(0);
  expect(meReads).toBeGreaterThan(before.meReads);
  expect(fileReads).toBeGreaterThan(before.fileReads);
  expect(commands).toHaveLength(1);
});

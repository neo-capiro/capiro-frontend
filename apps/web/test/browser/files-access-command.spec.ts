import { test, expect, type Page } from "@playwright/test";
import { file, installFixtures, json } from "../../tests/browser/fixtures";
import { accessOutcome, moveOutcome } from "./files-access-fixtures";
import type { FileAccessCommand } from "../../src/features/portfolio/files/file-access-command";
const files = [
  { ...file, fileName: "Alpha.txt", metadataRevision: 3, folder: "Reports" },
  {
    ...file,
    id: "60000000-0000-4000-8000-000000000002",
    fileName: "Beta.txt",
    metadataRevision: 9,
    folder: "Reports",
  },
];
async function open(page: Page, folder = false) {
  if (folder) {
    await page.getByRole("button", { name: /^Reports\s*2$/ }).click();
    await page.getByRole("button", { name: "Access", exact: true }).click();
  } else {
    await page
      .getByRole("button", { name: "Actions for Alpha.txt", exact: true })
      .click();
    await page
      .getByRole("menuitem", { name: "Manage access", exact: true })
      .click();
  }
  return page.getByRole("dialog", { name: "Access: Reports", exact: true });
}
test.beforeEach(async ({ page }) => {
  await installFixtures(page);
  await page.route("**/core/engagement/attachments?**", (route) =>
    json(route, files),
  );
});
test("folder access sends only the explicit reviewed subset and excludes newly arrived files", async ({
  page,
}) => {
  const commands: FileAccessCommand[] = [];
  await page.route("**/core/clients/*/files/access/folder", (route) => {
    const command = route.request().postDataJSON();
    commands.push(command);
    return json(route, accessOutcome(command));
  });
  await page.goto("/files");
  const dialog = await open(page, true);
  await dialog
    .getByRole("checkbox", { name: "Beta.txt · revision 9" })
    .uncheck();
  await dialog
    .getByRole("radio", { name: "Specific people", exact: true })
    .check();
  await page.route("**/core/engagement/attachments?**", (route) =>
    json(route, [
      ...files,
      {
        ...files[0],
        id: "60000000-0000-4000-8000-000000000003",
        fileName: "Arrived later.txt",
      },
    ]),
  );
  await page
    .getByRole("button", { name: "Refresh files", includeHidden: true })
    .evaluate((button: HTMLButtonElement) => button.click());
  await expect(dialog.getByText("Arrived later.txt")).toHaveCount(0);
  await dialog
    .getByRole("button", { name: "Save access for 1 file", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  expect(commands).toHaveLength(1);
  expect(commands[0]).toMatchObject({
    operation: "folder-access",
    folder: "Reports",
    files: [{ id: files[0]!.id, expectedRevision: 3 }],
    viewerMode: "restricted",
    viewerUserIds: [],
  });
});
test("single access lost acknowledgment survives reload and self-removal; explicit historical read never repeats PATCH", async ({
  page,
}) => {
  const commands: FileAccessCommand[] = [];
  let reads = 0,
    removed = false;
  await page.route("**/core/engagement/attachments?**", (route) =>
    json(route, removed ? [] : files),
  );
  await page.route(
    `**/core/clients/*/files/${files[0]!.id}/access`,
    (route) => {
      commands.push(route.request().postDataJSON());
      removed = true;
      return route.abort("failed");
    },
  );
  await page.route("**/core/clients/*/files/access/commands/*", (route) => {
    reads++;
    return json(route, accessOutcome(commands[0]!));
  });
  await page.goto("/files");
  const dialog = await open(page);
  await dialog
    .getByRole("radio", { name: "Specific people", exact: true })
    .check();
  await dialog.getByRole("button", { name: "Save access for 1 file" }).click();
  await expect(
    dialog.getByRole("button", { name: "Check access outcome" }),
  ).toBeEnabled();
  await page.reload();
  await page
    .getByRole("button", { name: "Review pending access change" })
    .click();
  await expect(dialog).toContainText(files[0]!.id);
  expect(commands).toHaveLength(1);
  expect(reads).toBe(0);
  await dialog.getByRole("button", { name: "Check access outcome" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Review pending access change" }),
  ).toHaveCount(0);
  expect(commands).toHaveLength(1);
  expect(reads).toBe(1);
});
test("durable refused access survives reload and requires fresh explicit retirement", async ({
  page,
}) => {
  let writes = 0;
  await page.route("**/core/clients/*/files/access/folder", (route) => {
    writes++;
    return json(route, accessOutcome(route.request().postDataJSON(), true));
  });
  await page.goto("/files");
  let dialog = await open(page, true);
  await dialog
    .getByRole("radio", { name: "All team members", exact: true })
    .check();
  await dialog.getByRole("button", { name: "Save access for 2 files" }).click();
  await expect(dialog).toContainText(
    "Core confirmed this access change was refused",
  );
  await page.reload();
  await page
    .getByRole("button", { name: "Review pending access change" })
    .click();
  dialog = page.getByRole("dialog", { name: "Access: Reports", exact: true });
  await expect(
    dialog.getByRole("button", { name: "Retry same access change" }),
  ).toHaveCount(0);
  expect(writes).toBe(1);
  await dialog
    .getByRole("button", {
      name: "Review fresh files and clear refused access change",
    })
    .click();
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Review pending access change" }),
  ).toHaveCount(0);
  expect(writes).toBe(1);
});
test("reader replacement removes the pending access dialog without adopting a late response", async ({
  page,
}) => {
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let writes = 0;
  await page.route(
    `**/core/clients/*/files/${files[0]!.id}/access`,
    async (route) => {
      writes++;
      const command = route.request().postDataJSON();
      await held;
      await json(route, accessOutcome(command)).catch(() => {});
    },
  );
  await page.goto("/files");
  const dialog = await open(page);
  await dialog.getByRole("button", { name: "Save access for 1 file" }).click();
  await expect.poll(() => writes).toBe(1);
  await page
    .getByRole("button", { name: "Replace file reader", includeHidden: true })
    .evaluate((button: HTMLButtonElement) => button.click());
  await expect(dialog).toHaveCount(0);
  release();
  await expect(
    page.getByRole("button", { name: "Review pending access change" }),
  ).toHaveCount(0);
  expect(writes).toBe(1);
});
test("single-file move uses the existing atomic batch route", async ({
  page,
}) => {
  const commands: unknown[] = [];
  await page.route("**/core/clients/*/files/batch-moves", (route) => {
    const command = route.request().postDataJSON();
    commands.push(command);
    return json(route, moveOutcome(command));
  });
  await page.goto("/files");
  await page
    .getByRole("checkbox", { name: "Select Alpha.txt", exact: true })
    .check();
  await page
    .getByRole("button", { name: "Move to folder", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Move to folder",
    exact: true,
  });
  await dialog.getByLabel("Destination folder").fill("Reviewed");
  await dialog.getByRole("button", { name: "Move file", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(commands).toHaveLength(1);
  expect(commands[0]).toMatchObject({
    folder: "Reviewed",
    files: [{ id: files[0]!.id, expectedRevision: 3 }],
  });
});

import { test, expect } from "@playwright/test";
import { clientId, file, json } from "./fixtures";
import { qaFixtures } from "./portfolio-qa-fixtures";
import { expectAccessibleHome } from "../../test/accessibility";

test("searchable text can be explicitly rechecked after a failed read without processing writes", async ({
  page,
}) => {
  const unexpected = await qaFixtures(page);
  const ready = {
    ...file,
    lifecycleStatus: "available",
    scanStatus: "clean",
    extractionStatus: "extracted",
    usable: true,
    blockedReason: undefined,
  };
  await page.route("**/engagement/attachments?**", (route) =>
    json(route, [ready]),
  );
  const methods: string[] = [];
  await page.route(
    `**/engagement/attachments/${file.id}/extract-text`,
    (route) => {
      methods.push(route.request().method());
      return methods.length === 1
        ? json(route, { message: "Synthetic text service unavailable" }, 503)
        : json(route, {
            attachmentId: file.id,
            text: "Synthetic confirmed saved text",
            truncated: false,
          });
    },
  );
  await page.goto(`/portfolio/${clientId}/files`);
  await page
    .getByRole("button", { name: "pdf Test report.pdf", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: file.fileName });
  await dialog.getByRole("button", { name: "Read extracted text" }).click();
  await expect(dialog.getByRole("alert")).toContainText(
    "Synthetic text service unavailable",
  );
  await expect(
    dialog.getByRole("button", { name: "Recheck extracted text" }),
  ).toBeEnabled();
  expect(methods).toEqual(["GET"]);
  await dialog.getByRole("button", { name: "Recheck extracted text" }).click();
  await expect(dialog).toContainText("Synthetic confirmed saved text");
  expect(methods).toEqual(["GET", "GET"]);
  expect(unexpected).toEqual([]);
});

test("an empty folder can be created without selection and Upload here saves directly into it", async ({
  page,
}, info) => {
  const unexpected = await qaFixtures(page);
  const folders: { folder: string; count: number }[] = [];
  let uploaded: Record<string, unknown> | undefined;
  await page.route(`**/core/clients/${clientId}/files/folders`, (route) => {
    if (route.request().method() === "POST") {
      expect(route.request().postDataJSON()).toEqual({ folder: "Hearings" });
      folders.push({ folder: "Hearings", count: 0 });
      return json(route, { folder: "Hearings" });
    }
    return json(route, folders);
  });
  await page.route("**/engagement/attachments?**", (route) =>
    json(route, uploaded ? [uploaded] : []),
  );
  await page.route("**/engagement/attachments/upload-url", (route) =>
    json(route, {
      url: "https://storage.example.test/synthetic-upload",
      s3Key: "synthetic/file",
      fields: { key: "synthetic/file" },
    }),
  );
  await page.route("https://storage.example.test/synthetic-upload", (route) =>
    route.fulfill({
      status: 204,
      headers: { "Access-Control-Allow-Origin": "*" },
    }),
  );
  await page.route("**/engagement/attachments/confirm", (route) => {
    const body = route.request().postDataJSON();
    expect(body).toMatchObject({
      clientId,
      fileName: "hearing-notes.txt",
      folder: "Hearings",
    });
    uploaded = {
      ...file,
      ...body,
      byteSize: 22,
      uploadedByUserId: "user-test",
    };
    return json(route, uploaded);
  });
  await page.goto(`/portfolio/${clientId}/files`);
  await page.getByRole("button", { name: "New folder", exact: true }).click();
  const create = page.getByRole("dialog", { name: "New folder" });
  await create.getByLabel("Folder name").fill("Hearings");
  await expectAccessibleHome(page, info);
  await create.screenshot({ path: info.outputPath("empty-folder-create.png") });
  expect((await create.boundingBox())!.width).toBe(520);
  await page.setViewportSize({ width: 390, height: 844 });
  expect((await create.boundingBox())!.width).toBeLessThanOrEqual(358);
  await expect(create.getByLabel("Folder name")).toBeFocused();
  await create.screenshot({
    path: info.outputPath("empty-folder-create-mobile.png"),
  });
  await page.setViewportSize({ width: 1440, height: 1040 });
  await create
    .getByRole("button", { name: "Create folder", exact: true })
    .click();
  await expect(create).toBeHidden();
  await page.getByRole("button", { name: "Upload here", exact: true }).click();
  const upload = page.getByRole("dialog", { name: "Upload files" });
  await expect(upload.getByLabel("Destination folder")).toHaveValue("Hearings");
  await expectAccessibleHome(page, info);
  await upload.screenshot({
    path: info.outputPath("upload-current-folder.png"),
  });
  expect((await upload.boundingBox())!.width).toBe(520);
  await page.setViewportSize({ width: 390, height: 844 });
  expect((await upload.boundingBox())!.width).toBeLessThanOrEqual(358);
  await upload.screenshot({
    path: info.outputPath("upload-current-folder-mobile.png"),
  });
  await expectAccessibleHome(page, info);
  await upload
    .getByRole("button", { name: "Choose files", exact: true })
    .focus();
  const chooser = page.waitForEvent("filechooser");
  await page.keyboard.press("Enter");
  await (
    await chooser
  ).setFiles({
    name: "hearing-notes.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Synthetic hearing notes"),
  });
  await upload
    .getByRole("button", { name: "Upload file", exact: true })
    .click();
  await expect(upload).toContainText("Uploaded · awaiting service processing");
  await upload.getByRole("button", { name: "Done", exact: true }).click();
  await expect(
    page.getByRole("cell", { name: "Hearings", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Hearings 1", exact: true }),
  ).toBeVisible();
  expect(unexpected).toEqual([]);
});

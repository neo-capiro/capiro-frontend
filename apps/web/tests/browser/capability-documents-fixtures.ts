import { expect, type Page } from "@playwright/test";
import {
  capabilityId,
  clientId,
  file,
  installFixtures,
  json,
} from "./fixtures";
export { holdResponse } from "./capability-boundary-fixtures";
export const source = `capability:${capabilityId}`;
export const nativeFile = {
  ...file,
  fileName: "Synthetic datasheet.txt",
  contentType: "text/plain",
  source,
  s3Key: "native-ticket-key",
  uploadedByUserId: "user-test",
  lifecycleStatus: "ready",
  scanStatus: "clean",
  extractionStatus: "extracted",
  usable: true,
  blockedReason: undefined,
  downloadUrl: "https://storage.example.test/old-download",
  previewUrl: null,
};
export const ticket = {
  url: "https://storage.example.test/upload",
  fields: { key: nativeFile.s3Key },
  s3Key: nativeFile.s3Key,
};
export const uploadReceipt = {
  ...nativeFile,
  fileName: "source.txt",
  byteSize: 5,
  lifecycleStatus: "quarantined",
  scanStatus: "pending",
  extractionStatus: "pending",
  usable: false,
  downloadUrl: null,
  previewUrl: null,
};
export async function installDocumentFixtures(page: Page) {
  const unexpected = await installFixtures(page);
  await page.route(
    "**/core/clients/10000000-0000-4000-8000-000000000002/files/storage-usage",
    (route) =>
      route.request().method() === "GET"
        ? json(route, { message: "Storage usage unavailable" }, 404)
        : route.fallback(),
  );
  await page.route("**/core/engagement/attachments?**", (route) => {
    const requested = new URL(route.request().url()).searchParams.get(
      "clientId",
    );
    return json(route, requested === clientId ? [nativeFile] : []);
  });
  return unexpected;
}
export async function openDocuments(page: Page, waitForFile = true) {
  await page.goto("/capability-documents.html");
  const editor = page.getByRole("dialog", {
    name: "Capability: Test sensor",
    exact: true,
  });
  await editor.getByRole("tab", { name: "Documents", exact: true }).click();
  if (waitForFile)
    await expect(
      editor.getByRole("button", { name: nativeFile.fileName, exact: true }),
    ).toBeVisible();
  return editor;
}

export async function observeDocumentNavigation(page: Page) {
  const destinations: string[] = [];
  await page.context().route("https://storage.example.test/**", (route) => {
    destinations.push(route.request().url());
    return route.fulfill({
      status: 200,
      contentType: "text/plain",
      headers: { "Content-Disposition": "attachment; filename=synthetic.txt" },
      body: "synthetic",
    });
  });
  return destinations;
}
export async function chooseUpload(page: Page) {
  await page
    .getByRole("button", { name: "Upload document", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Upload files",
    exact: true,
  });
  await dialog.getByLabel("Select files", { exact: true }).setInputFiles({
    name: "source.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("hello"),
  });
  await dialog
    .getByRole("button", { name: "Upload file", exact: true })
    .click();
  return dialog;
}
export function changeDocumentView(page: Page, change: string) {
  return page.evaluate(
    (value) => window.dispatchEvent(new Event(`file-documents-${value}`)),
    change,
  );
}
export async function settleDocumentRequests(page: Page) {
  await expect(
    page.getByLabel("Synthetic document requests pending"),
  ).toHaveText("0");
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
}

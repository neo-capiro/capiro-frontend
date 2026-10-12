import { expect, test } from "@playwright/test";
import { json } from "./fixtures";
import {
  changeDocumentView,
  chooseUpload,
  holdResponse,
  installDocumentFixtures,
  nativeFile,
  openDocuments,
  settleDocumentRequests,
  ticket,
  uploadReceipt,
} from "./capability-documents-fixtures";

for (const change of ["actor", "source", "unmount"]) {
  test(`bytes already sent cannot start confirmation after the ${change} changes`, async ({
    page,
  }) => {
    const unexpected = await installDocumentFixtures(page);
    await page.route("**/core/engagement/attachments/upload-url", (route) =>
      json(route, ticket),
    );
    const held = await holdResponse(page, ticket.url, "POST", {});
    let confirms = 0;
    await page.route("**/core/engagement/attachments/confirm", (route) => {
      confirms += 1;
      return json(route, uploadReceipt);
    });
    await openDocuments(page);
    await chooseUpload(page);
    await held.started;
    await changeDocumentView(page, change);
    held.release();
    await held.settled;
    await settleDocumentRequests(page);
    expect(held.calls()).toBe(1);
    expect(confirms).toBe(0);
    await expect(
      page.getByText("Uploaded · awaiting service processing", { exact: true }),
    ).toHaveCount(0);
    expect(unexpected).toEqual([]);
  });
}

for (const fault of [
  "wrong-source",
  "unknown-storage",
  "refused-confirmation",
] as const) {
  test(`${fault} keeps the exact attempt and retries confirmation without a second byte upload`, async ({
    page,
  }) => {
    const unexpected = await installDocumentFixtures(page);
    let prepares = 0,
      bytes = 0,
      confirms = 0,
      reads = 0;
    await page.route("**/core/engagement/attachments?**", (route) => {
      reads += 1;
      return json(route, [nativeFile]);
    });
    await page.route("**/core/engagement/attachments/upload-url", (route) => {
      prepares += 1;
      expect(route.request().postDataJSON()).toEqual({
        clientId: nativeFile.clientId,
        fileName: "source.txt",
        contentType: "text/plain",
        contentLength: 5,
      });
      return json(route, ticket);
    });
    await page.route(ticket.url, (route) => {
      bytes += 1;
      return route.fulfill({ status: fault === "unknown-storage" ? 503 : 204 });
    });
    await page.route("**/core/engagement/attachments/confirm", (route) => {
      confirms += 1;
      expect(route.request().postDataJSON()).toEqual({
        clientId: nativeFile.clientId,
        fileName: "source.txt",
        contentType: "text/plain",
        s3Key: ticket.s3Key,
        source: nativeFile.source,
      });
      if (confirms === 1 && fault === "wrong-source")
        return json(route, { ...uploadReceipt, source: "manual" });
      if (confirms === 1 && fault === "refused-confirmation")
        return json(route, { message: "Synthetic confirmation refused" }, 403);
      return json(route, uploadReceipt);
    });
    await openDocuments(page);
    const upload = await chooseUpload(page);
    await expect(upload.getByRole("alert")).toContainText(
      fault === "wrong-source"
        ? "unexpected response"
        : fault === "unknown-storage"
          ? "completion is unknown"
          : "Synthetic confirmation refused",
    );
    expect(reads).toBe(1);
    await expect(
      upload.getByText("Uploaded · awaiting service processing", {
        exact: true,
      }),
    ).toHaveCount(0);
    await upload
      .getByRole("button", { name: "Retry file", exact: true })
      .click();
    await expect(
      upload.getByText("Uploaded · awaiting service processing", {
        exact: true,
      }),
    ).toBeVisible();
    expect(prepares).toBe(1);
    expect(bytes).toBe(1);
    expect(confirms).toBe(fault === "unknown-storage" ? 1 : 2);
    expect(reads).toBe(2);
    expect(unexpected).toEqual([]);
  });
}

test("a retryable job cannot transfer its original storage key to another actor", async ({
  page,
}) => {
  const unexpected = await installDocumentFixtures(page);
  let prepares = 0,
    bytes = 0,
    confirms = 0;
  await page.route("**/core/engagement/attachments/upload-url", (route) => {
    prepares += 1;
    return json(route, ticket);
  });
  await page.route(ticket.url, (route) => {
    bytes += 1;
    return route.fulfill({ status: 204 });
  });
  await page.route("**/core/engagement/attachments/confirm", (route) => {
    confirms += 1;
    return json(route, { message: "Synthetic temporary refusal" }, 503);
  });
  await openDocuments(page);
  const upload = await chooseUpload(page);
  await expect(
    upload.getByRole("button", { name: "Retry file", exact: true }),
  ).toBeEnabled();
  await changeDocumentView(page, "actor");
  await expect(
    upload.getByRole("button", { name: "Retry file", exact: true }),
  ).toHaveCount(0);
  await expect(upload.getByText("source.txt", { exact: true })).toHaveCount(0);
  await changeDocumentView(page, "restore-actor");
  await settleDocumentRequests(page);
  await expect(
    upload.getByRole("button", { name: "Retry file", exact: true }),
  ).toHaveCount(0);
  expect({ prepares, bytes, confirms }).toEqual({
    prepares: 1,
    bytes: 1,
    confirms: 1,
  });
  expect(unexpected).toEqual([]);
});

import { expect, test } from "@playwright/test";
import { clientId, json } from "./fixtures";
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

for (const change of [
  "actor",
  "client",
  "source",
  "unmount",
  "tenant",
  "role",
  "invalidate",
]) {
  test(`capability upload sends no bytes after a held ticket outlives its ${change}`, async ({
    page,
  }) => {
    const unexpected = await installDocumentFixtures(page);
    const renderErrors: string[] = [];
    page.on("console", (message) => {
      if (
        message.type() === "error" &&
        message.text().includes("Cannot update a component")
      )
        renderErrors.push(message.text());
    });
    const held = await holdResponse(
      page,
      "**/core/engagement/attachments/upload-url",
      "POST",
      ticket,
    );
    let bytes = 0,
      confirms = 0;
    await page.route(ticket.url, (route) => {
      bytes += 1;
      return route.fulfill({ status: 204 });
    });
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
    expect(bytes).toBe(0);
    expect(confirms).toBe(0);
    expect(renderErrors).toEqual([]);
    await expect(
      page.getByText("Uploaded · awaiting service processing", { exact: true }),
    ).toHaveCount(0);
    expect(unexpected).toEqual([]);
  });
}

test("a late upload receipt cannot refresh files or announce success for another actor", async ({
  page,
}) => {
  const unexpected = await installDocumentFixtures(page);
  let reads = 0;
  await page.route("**/core/engagement/attachments?**", (route) => {
    reads += 1;
    return json(route, [nativeFile]);
  });
  await page.route("**/core/engagement/attachments/upload-url", (route) =>
    json(route, ticket),
  );
  await page.route(ticket.url, (route) => route.fulfill({ status: 204 }));
  const held = await holdResponse(
    page,
    "**/core/engagement/attachments/confirm",
    "POST",
    uploadReceipt,
  );
  await openDocuments(page);
  await chooseUpload(page);
  await held.started;
  expect(reads).toBe(1);
  await changeDocumentView(page, "actor");
  await expect.poll(() => reads).toBe(2);
  held.release();
  await held.settled;
  await settleDocumentRequests(page);
  // The replacement reader gets its own GET; the obsolete receipt adds none.
  expect(reads).toBe(2);
  await expect(
    page.getByText("Uploaded · awaiting service processing", { exact: true }),
  ).toHaveCount(0);
  expect(unexpected).toEqual([]);
});

test("a long-open capability download obtains its current authorized URL instead of navigating to the old URL", async ({
  page,
  context,
}) => {
  const unexpected = await installDocumentFixtures(page);
  let reads = 0;
  await page.route("**/core/engagement/attachments?**", (route) => {
    reads += 1;
    return json(route, [
      {
        ...nativeFile,
        downloadUrl:
          reads === 1
            ? nativeFile.downloadUrl
            : "https://storage.example.test/current-download",
      },
    ]);
  });
  const navigations: string[] = [];
  await context.route("https://storage.example.test/**", (route) => {
    navigations.push(route.request().url());
    return route.fulfill({
      status: 200,
      contentType: "text/plain",
      headers: { "Content-Disposition": "attachment; filename=synthetic.txt" },
      body: "synthetic",
    });
  });
  await page.clock.install({ time: new Date("2026-10-11T12:00:00Z") });
  const editor = await openDocuments(page);
  await editor
    .getByRole("button", { name: nativeFile.fileName, exact: true })
    .click();
  await page.clock.fastForward(301_000);
  await page
    .getByRole("dialog", { name: nativeFile.fileName, exact: true })
    .getByRole("link", { name: "Download", exact: true })
    .click();
  await expect
    .poll(() => navigations)
    .toEqual(["https://storage.example.test/current-download"]);
  expect(reads).toBe(2);
  expect(unexpected).toEqual([]);
  expect(clientId).toBe(nativeFile.clientId);
});

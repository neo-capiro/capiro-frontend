import { expect, test } from "@playwright/test";
import { json } from "./fixtures";
import {
  changeDocumentView,
  holdResponse,
  installDocumentFixtures,
  nativeFile,
  openDocuments,
  settleDocumentRequests,
} from "./capability-documents-fixtures";

for (const change of ["actor", "tenant", "role"]) {
  test(`a replacement ${change} hides old filenames, preview and extracted text before its fresh authorized list`, async ({
    page,
  }) => {
    const unexpected = await installDocumentFixtures(page);
    await page.route(
      `**/core/engagement/attachments/${nativeFile.id}/extract-text`,
      (route) =>
        json(route, {
          attachmentId: nativeFile.id,
          text: "Original reader extracted text",
        }),
    );
    const editor = await openDocuments(page);
    await editor
      .getByRole("button", { name: nativeFile.fileName, exact: true })
      .click();
    const preview = page.getByRole("dialog", {
      name: nativeFile.fileName,
      exact: true,
    });
    await preview
      .getByRole("button", { name: "Read extracted text", exact: true })
      .click();
    await expect(
      preview.getByText("Original reader extracted text", { exact: true }),
    ).toBeVisible();
    const held = await holdResponse(
      page,
      "**/core/engagement/attachments?**",
      "GET",
      [{ ...nativeFile, fileName: "Replacement reader document.txt" }],
    );
    try {
      await changeDocumentView(page, change);
      await expect(preview).toHaveCount(0);
      await expect(
        page.getByText("Original reader extracted text", { exact: true }),
      ).toHaveCount(0);
      await expect(
        editor.getByRole("button", { name: nativeFile.fileName, exact: true }),
      ).toHaveCount(0);
      await expect(
        editor.getByRole("status", { name: "Loading documents", exact: true }),
      ).toBeVisible();
      await held.started;
    } finally {
      held.release();
    }
    await held.settled;
    await expect(
      editor.getByRole("button", {
        name: "Replacement reader document.txt",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByText("Original reader extracted text", { exact: true }),
    ).toHaveCount(0);
    expect(unexpected).toEqual([]);
  });
}

test("revoked identity immediately removes cached document names and preview text without another file request", async ({
  page,
}) => {
  const unexpected = await installDocumentFixtures(page);
  let reads = 0;
  await page.route("**/core/engagement/attachments?**", (route) => {
    reads += 1;
    return json(route, [nativeFile]);
  });
  const editor = await openDocuments(page);
  await editor
    .getByRole("button", { name: nativeFile.fileName, exact: true })
    .click();
  await changeDocumentView(page, "invalidate");
  await expect(
    page.getByRole("dialog", { name: nativeFile.fileName, exact: true }),
  ).toHaveCount(0);
  await expect(
    editor.getByRole("button", { name: nativeFile.fileName, exact: true }),
  ).toHaveCount(0);
  await expect(
    editor.getByRole("button", { name: "Upload document", exact: true }),
  ).toBeDisabled();
  await expect(editor.getByRole("alert")).toBeVisible();
  expect(reads).toBe(1);
  expect(unexpected).toEqual([]);
});

for (const change of ["actor", "source", "unmount"]) {
  test(`a held extracted-text receipt cannot invalidate caches or appear after ${change}`, async ({
    page,
  }) => {
    const unexpected = await installDocumentFixtures(page);
    const editor = await openDocuments(page);
    await editor
      .getByRole("button", { name: nativeFile.fileName, exact: true })
      .click();
    const preview = page.getByRole("dialog", {
      name: nativeFile.fileName,
      exact: true,
    });
    const held = await holdResponse(
      page,
      `**/core/engagement/attachments/${nativeFile.id}/extract-text`,
      "POST",
      { attachmentId: nativeFile.id, text: "Obsolete extracted receipt" },
    );
    await preview
      .getByRole("button", { name: "Read extracted text", exact: true })
      .click();
    await held.started;
    await changeDocumentView(page, change);
    await expect(preview).toHaveCount(0);
    const before = await page
      .getByLabel("Synthetic original document cache")
      .textContent();
    held.release();
    await held.settled;
    await settleDocumentRequests(page);
    // Reader replacement may finish its own GET, but no cached query is invalidated by the obsolete POST.
    const cached = JSON.parse(
      (await page
        .getByLabel("Synthetic original document cache")
        .textContent())!,
    );
    expect(
      cached.every((query: { isInvalidated: boolean }) => !query.isInvalidated),
    ).toBe(true);
    if (change === "unmount" || change === "source")
      expect(
        await page
          .getByLabel("Synthetic original document cache")
          .textContent(),
      ).toBe(before);
    await expect(
      page.getByText("Obsolete extracted receipt", { exact: true }),
    ).toHaveCount(0);
    expect(unexpected).toEqual([]);
  });
}

test("a wrong extraction identity stays unconfirmed and never triggers a list refresh or automatic retry", async ({
  page,
}) => {
  const unexpected = await installDocumentFixtures(page);
  let reads = 0,
    extracts = 0;
  await page.route("**/core/engagement/attachments?**", (route) => {
    reads += 1;
    return json(route, [nativeFile]);
  });
  await page.route(
    `**/core/engagement/attachments/${nativeFile.id}/extract-text`,
    (route) => {
      extracts += 1;
      return json(route, {
        attachmentId: "60000000-0000-4000-8000-000000000009",
        text: "Wrong file text",
      });
    },
  );
  const editor = await openDocuments(page);
  await editor
    .getByRole("button", { name: nativeFile.fileName, exact: true })
    .click();
  const preview = page.getByRole("dialog", {
    name: nativeFile.fileName,
    exact: true,
  });
  await preview
    .getByRole("button", { name: "Read extracted text", exact: true })
    .click();
  await expect(preview.getByRole("alert")).toContainText(
    "service may have completed",
  );
  await expect(
    preview.getByRole("button", { name: "Read extracted text", exact: true }),
  ).toBeDisabled();
  await expect(
    preview.getByText("Wrong file text", { exact: true }),
  ).toHaveCount(0);
  expect({ reads, extracts }).toEqual({ reads: 1, extracts: 1 });
  expect(unexpected).toEqual([]);
});

test("mounting Documents with invalidated identity waits for a fresh session without render-phase updates", async ({
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
  await page.goto("/capability-documents.html");
  const editor = page.getByRole("dialog", {
    name: "Capability: Test sensor",
    exact: true,
  });
  await expect(
    editor.getByRole("tab", { name: "Documents", exact: true }),
  ).toBeVisible();
  await settleDocumentRequests(page);
  const held = await holdResponse(page, "**/core/me", "GET", {
    user: { id: "user-test", email: "synthetic@example.test" },
    tenant: { id: "tenant-test", name: "Synthetic tenant" },
    role: "standard_user",
  });
  try {
    await changeDocumentView(page, "invalidate");
    await editor.getByRole("tab", { name: "Documents", exact: true }).click();
    await held.started;
    await expect(
      editor.getByRole("status", { name: "Loading documents", exact: true }),
    ).toBeVisible();
    await expect(editor.getByRole("listitem")).toHaveCount(0);
    await expect(
      editor.getByRole("button", { name: "Upload document", exact: true }),
    ).toBeDisabled();
  } finally {
    held.release();
  }
  await held.settled;
  await expect(
    editor.getByRole("button", { name: nativeFile.fileName, exact: true }),
  ).toBeVisible();
  await settleDocumentRequests(page);
  expect(renderErrors).toEqual([]);
  expect(unexpected).toEqual([]);
});

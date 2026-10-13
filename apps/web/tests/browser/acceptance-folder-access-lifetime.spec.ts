import { expect, test } from "@playwright/test";
import { json } from "./fixtures";
import {
  changeDocumentView,
  expectRestrictedDraft,
  folderAccessPath,
  holdResponse,
  installFolderAccess,
  openFolderAccess,
  requestRestrictedAccess,
  restrictedReceipt,
  settleDocumentRequests,
} from "./acceptance-folder-access-fixtures";

test("an ambiguous folder PATCH freezes the exact draft through close and reopen", async ({
  page,
}) => {
  const { unexpected } = await installFolderAccess(page);
  let writes = 0;
  await page.route(folderAccessPath, (route) => {
    writes++;
    return json(route, { message: "Synthetic unknown folder save" }, 503);
  });
  await page.goto("/capability-documents.html?files");
  let dialog = await openFolderAccess(page);
  await requestRestrictedAccess(page);
  await expect(dialog.getByRole("alert")).toContainText(
    "Synthetic unknown folder save",
  );
  await expect(
    dialog.getByRole("button", { name: "Save access" }),
  ).toBeDisabled();
  await expectRestrictedDraft(page);
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  dialog = await openFolderAccess(page);
  await expectRestrictedDraft(page);
  await expect(
    dialog.getByRole("button", { name: "Save access" }),
  ).toBeDisabled();
  expect(writes).toBe(1);
  expect(unexpected).toEqual([]);
});

test("an unknown folder intent survives actor navigation without entering another actor's form", async ({
  page,
}) => {
  const { unexpected } = await installFolderAccess(page);
  let writes = 0;
  await page.route(folderAccessPath, (route) => {
    writes++;
    return json(route, { message: "Synthetic unknown folder save" }, 503);
  });
  await page.goto("/capability-documents.html?files");
  const original = await openFolderAccess(page);
  await requestRestrictedAccess(page);
  await expect(original.getByRole("alert")).toContainText(
    "Synthetic unknown folder save",
  );
  await changeDocumentView(page, "actor");
  await expect(original).toHaveCount(0);
  const replacement = await openFolderAccess(page);
  await expect(
    replacement.getByRole("radio", { name: "Specific people" }),
  ).not.toBeChecked();
  await replacement.getByRole("button", { name: "Close", exact: true }).click();
  await changeDocumentView(page, "restore-actor");
  const reopened = await openFolderAccess(page);
  await expectRestrictedDraft(page);
  await expect(
    reopened.getByRole("button", { name: "Save access" }),
  ).toBeDisabled();
  expect(writes).toBe(1);
  expect(unexpected).toEqual([]);
});

test("a folder attempt fences two synchronous submits before its response arrives", async ({
  page,
}) => {
  const { unexpected } = await installFolderAccess(page);
  await page.goto("/capability-documents.html?files");
  const dialog = await openFolderAccess(page);
  await dialog.getByRole("radio", { name: "All team members" }).check();
  const held = await holdResponse(page, folderAccessPath, "PATCH", {
    folder: "Reports",
    viewerMode: "all",
    viewerUserIds: [],
    updated: 1,
  });
  try {
    await dialog.locator("form").evaluate((form) => {
      form.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
      form.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
    });
    await held.started;
    await expect(
      dialog.getByRole("button", { name: "Save access" }),
    ).toBeDisabled();
  } finally {
    held.release();
  }
  await held.settled;
  await settleDocumentRequests(page);
  expect(held.calls()).toBe(1);
  await expect(dialog).toHaveCount(0);
  expect(unexpected).toEqual([]);
});

test("a pending folder attempt cannot be dispatched again after an actor round-trip", async ({
  page,
}) => {
  const { unexpected } = await installFolderAccess(page);
  await page.goto("/capability-documents.html?files");
  const original = await openFolderAccess(page);
  const held = await holdResponse(
    page,
    folderAccessPath,
    "PATCH",
    restrictedReceipt,
  );
  try {
    await requestRestrictedAccess(page);
    await held.started;
    await changeDocumentView(page, "actor");
    await expect(original).toHaveCount(0);
    // This finite visible barrier proves the actor replacement rendered before restoring it.
    const other = await openFolderAccess(page);
    await other.getByRole("button", { name: "Close", exact: true }).click();
    await changeDocumentView(page, "restore-actor");
    const reopened = await openFolderAccess(page);
    await expectRestrictedDraft(page);
    await expect(
      reopened.getByRole("button", { name: "Save access" }),
    ).toBeDisabled();
  } finally {
    held.release();
  }
  await held.settled;
  await settleDocumentRequests(page);
  expect(held.calls()).toBe(1);
  expect(unexpected).toEqual([]);
});

for (const boundary of ["actor", "tenant", "client"] as const) {
  test(`a matching folder PATCH after ${boundary} replacement cannot close the replacement dialog`, async ({
    page,
  }) => {
    const { unexpected } = await installFolderAccess(page);
    await page.goto("/capability-documents.html?files");
    const original = await openFolderAccess(page);
    const held = await holdResponse(
      page,
      folderAccessPath,
      "PATCH",
      restrictedReceipt,
    );
    try {
      await requestRestrictedAccess(page);
      await held.started;
      await changeDocumentView(page, boundary);
      await expect(original).toHaveCount(0);
      const replacement = await openFolderAccess(page);
      await replacement
        .getByRole("radio", { name: "All team members" })
        .check();
    } finally {
      held.release();
    }
    await held.settled;
    await settleDocumentRequests(page);
    const replacement = page.getByRole("dialog", {
      name: "Access: Reports",
      exact: true,
    });
    await expect(replacement).toBeVisible();
    await expect(
      replacement.getByRole("radio", { name: "All team members" }),
    ).toBeChecked();
    await expect(
      replacement.getByRole("button", { name: "Save access" }),
    ).toBeEnabled();
    expect(held.calls()).toBe(1);
    expect(unexpected).toEqual([]);
  });
}

test("a matching folder PATCH after unmount cannot invalidate the departed view", async ({
  page,
}) => {
  const { unexpected } = await installFolderAccess(page);
  await page.goto("/capability-documents.html?files");
  await openFolderAccess(page);
  const held = await holdResponse(
    page,
    folderAccessPath,
    "PATCH",
    restrictedReceipt,
  );
  let departedCache: string | null = null;
  try {
    await requestRestrictedAccess(page);
    await held.started;
    await changeDocumentView(page, "unmount");
    await expect(page.getByText("Document view unmounted")).toBeVisible();
    departedCache = await page
      .getByLabel("Synthetic original document cache")
      .textContent();
  } finally {
    held.release();
  }
  await held.settled;
  await settleDocumentRequests(page);
  expect(
    await page.getByLabel("Synthetic original document cache").textContent(),
  ).toBe(departedCache);
  expect(held.calls()).toBe(1);
  expect(unexpected).toEqual([]);
});

test("folder dispatch rechecks authority synchronously before sending a stale form", async ({
  page,
}) => {
  const { unexpected } = await installFolderAccess(page);
  let writes = 0;
  await page.route(folderAccessPath, (route) => {
    writes++;
    return json(route, {
      folder: "Reports",
      viewerMode: "all",
      viewerUserIds: [],
      updated: 1,
    });
  });
  await page.goto("/capability-documents.html?files");
  const dialog = await openFolderAccess(page);
  await dialog.getByRole("radio", { name: "All team members" }).check();
  await dialog.locator("form").evaluate((form) => {
    window.dispatchEvent(new Event("file-documents-invalidate"));
    form.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );
  });
  await settleDocumentRequests(page);
  expect(writes).toBe(0);
  expect(unexpected).toEqual([]);
});

test("a current read-only actor can inspect folder controls but cannot save access", async ({
  page,
}) => {
  const { unexpected } = await installFolderAccess(page);
  let writes = 0;
  await page.route(folderAccessPath, (route) => {
    writes++;
    return json(route, restrictedReceipt);
  });
  await page.goto("/capability-documents.html?files");
  const original = await openFolderAccess(page);
  await changeDocumentView(page, "role");
  await expect(original).toHaveCount(0);
  const dialog = await openFolderAccess(page);
  await settleDocumentRequests(page);
  await expect(
    dialog.getByRole("radio", { name: "All team members" }),
  ).toBeDisabled();
  await expect(
    dialog.getByRole("button", { name: "Save access" }),
  ).toBeDisabled();
  expect(writes).toBe(0);
  expect(unexpected).toEqual([]);
});

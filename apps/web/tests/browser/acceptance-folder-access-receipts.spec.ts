import { expect, test } from "@playwright/test";
import { json } from "./fixtures";
import {
  expectRestrictedDraft,
  folderAccessPath,
  installFolderAccess,
  openFolderAccess,
  requestRestrictedAccess,
  restrictedReceipt,
  settleDocumentRequests,
  viewerIds,
} from "./acceptance-folder-access-fixtures";

const invalidReceipts: [string, unknown][] = [
  ["count-only acknowledgment", { updated: 1 }],
  ["foreign folder", { ...restrictedReceipt, folder: "Private" }],
  ["foreign unfiled group", { ...restrictedReceipt, folder: null }],
  ["contradictory access mode", { ...restrictedReceipt, viewerMode: "all" }],
  [
    "missing requested viewer",
    { ...restrictedReceipt, viewerUserIds: [viewerIds[0]] },
  ],
  [
    "additional viewer",
    {
      ...restrictedReceipt,
      viewerUserIds: [...viewerIds, "00000000-0000-4000-8000-000000000003"],
    },
  ],
  ["negative count", { ...restrictedReceipt, updated: -1 }],
  ["fractional count", { ...restrictedReceipt, updated: 0.5 }],
];

for (const [name, receipt] of invalidReceipts) {
  test(`folder ACL rejects ${name}, retains intent and fences another write`, async ({
    page,
  }) => {
    const { unexpected } = await installFolderAccess(page);
    const writes: unknown[] = [];
    await page.route(folderAccessPath, (route) => {
      expect(route.request().method()).toBe("PATCH");
      writes.push(route.request().postDataJSON());
      return json(route, receipt);
    });
    await page.goto("/capability-documents.html?files");
    const dialog = await openFolderAccess(page);
    await requestRestrictedAccess(page);
    await settleDocumentRequests(page);
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("alert")).toContainText(
      "unexpected response",
    );
    await expectRestrictedDraft(page);
    await expect(
      dialog.getByRole("button", { name: "Save access" }),
    ).toBeDisabled();
    expect(writes).toEqual([
      { folder: "Reports", viewerMode: "restricted", viewerUserIds: viewerIds },
    ]);
    expect(unexpected).toEqual([]);
  });
}

test("folder ACL accepts the native reordered viewer set and trimmed folder", async ({
  page,
}) => {
  const { unexpected } = await installFolderAccess(page, " Reports ");
  let writes = 0;
  await page.route(folderAccessPath, (route) => {
    writes++;
    expect(route.request().method()).toBe("PATCH");
    const body = route.request().postDataJSON();
    expect(body).toMatchObject({
      viewerMode: "restricted",
      viewerUserIds: viewerIds,
    });
    expect(body.folder.trim()).toBe("Reports");
    return json(route, {
      ...restrictedReceipt,
      viewerUserIds: [...viewerIds].reverse(),
    });
  });
  await page.goto("/capability-documents.html?files");
  const dialog = await openFolderAccess(page);
  await expect(dialog).toContainText(
    "Future uploads do not inherit this setting",
  );
  await requestRestrictedAccess(page);
  await expect(dialog).toHaveCount(0);
  expect(writes).toBe(1);
  expect(unexpected).toEqual([]);
});

test("folder ACL accepts a native zero-count unfiled response without inventing folder inheritance", async ({
  page,
}) => {
  const { unexpected } = await installFolderAccess(page, null);
  let writes = 0;
  await page.route(folderAccessPath, (route) => {
    writes++;
    expect(route.request().postDataJSON()).toEqual({
      folder: null,
      viewerMode: "all",
      viewerUserIds: [],
    });
    return json(route, {
      folder: null,
      viewerMode: "all",
      viewerUserIds: [],
      updated: 0,
    });
  });
  await page.goto("/capability-documents.html?files");
  const dialog = await openFolderAccess(page, "Unfiled");
  await dialog.getByRole("radio", { name: "All team members" }).check();
  await dialog.getByRole("button", { name: "Save access" }).click();
  await expect(dialog).toHaveCount(0);
  expect(writes).toBe(1);
  expect(unexpected).toEqual([]);
});

test("folder ACL allows a corrected explicit save after a definite 422 rejection", async ({
  page,
}) => {
  const { unexpected } = await installFolderAccess(page);
  const writes: unknown[] = [];
  await page.route(folderAccessPath, (route) => {
    writes.push(route.request().postDataJSON());
    return writes.length === 1
      ? json(route, { message: "Synthetic viewer rejected" }, 422)
      : json(route, {
          folder: "Reports",
          viewerMode: "all",
          viewerUserIds: [],
          updated: 1,
        });
  });
  await page.goto("/capability-documents.html?files");
  const dialog = await openFolderAccess(page);
  await requestRestrictedAccess(page);
  await expect(dialog.getByRole("alert")).toContainText(
    "Synthetic viewer rejected",
  );
  await expectRestrictedDraft(page);
  await expect(
    dialog.getByRole("button", { name: "Save access" }),
  ).toBeEnabled();
  expect(writes).toHaveLength(1);
  await dialog.getByRole("radio", { name: "All team members" }).check();
  await dialog.getByRole("button", { name: "Save access" }).click();
  await expect(dialog).toHaveCount(0);
  expect(writes).toEqual([
    { folder: "Reports", viewerMode: "restricted", viewerUserIds: viewerIds },
    { folder: "Reports", viewerMode: "all", viewerUserIds: [] },
  ]);
  expect(unexpected).toEqual([]);
});

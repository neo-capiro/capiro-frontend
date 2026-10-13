import { expect, test, type Route } from "@playwright/test";
import { clientId, json } from "./fixtures";
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

test("explicit current folder review preserves intent and permits only a separate deliberate save", async ({
  page,
}) => {
  const { unexpected, reads } = await installFolderAccess(page);
  let writes = 0;
  await page.route(folderAccessPath, (route) =>
    ++writes === 1
      ? json(route, { message: "Synthetic unknown folder save" }, 503)
      : json(route, restrictedReceipt),
  );
  await page.goto("/capability-documents.html?files");
  let dialog = await openFolderAccess(page);
  await requestRestrictedAccess(page);
  await expect(dialog.getByText(/save outcome is unknown/)).toBeVisible();
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  dialog = await openFolderAccess(page);
  await expectRestrictedDraft(page);
  await expect(
    dialog.getByRole("button", { name: "Save access" }),
  ).toBeDisabled();
  const before = reads.length;
  await dialog
    .getByRole("button", { name: "Review current folder files" })
    .click();
  await expect(dialog.getByRole("status")).toContainText(
    "Current visible folder files: 1",
  );
  await expect(dialog.getByRole("status")).toContainText(
    "does not confirm the earlier save",
  );
  await expect(dialog.getByRole("status")).toContainText("All team members");
  await expectRestrictedDraft(page);
  await expect(
    dialog.getByRole("button", { name: "Save access" }),
  ).toBeEnabled();
  expect(reads.length).toBeGreaterThan(before);
  expect(writes).toBe(1);
  await dialog.getByRole("button", { name: "Save access" }).click();
  await expect(dialog).toHaveCount(0);
  expect(writes).toBe(2);
  expect(unexpected).toEqual([]);
});

test("failed current folder review keeps uncertainty through collection recovery and reopen", async ({
  page,
}) => {
  const { unexpected } = await installFolderAccess(page);
  let writes = 0;
  await page.route(folderAccessPath, (route) => {
    writes++;
    return json(route, {}, 503);
  });
  await page.goto("/capability-documents.html?files");
  let dialog = await openFolderAccess(page);
  await requestRestrictedAccess(page);
  await expect(dialog.getByText(/save outcome is unknown/)).toBeVisible();
  const refuse = "**/core/engagement/attachments?**";
  const refuseRead = (route: Route) =>
    json(route, { message: "Synthetic folder review unavailable" }, 503);
  await page.route(refuse, refuseRead);
  await dialog
    .getByRole("button", { name: "Review current folder files" })
    .click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("alert")).toContainText(
    "Synthetic folder review unavailable",
  );
  // Remove only this test's latest refusal; the canonical synthetic list fixture remains.
  await page.unroute(refuse, refuseRead);
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  // The current-scope folder selection restores its dialog after the list recovers.
  await expect(dialog).toBeVisible();
  await expectRestrictedDraft(page);
  await expect(
    dialog.getByRole("button", { name: "Save access" }),
  ).toBeDisabled();
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  dialog = await openFolderAccess(page);
  await expectRestrictedDraft(page);
  await expect(
    dialog.getByRole("button", { name: "Save access" }),
  ).toBeDisabled();
  expect(writes).toBe(1);
  expect(unexpected).toEqual([]);
});

test("a held folder review cannot clear the original fence after actor replacement", async ({
  page,
}) => {
  const { unexpected } = await installFolderAccess(page);
  let writes = 0;
  await page.route(folderAccessPath, (route) => {
    writes++;
    return json(route, {}, 503);
  });
  await page.goto("/capability-documents.html?files");
  const original = await openFolderAccess(page);
  await requestRestrictedAccess(page);
  await expect(original.getByText(/save outcome is unknown/)).toBeVisible();
  const reviewPath = `**/core/engagement/attachments?clientId=${clientId}`;
  const held = await holdResponse(page, reviewPath, "GET", []);
  try {
    await original
      .getByRole("button", { name: "Review current folder files" })
      .click();
    await held.started;
    await changeDocumentView(page, "actor");
    await expect(original).toHaveCount(0);
  } finally {
    held.release();
  }
  await held.settled;
  await settleDocumentRequests(page);
  await page.unroute(reviewPath);
  await changeDocumentView(page, "restore-actor");
  const reopened = await openFolderAccess(page);
  await expectRestrictedDraft(page);
  await expect(
    reopened.getByRole("button", { name: "Save access" }),
  ).toBeDisabled();
  expect(writes).toBe(1);
  expect(unexpected).toEqual([]);
});

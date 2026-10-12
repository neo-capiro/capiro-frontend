import { expect, test } from "@playwright/test";
import { json } from "./fixtures";
import {
  changeDocumentView,
  holdResponse,
  installDocumentFixtures,
  nativeFile,
  settleDocumentRequests,
} from "./capability-documents-fixtures";

for (const action of [
  "preview",
  "delete",
  "file-access",
  "folder-access",
  "upload",
] as const) {
  test(`Files clears checked rows and the prior ${action} selection when the reader changes`, async ({
    page,
  }) => {
    const unexpected = await installDocumentFixtures(page);
    await page.route(
      `**/core/clients/*/files/${nativeFile.id}/access`,
      (route) => json(route, nativeFile),
    );
    await page.goto("/capability-documents.html?files");
    const checkbox = page.getByRole("checkbox", {
      name: `Select ${nativeFile.fileName}`,
      exact: true,
    });
    await checkbox.check();
    await expect(
      page.getByText("1 files · 1 selected", { exact: true }),
    ).toBeVisible();
    if (action === "upload")
      await page.getByRole("button", { name: "Upload", exact: true }).click();
    else if (action === "folder-access") {
      await page
        .getByRole("button", { name: `${nativeFile.folder} 1`, exact: true })
        .click();
      await page.getByRole("button", { name: "Access", exact: true }).click();
    } else {
      await page
        .getByRole("button", {
          name: `Actions for ${nativeFile.fileName}`,
          exact: true,
        })
        .click();
      await page
        .getByRole("menuitem", {
          name:
            action === "delete"
              ? "Delete file"
              : action === "file-access"
                ? "Manage access"
                : "Preview / download",
          exact: true,
        })
        .click();
    }
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    const held = await holdResponse(
      page,
      "**/core/engagement/attachments?**",
      "GET",
      [nativeFile],
    );
    try {
      await changeDocumentView(page, "actor");
      await expect(dialog).toHaveCount(0);
      await held.started;
    } finally {
      held.release();
    }
    await held.settled;
    await expect(checkbox).toBeVisible();
    await expect(checkbox).not.toBeChecked();
    await expect(dialog).toHaveCount(0);
    await expect(
      page.getByText("1 files · 0 selected", { exact: true }),
    ).toBeVisible();
    await settleDocumentRequests(page);
    expect(unexpected).toEqual([]);
  });
}

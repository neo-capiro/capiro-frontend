import { test, expect } from "@playwright/test";
import { installFixtures, json, clientId, file } from "./fixtures";
import { moveOutcome } from "../../test/browser/files-access-fixtures";
import {
  installDocumentFixtures,
  nativeFile,
  openDocuments,
  settleDocumentRequests,
} from "./capability-documents-fixtures";
const ready = {
  ...file,
  lifecycleStatus: "available",
  scanStatus: "clean",
  extractionStatus: "extracted",
  usable: true,
  blockedReason: undefined,
  previewUrl: "https://files.example.test/preview?signature=synthetic",
  downloadUrl: "https://files.example.test/download?signature=synthetic",
};

for (const entry of [
  "Preview / download",
  "Move to folder",
  "Manage access",
  "folder-access",
]) {
  test(`stale Files ${entry} entry observes the current reader without replacing it`, async ({
    page,
  }) => {
    const unexpected = await installDocumentFixtures(page);
    let identityReads = 0;
    page.on("request", (request) => {
      if (request.url().endsWith("/core/me")) identityReads += 1;
    });
    await page.route("**/core/engagement/attachments?**", (route) =>
      json(route, [{ ...nativeFile, metadataRevision: 3 }]),
    );
    await page.clock.setFixedTime(new Date("2026-10-25T12:00:00Z"));
    await page.goto("/capability-documents.html?files");
    await expect(
      page.getByRole("checkbox", {
        name: `Select ${nativeFile.fileName}`,
        exact: true,
      }),
    ).toBeVisible();
    if (entry === "folder-access")
      await page
        .getByRole("button", { name: `${nativeFile.folder} 1`, exact: true })
        .click();
    await settleDocumentRequests(page);
    const before = identityReads;
    await page.clock.setFixedTime(new Date("2026-10-25T12:00:31Z"));
    if (entry === "folder-access")
      await page.getByRole("button", { name: "Access", exact: true }).click();
    else {
      await page
        .getByRole("button", {
          name: `Actions for ${nativeFile.fileName}`,
          exact: true,
        })
        .click();
      await page.getByRole("menuitem", { name: entry, exact: true }).click();
    }
    await settleDocumentRequests(page);
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    if (entry === "Preview / download")
      await expect(
        dialog.getByRole("link", { name: "Download", exact: true }),
      ).toBeEnabled();
    expect(identityReads).toBe(before);
    expect(unexpected).toEqual([]);
  });
}

test("a stale entity document upload keeps its public dialog and current file owner", async ({
  page,
}) => {
  const unexpected = await installDocumentFixtures(page);
  await page.clock.setFixedTime(new Date("2026-10-25T12:00:00Z"));
  const editor = await openDocuments(page);
  await settleDocumentRequests(page);
  await page.clock.setFixedTime(new Date("2026-10-25T12:00:31Z"));
  await editor
    .getByRole("button", { name: "Upload document", exact: true })
    .click();
  await settleDocumentRequests(page);
  const dialog = page.getByRole("dialog", {
    name: "Upload files",
    exact: true,
  });
  await expect(
    dialog.getByLabel("Select files", { exact: true }),
  ).toBeEnabled();
  expect(unexpected).toEqual([]);
});

test("a wrong-client file response fails before exposing its name or signed URLs", async ({
  page,
}) => {
  const unexpected = await installFixtures(page);
  await page.route("**/engagement/attachments?**", (route) =>
    json(route, [
      {
        ...ready,
        clientId: "10000000-0000-4000-8000-000000000009",
        fileName: "Another client's confidential file.pdf",
      },
    ]),
  );
  await page.goto(`/portfolio/${clientId}/files`);
  await expect(page.getByRole("alert")).toContainText("unexpected response");
  await expect(
    page.getByText("Another client's confidential file.pdf"),
  ).toHaveCount(0);
  await expect(page.getByRole("table")).toHaveCount(0);
  expect(unexpected).toEqual([]);
});

for (const outcome of ["removed", "denied", "quarantined"] as const) {
  test(`an open file preview follows the current ${outcome} list state`, async ({
    page,
  }) => {
    const unexpected = await installFixtures(page);
    let changed = false;
    await page.route("**/engagement/attachments?**", (route) => {
      if (!changed) return json(route, [ready]);
      if (outcome === "denied")
        return json(route, { message: "Access removed" }, 403);
      return json(
        route,
        outcome === "removed"
          ? []
          : [{ ...file, blockedReason: "scan_pending" }],
      );
    });
    await page.route(
      `**/engagement/attachments/${file.id}/extract-text`,
      (route) => {
        changed = true;
        return json(route, {
          attachmentId: file.id,
          text: "Text from prior file state",
        });
      },
    );
    await page.goto(`/portfolio/${clientId}/files`);
    await page
      .getByRole("button", { name: "pdf Test report.pdf", exact: true })
      .click();
    const preview = page.getByRole("dialog", { name: file.fileName });
    await expect(
      preview.getByRole("link", { name: "Download", exact: true }),
    ).toBeVisible();
    await preview.getByRole("button", { name: "Read extracted text" }).click();
    if (outcome === "quarantined") {
      await expect(preview).toContainText("scan_pending");
      await expect(
        preview.getByRole("button", { name: "Read extracted text" }),
      ).toBeDisabled();
    } else {
      await expect(preview).not.toBeVisible();
    }
    await expect(
      page.getByRole("link", { name: "Download", exact: true }),
    ).toHaveCount(0);
    await expect(page.getByText("Text from prior file state")).toHaveCount(0);
    if (outcome === "denied")
      await expect(page.getByRole("alert")).toContainText("permission");
    expect(unexpected).toEqual([]);
  });
}

test("a mismatched folder-save receipt keeps the edit open and does not claim success", async ({
  page,
}) => {
  const unexpected = await installFixtures(page);
  await page.route("**/engagement/attachments?**", (route) =>
    json(route, [{ ...file, metadataRevision: 3 }]),
  );
  await page.route(`**/files/batch-moves`, (route) => {
    const outcome = moveOutcome(route.request().postDataJSON());
    outcome.files[0]!.id = "60000000-0000-4000-8000-000000000009";
    return json(route, outcome);
  });
  await page.goto(`/portfolio/${clientId}/files`);
  await page.getByRole("checkbox", { name: `Select ${file.fileName}` }).check();
  await page.getByRole("button", { name: "New folder", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "New folder" });
  await dialog.getByLabel("Folder name").fill("Reviewed folder");
  await dialog
    .getByRole("button", { name: "Create folder & move file" })
    .click();
  await expect(dialog.getByRole("alert")).toContainText("unexpected response");
  await expect(dialog.getByLabel("Folder name")).toHaveValue("Reviewed folder");
  expect(unexpected).toEqual([]);
});

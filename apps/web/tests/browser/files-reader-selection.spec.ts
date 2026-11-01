import { expect, test } from "@playwright/test";
import { json } from "./fixtures";
import {
  changeDocumentView,
  holdResponse,
  installDocumentFixtures,
  nativeFile,
  settleDocumentRequests,
} from "./capability-documents-fixtures";

for (const entry of ["Upload", "Upload here"] as const) {
  test(`Files ${entry} stays open after the identity cache becomes stale`, async ({
    page,
  }, testInfo) => {
    const unexpected = await installDocumentFixtures(page);
    let identityReads = 0;
    const mutations: string[] = [];
    page.on("request", (request) => {
      if (request.url().endsWith("/core/me")) identityReads += 1;
      if (request.method() !== "GET") mutations.push(request.method());
    });
    await page.route("**/core/engagement/attachments?**", (route) =>
      json(route, []),
    );
    await page.clock.setFixedTime(new Date("2026-10-25T12:00:00Z"));
    await page.goto("/capability-documents.html?files");
    const button = page.getByRole("button", { name: entry, exact: true });
    await expect(button).toBeEnabled();
    await settleDocumentRequests(page);
    const before = identityReads;
    await page.clock.setFixedTime(new Date("2026-10-25T12:00:31Z"));
    await button.click();
    await settleDocumentRequests(page);
    await testInfo.attach("stale-mount-observation", {
      body: JSON.stringify({
        identityReadsBefore: before,
        identityReadsAfter: identityReads,
        dialogs: await page.getByRole("dialog").count(),
        fileInputs: await page.locator('input[type="file"]').count(),
      }),
      contentType: "application/json",
    });
    const dialog = page.getByRole("dialog", {
      name: "Upload files",
      exact: true,
    });
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByLabel("Select files", { exact: true }),
    ).toBeEnabled();
    expect(identityReads).toBe(before);
    expect(mutations).toEqual([]);
    expect(unexpected).toEqual([]);
  });
}

test("an explicit denied file refresh still removes a stale-open upload dialog", async ({
  page,
}) => {
  const unexpected = await installDocumentFixtures(page);
  await page.clock.setFixedTime(new Date("2026-10-25T12:00:00Z"));
  await page.goto("/capability-documents.html?files");
  const upload = page.getByRole("button", { name: "Upload", exact: true });
  await expect(upload).toBeEnabled();
  await settleDocumentRequests(page);
  await page.clock.setFixedTime(new Date("2026-10-25T12:00:31Z"));
  await upload.click();
  const dialog = page.getByRole("dialog", {
    name: "Upload files",
    exact: true,
  });
  await expect(
    dialog.getByLabel("Select files", { exact: true }),
  ).toBeEnabled();
  await page.route("**/core/engagement/attachments?**", (route) =>
    json(route, { message: "Synthetic current file access denied" }, 403),
  );
  await changeDocumentView(page, "files");
  await expect(dialog).toHaveCount(0);
  await expect(upload).toBeDisabled();
  await expect(
    page.getByText(nativeFile.fileName, { exact: true }),
  ).toHaveCount(0);
  expect(unexpected).toEqual([]);
});

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
      page.getByText("1 file · 1 selected", { exact: true }),
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
      page.getByText("1 file · 0 selected", { exact: true }),
    ).toBeVisible();
    await settleDocumentRequests(page);
    expect(unexpected).toEqual([]);
  });
}

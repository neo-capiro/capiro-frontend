import { expect, test, type Page } from "@playwright/test";
import { installFixtures, json, clientId, client, file } from "./fixtures";
import {
  changeDocumentView,
  holdResponse,
  installDocumentFixtures,
  nativeFile,
  settleDocumentRequests,
} from "./capability-documents-fixtures";

async function openAccess(page: Page, name = file.fileName) {
  await page.getByRole("button", { name: `Actions for ${name}` }).click();
  await page
    .getByRole("menuitem", { name: "Manage access", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: `Access: ${name}`,
    exact: true,
  });
  await expect(
    dialog.getByRole("radio", { name: "All team members" }),
  ).toBeVisible();
  return dialog;
}

test("conflicting ACL receipt retains the draft and freezes repeat save until current GET review", async ({
  page,
}, info) => {
  const unexpected = await installFixtures(page);
  let patches = 0;
  let reads = 0;
  await page.route("**/engagement/attachments?**", (r) => json(r, [file]));
  await page.route(`**/files/${file.id}/access`, (r) => {
    if (r.request().method() === "GET") {
      reads++;
      return json(r, file);
    }
    patches++;
    expect(r.request().postDataJSON()).toEqual({
      viewerMode: "restricted",
      viewerUserIds: [],
    });
    return json(
      r,
      patches === 1 ? file : { ...file, viewerMode: "restricted" },
    );
  });
  await page.goto(`/portfolio/${clientId}/files`);
  const dialog = await openAccess(page);
  await dialog.getByRole("radio", { name: "Specific people" }).check();
  await dialog.getByRole("button", { name: "Save access" }).click();
  await expect(dialog.getByRole("alert")).toContainText("unexpected response");
  await expect(
    dialog.getByRole("radio", { name: "Specific people" }),
  ).toBeChecked();
  await expect(
    dialog.getByRole("button", { name: "Save access" }),
  ).toBeDisabled();
  await expect(dialog.getByText(/save outcome is unknown/i)).toBeVisible();
  await page.screenshot({ path: info.outputPath("conflicting-acl.png") });
  const priorReads = reads;
  await dialog.getByRole("button", { name: "Review current file" }).click();
  await expect.poll(() => reads).toBeGreaterThan(priorReads);
  await expect(
    dialog.getByText(/Current saved access: All team members/),
  ).toBeVisible();
  await expect(
    dialog.getByRole("radio", { name: "Specific people" }),
  ).toBeChecked();
  await expect(
    dialog.getByRole("button", { name: "Save access" }),
  ).toBeEnabled();
  expect(patches).toBe(1);
  await dialog.getByRole("button", { name: "Save access" }).click();
  await expect(dialog).toHaveCount(0);
  expect(patches).toBe(2);
  expect(unexpected).toEqual([]);
});

test("a matching reordered restricted viewer set completes the save", async ({
  page,
}) => {
  const unexpected = await installFixtures(page);
  const ids = [
    "00000000-0000-4000-8000-000000000001",
    "00000000-0000-4000-8000-000000000002",
  ];
  let saved = false;
  await page.route("**/core/client-account-owners/options", (r) =>
    json(
      r,
      ids.map((id, index) => ({
        id,
        email: `viewer${index}@example.test`,
        firstName: `Viewer ${index}`,
        lastName: "Test",
      })),
    ),
  );
  await page.route("**/engagement/attachments?**", (r) =>
    json(r, [
      saved ? { ...file, viewerMode: "restricted", viewerUserIds: ids } : file,
    ]),
  );
  await page.route(`**/files/${file.id}/access`, (r) => {
    if (r.request().method() === "GET")
      return json(
        r,
        saved
          ? { ...file, viewerMode: "restricted", viewerUserIds: ids }
          : file,
      );
    expect(r.request().postDataJSON()).toEqual({
      viewerMode: "restricted",
      viewerUserIds: ids,
    });
    saved = true;
    return json(r, {
      ...file,
      viewerMode: "restricted",
      viewerUserIds: [...ids].reverse(),
    });
  });
  await page.goto(`/portfolio/${clientId}/files`);
  const dialog = await openAccess(page);
  await dialog.getByRole("radio", { name: "Specific people" }).check();
  await dialog.getByRole("checkbox", { name: /Viewer 0 Test/ }).check();
  await dialog.getByRole("checkbox", { name: /Viewer 1 Test/ }).check();
  await dialog.getByRole("button", { name: "Save access" }).click();
  await expect(dialog).toHaveCount(0);
  expect(saved).toBe(true);
  expect(unexpected).toEqual([]);
});

test("a definite access rejection retains an editable draft", async ({
  page,
}) => {
  const unexpected = await installFixtures(page);
  await page.route("**/engagement/attachments?**", (r) => json(r, [file]));
  await page.route(`**/files/${file.id}/access`, (r) =>
    r.request().method() === "GET"
      ? json(r, file)
      : json(r, { message: "Synthetic invalid viewer" }, 422),
  );
  await page.goto(`/portfolio/${clientId}/files`);
  const dialog = await openAccess(page);
  await dialog.getByRole("radio", { name: "Specific people" }).check();
  await dialog.getByRole("button", { name: "Save access" }).click();
  await expect(dialog.getByRole("alert")).toContainText(
    "Synthetic invalid viewer",
  );
  await expect(
    dialog.getByRole("radio", { name: "Specific people" }),
  ).toBeChecked();
  await expect(
    dialog.getByRole("button", { name: "Save access" }),
  ).toBeEnabled();
  await expect(
    dialog.getByRole("button", { name: "Review current file" }),
  ).toHaveCount(0);
  expect(unexpected).toEqual([]);
});

for (const boundary of ["actor", "client", "unmount"] as const) {
  test(`a matching PATCH completing after ${boundary} replacement cannot close or update the replacement view`, async ({
    page,
  }) => {
    const unexpected = await installDocumentFixtures(page);
    await page.route(
      "**/core/clients/10000000-0000-4000-8000-000000000002",
      (r) => json(r, { ...client, id: "10000000-0000-4000-8000-000000000002" }),
    );
    await page.route(`**/files/${nativeFile.id}/access`, (r) =>
      json(r, nativeFile),
    );
    await page.goto("/capability-documents.html?files");
    const dialog = await openAccess(page, nativeFile.fileName);
    const held = await holdResponse(
      page,
      `**/files/${nativeFile.id}/access`,
      "PATCH",
      { ...nativeFile, viewerMode: "restricted" },
    );
    try {
      await dialog.getByRole("radio", { name: "Specific people" }).check();
      await dialog.getByRole("button", { name: "Save access" }).click();
      await held.started;
      await changeDocumentView(page, boundary);
      await expect(dialog).toHaveCount(0);
    } finally {
      held.release();
    }
    await held.settled;
    await settleDocumentRequests(page);
    expect(held.calls()).toBe(1);
    await expect(page.getByText(/Current saved access:/)).toHaveCount(0);
    if (boundary === "actor") {
      await changeDocumentView(page, "restore-actor");
      const reopened = await openAccess(page, nativeFile.fileName);
      await expect(
        reopened.getByRole("radio", { name: "Specific people" }),
      ).toBeChecked();
      await expect(
        reopened.getByRole("button", { name: "Save access" }),
      ).toBeDisabled();
      await expect(
        reopened.getByRole("button", { name: "Review current file" }),
      ).toBeEnabled();
    }
    expect(unexpected).toEqual([]);
  });
}

test("a review completing after actor replacement cannot clear the original unknown save", async ({
  page,
}) => {
  const unexpected = await installDocumentFixtures(page);
  await page.route(`**/files/${nativeFile.id}/access`, (r) =>
    json(r, nativeFile),
  );
  await page.goto("/capability-documents.html?files");
  const dialog = await openAccess(page, nativeFile.fileName);
  await dialog.getByRole("radio", { name: "Specific people" }).check();
  await dialog.getByRole("button", { name: "Save access" }).click();
  await expect(dialog.getByText(/save outcome is unknown/i)).toBeVisible();
  const held = await holdResponse(
    page,
    `**/files/${nativeFile.id}/access`,
    "GET",
    nativeFile,
  );
  try {
    await dialog.getByRole("button", { name: "Review current file" }).click();
    await held.started;
    await changeDocumentView(page, "actor");
    await expect(dialog).toHaveCount(0);
  } finally {
    held.release();
  }
  await held.settled;
  await settleDocumentRequests(page);
  await changeDocumentView(page, "restore-actor");
  const reopened = await openAccess(page, nativeFile.fileName);
  await expect(
    reopened.getByRole("radio", { name: "Specific people" }),
  ).toBeChecked();
  await expect(
    reopened.getByRole("button", { name: "Save access" }),
  ).toBeDisabled();
  await expect(
    reopened.getByRole("button", { name: "Review current file" }),
  ).toBeEnabled();
  expect(unexpected).toEqual([]);
});

test("an unknown draft can recover even when the reopened access query fails", async ({
  page,
}) => {
  const unexpected = await installDocumentFixtures(page);
  let failReads = false;
  let writes = 0;
  await page.route(`**/files/${nativeFile.id}/access`, (r) => {
    if (r.request().method() === "GET")
      return failReads
        ? json(r, { message: "Synthetic read failure" }, 503)
        : json(r, nativeFile);
    writes++;
    return json(
      r,
      writes === 1 ? nativeFile : { ...nativeFile, viewerMode: "restricted" },
    );
  });
  await page.goto("/capability-documents.html?files");
  let dialog = await openAccess(page, nativeFile.fileName);
  await dialog.getByRole("radio", { name: "Specific people" }).check();
  await dialog.getByRole("button", { name: "Save access" }).click();
  await expect(dialog.getByText(/save outcome is unknown/i)).toBeVisible();
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  failReads = true;
  await changeDocumentView(page, "actor");
  await settleDocumentRequests(page);
  await changeDocumentView(page, "restore-actor");
  dialog = await openAccess(page, nativeFile.fileName);
  await expect(dialog.getByRole("alert")).toContainText(
    "Synthetic read failure",
  );
  await expect(
    dialog.getByRole("radio", { name: "Specific people" }),
  ).toBeChecked();
  failReads = false;
  await dialog.getByRole("button", { name: "Review current file" }).click();
  await expect(
    dialog.getByText(/Current saved access: All team members/),
  ).toBeVisible();
  await expect(
    dialog.getByRole("radio", { name: "Specific people" }),
  ).toBeChecked();
  await expect(
    dialog.getByRole("button", { name: "Save access" }),
  ).toBeEnabled();
  await dialog.getByRole("button", { name: "Save access" }).click();
  await expect(dialog).toHaveCount(0);
  expect(writes).toBe(2);
  expect(unexpected).toEqual([]);
});

test("reopening access as another reader requests that reader's current ACL", async ({
  page,
}) => {
  const unexpected = await installDocumentFixtures(page);
  let reads = 0;
  await page.route(`**/files/${nativeFile.id}/access`, (r) => {
    reads++;
    return json(
      r,
      reads === 1 ? nativeFile : { ...nativeFile, viewerMode: "restricted" },
    );
  });
  await page.goto("/capability-documents.html?files");
  const original = await openAccess(page, nativeFile.fileName);
  await expect(
    original.getByRole("radio", { name: "All team members" }),
  ).toBeChecked();
  await original.getByRole("button", { name: "Close", exact: true }).click();
  await changeDocumentView(page, "actor");
  const current = await openAccess(page, nativeFile.fileName);
  await expect(
    current.getByRole("radio", { name: "Specific people" }),
  ).toBeChecked();
  expect(reads).toBe(2);
  expect(unexpected).toEqual([]);
});

test("a contradictory folder receipt keeps the requested folder and needs current review", async ({
  page,
}) => {
  const unexpected = await installFixtures(page);
  let patches = 0;
  await page.route("**/engagement/attachments?**", (r) => json(r, [file]));
  await page.route(`**/files/${file.id}/access`, (r) => json(r, file));
  await page.route(`**/files/${file.id}/folder`, (r) => {
    patches++;
    return json(r, file);
  });
  await page.goto(`/portfolio/${clientId}/files`);
  await page.getByRole("checkbox", { name: `Select ${file.fileName}` }).check();
  await page.getByRole("button", { name: "New folder", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "New folder", exact: true });
  await dialog.getByLabel("Folder name").fill("Reviewed destination");
  await dialog
    .getByRole("button", { name: "Create folder & move file" })
    .click();
  await expect(dialog.getByRole("alert")).toContainText("unexpected response");
  await expect(dialog.getByLabel("Folder name")).toHaveValue(
    "Reviewed destination",
  );
  await expect(
    dialog.getByRole("button", { name: "Create folder & move file" }),
  ).toBeDisabled();
  await dialog.getByRole("button", { name: "Review current file" }).click();
  await expect(dialog.getByText("Current saved folder: Reports")).toBeVisible();
  await expect(dialog.getByLabel("Folder name")).toHaveValue(
    "Reviewed destination",
  );
  await expect(
    dialog.getByRole("button", { name: "Create folder & move file" }),
  ).toBeEnabled();
  expect(patches).toBe(1);
  expect(unexpected).toEqual([]);
});

test("unknown ACL save survives close/reopen and a failed review does not thaw it", async ({
  page,
}) => {
  await installFixtures(page);
  let patches = 0;
  let refuseRead = false;
  await page.route("**/engagement/attachments?**", (r) => json(r, [file]));
  await page.route(`**/files/${file.id}/access`, (r) => {
    if (r.request().method() === "GET")
      return refuseRead
        ? json(r, { message: "Synthetic review unavailable" }, 503)
        : json(r, file);
    patches++;
    return json(r, { message: "Synthetic ambiguous patch" }, 503);
  });
  await page.goto(`/portfolio/${clientId}/files`);
  let dialog = await openAccess(page);
  await dialog.getByRole("radio", { name: "Specific people" }).check();
  await dialog.getByRole("button", { name: "Save access" }).click();
  await expect(dialog.getByRole("alert")).toContainText(
    "Synthetic ambiguous patch",
  );
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  dialog = await openAccess(page);
  await expect(
    dialog.getByRole("radio", { name: "Specific people" }),
  ).toBeChecked();
  await expect(
    dialog.getByRole("button", { name: "Save access" }),
  ).toBeDisabled();
  refuseRead = true;
  await dialog.getByRole("button", { name: "Review current file" }).click();
  await expect(
    dialog.getByText("Synthetic review unavailable", { exact: false }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Save access" }),
  ).toBeDisabled();
  expect(patches).toBe(1);
});

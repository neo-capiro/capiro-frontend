import { expect, test, type Page } from "@playwright/test";
import { client, clientId, installFixtures, json } from "./fixtures";
import {
  changeDocumentView,
  holdResponse,
  installDocumentFixtures,
  nativeFile,
  settleDocumentRequests,
} from "./capability-documents-fixtures";

async function openDelete(page: Page) {
  await page
    .getByRole("button", { name: `Actions for ${nativeFile.fileName}` })
    .click();
  await page
    .getByRole("menuitem", { name: "Delete file", exact: true })
    .click();
  return page.getByRole("dialog", { name: "Delete file", exact: true });
}

test("unknown deletion survives close/reopen until deliberate current review and a new confirmation", async ({
  page,
}, info) => {
  const unexpected = await installFixtures(page);
  let deletes = 0;
  let reads = 0;
  await page.route("**/engagement/attachments?**", (r) => {
    reads++;
    return json(
      r,
      deletes === 2
        ? []
        : [
            {
              ...nativeFile,
              lifecycleStatus: deletes ? "delete_failed" : "ready",
            },
          ],
    );
  });
  await page.route(`**/engagement/attachments/${nativeFile.id}`, (r) => {
    deletes++;
    return deletes === 1
      ? json(r, { message: "Synthetic ambiguous delete" }, 503)
      : json(r, { ok: true });
  });
  await page.goto(`/portfolio/${clientId}/files`);
  let dialog = await openDelete(page);
  await dialog.getByRole("button", { name: "Confirm delete" }).click();
  await expect(dialog.getByText("Synthetic ambiguous delete")).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Confirm delete" }),
  ).toBeDisabled();
  await expect(dialog.getByText(/deletion outcome is unknown/)).toBeVisible();
  await page.screenshot({
    path: info.outputPath("delete-unknown-desktop.png"),
  });
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  dialog = await openDelete(page);
  await expect(
    dialog.getByRole("button", { name: "Confirm delete" }),
  ).toBeDisabled();
  const before = reads;
  await dialog.getByRole("button", { name: "Review current files" }).focus();
  await page.keyboard.press("Enter");
  await expect(dialog.getByRole("status")).toContainText(
    "Current deletion status: Failed",
  );
  await expect(dialog.getByRole("status")).toContainText(
    "does not confirm the earlier deletion",
  );
  await expect(
    dialog.getByRole("button", { name: "Confirm delete" }),
  ).toBeEnabled();
  expect(reads).toBeGreaterThan(before);
  expect(deletes).toBe(1);
  await dialog.getByRole("button", { name: "Confirm delete" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: `Actions for ${nativeFile.fileName}` }),
  ).toHaveCount(0);
  expect(deletes).toBe(2);
  expect(unexpected).toEqual([]);
});

test("an absent current file is unavailable, not a deletion confirmation", async ({
  page,
}, info) => {
  const unexpected = await installFixtures(page);
  await page.setViewportSize({ width: 360, height: 800 });
  let dispatched = false;
  await page.route("**/engagement/attachments?**", (r) =>
    json(r, dispatched ? [] : [nativeFile]),
  );
  await page.route(`**/engagement/attachments/${nativeFile.id}`, (r) => {
    dispatched = true;
    return json(r, {}, 503);
  });
  await page.goto(`/portfolio/${clientId}/files`);
  const dialog = await openDelete(page);
  await dialog.getByRole("button", { name: "Confirm delete" }).click();
  await expect(dialog.getByText(/deletion outcome is unknown/)).toBeVisible();
  await dialog.getByRole("button", { name: "Review current files" }).click();
  await expect(dialog.getByRole("status")).toContainText(
    "not in the current visible client files",
  );
  await expect(dialog.getByRole("status")).toContainText(
    "does not confirm the earlier deletion",
  );
  await expect(
    dialog.getByRole("button", { name: "Confirm delete" }),
  ).toBeDisabled();
  const geometry = await dialog.evaluate((el) => ({
    left: el.getBoundingClientRect().left,
    right: el.getBoundingClientRect().right,
    client: el.clientWidth,
    scroll: el.scrollWidth,
  }));
  expect(geometry.left).toBeGreaterThanOrEqual(0);
  expect(geometry.right).toBeLessThanOrEqual(360);
  expect(geometry.scroll).toBeLessThanOrEqual(geometry.client);
  for (const key of ["Tab", "Tab", "Shift+Tab"]) {
    await page.keyboard.press(key);
    await expect
      .poll(() => dialog.evaluate((el) => el.contains(document.activeElement)))
      .toBe(true);
  }
  await page.screenshot({ path: info.outputPath("delete-absent-mobile.png") });
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  expect(unexpected).toEqual([]);
});

test("pending current deletion stays fenced until a later explicit review reports a recoverable file", async ({
  page,
}) => {
  const unexpected = await installFixtures(page);
  let lifecycle = "ready";
  let deletes = 0;
  await page.route("**/engagement/attachments?**", (r) =>
    json(r, [{ ...nativeFile, lifecycleStatus: lifecycle }]),
  );
  await page.route(`**/engagement/attachments/${nativeFile.id}`, (r) => {
    deletes++;
    return json(r, {}, 503);
  });
  await page.goto(`/portfolio/${clientId}/files`);
  const dialog = await openDelete(page);
  await dialog.getByRole("button", { name: "Confirm delete" }).click();
  lifecycle = "delete_pending";
  await dialog.getByRole("button", { name: "Review current files" }).click();
  await expect(dialog.getByRole("status")).toContainText(
    "Deletion is still pending",
  );
  await expect(
    dialog.getByRole("button", { name: "Confirm delete" }),
  ).toBeDisabled();
  lifecycle = "delete_failed";
  await dialog.getByRole("button", { name: "Review current files" }).click();
  await expect(dialog.getByRole("status")).toContainText(
    "Current deletion status: Failed",
  );
  await expect(
    dialog.getByRole("button", { name: "Confirm delete" }),
  ).toBeEnabled();
  expect(deletes).toBe(1);
  expect(unexpected).toEqual([]);
});

test("a definite deletion refusal does not impose an unknown fence", async ({
  page,
}) => {
  const unexpected = await installDocumentFixtures(page);
  await page.route(`**/engagement/attachments/${nativeFile.id}`, (r) =>
    json(r, { message: "Synthetic definite refusal" }, 403),
  );
  await page.goto("/capability-documents.html?files");
  const dialog = await openDelete(page);
  await dialog.getByRole("button", { name: "Confirm delete" }).click();
  await expect(dialog.getByRole("alert")).toContainText(
    "You do not have permission for this operation.",
  );
  await expect(
    dialog.getByRole("button", { name: "Confirm delete" }),
  ).toBeEnabled();
  await expect(
    dialog.getByRole("button", { name: "Review current files" }),
  ).toHaveCount(0);
  expect(unexpected).toEqual([]);
});

for (const status of [403, 503]) {
  test(`a failed explicit current read ${status} revokes all cached file actions until successful recovery`, async ({
    page,
  }) => {
    const unexpected = await installDocumentFixtures(page);
    const other = {
      ...nativeFile,
      id: "60000000-0000-4000-8000-000000000002",
      fileName: "Second current file.txt",
    };
    let failed = false;
    let deletes = 0;
    await page.route("**/engagement/attachments?**", (r) =>
      failed
        ? json(r, { message: "Synthetic read unavailable" }, status)
        : json(r, [nativeFile, other]),
    );
    await page.route(`**/engagement/attachments/${nativeFile.id}`, (r) => {
      deletes++;
      return json(r, {}, 503);
    });
    await page.goto("/capability-documents.html?files");
    let dialog = await openDelete(page);
    await dialog.getByRole("button", { name: "Confirm delete" }).click();
    await expect(dialog.getByText(/deletion outcome is unknown/)).toBeVisible();
    failed = true;
    await dialog.getByRole("button", { name: "Review current files" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole("alert")).toContainText(
      status === 403
        ? "You do not have permission for this operation."
        : "Synthetic read unavailable",
    );
    await expect(
      page.getByRole("button", { name: /^Actions for / }),
    ).toHaveCount(0);
    await expect(page.getByText(other.fileName, { exact: true })).toHaveCount(
      0,
    );
    await expect(
      page.getByRole("button", { name: "Upload", exact: true }),
    ).toBeDisabled();
    failed = false;
    await page.getByRole("button", { name: "Retry", exact: true }).click();
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: "Confirm delete" }),
    ).toBeDisabled();
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    await expect(
      page.getByRole("button", { name: `Actions for ${other.fileName}` }),
    ).toBeVisible();
    dialog = await openDelete(page);
    await expect(
      dialog.getByRole("button", { name: "Confirm delete" }),
    ).toBeDisabled();
    await dialog.getByRole("button", { name: "Review current files" }).click();
    await expect(
      dialog.getByRole("button", { name: "Confirm delete" }),
    ).toBeEnabled();
    expect(deletes).toBe(1);
    expect(unexpected).toEqual([]);
  });
}

for (const boundary of ["actor", "client", "unmount"] as const) {
  test(`a late deletion receipt after ${boundary} replacement cannot publish completion into the new view`, async ({
    page,
  }) => {
    const unexpected = await installDocumentFixtures(page);
    await page.route(
      "**/core/clients/10000000-0000-4000-8000-000000000002",
      (r) => json(r, { ...client, id: "10000000-0000-4000-8000-000000000002" }),
    );
    await page.goto("/capability-documents.html?files");
    const dialog = await openDelete(page);
    const held = await holdResponse(
      page,
      `**/engagement/attachments/${nativeFile.id}`,
      "DELETE",
      { ok: true },
    );
    try {
      await dialog.getByRole("button", { name: "Confirm delete" }).click();
      await held.started;
      await expect(
        dialog.getByRole("button", { name: "Confirm delete" }),
      ).toBeDisabled();
      await page.keyboard.press("Escape");
      await expect(dialog).toBeVisible();
      await changeDocumentView(page, boundary);
      await expect(dialog).toHaveCount(0);
    } finally {
      held.release();
    }
    await held.settled;
    await settleDocumentRequests(page);
    expect(held.calls()).toBe(1);
    await expect(page.getByText(/This is current visible state/)).toHaveCount(
      0,
    );
    if (boundary === "actor") {
      await changeDocumentView(page, "restore-actor");
      const reopened = await openDelete(page);
      await expect(
        reopened.getByRole("button", { name: "Confirm delete" }),
      ).toBeDisabled();
      await expect(
        reopened.getByRole("button", { name: "Review current files" }),
      ).toBeEnabled();
    }
    expect(unexpected).toEqual([]);
  });
}

test("a current read completing after actor replacement cannot release the old fence or leak its state", async ({
  page,
}) => {
  const unexpected = await installDocumentFixtures(page);
  await page.route(`**/engagement/attachments/${nativeFile.id}`, (r) =>
    json(r, {}, 503),
  );
  await page.goto("/capability-documents.html?files");
  const dialog = await openDelete(page);
  await dialog.getByRole("button", { name: "Confirm delete" }).click();
  const held = await holdResponse(page, "**/engagement/attachments?**", "GET", [
    nativeFile,
  ]);
  try {
    await dialog.getByRole("button", { name: "Review current files" }).click();
    await held.started;
    await changeDocumentView(page, "actor");
    await expect(dialog).toHaveCount(0);
  } finally {
    held.release();
  }
  await held.settled;
  await settleDocumentRequests(page);
  await expect(page.getByText(/This is current visible state/)).toHaveCount(0);
  await changeDocumentView(page, "restore-actor");
  const reopened = await openDelete(page);
  await expect(
    reopened.getByRole("button", { name: "Confirm delete" }),
  ).toBeDisabled();
  expect(unexpected).toEqual([]);
});

for (const status of [200, 403]) {
  test(`a superseded current read returning ${status} cannot replace or poison newer client files`, async ({
    page,
  }) => {
    const unexpected = await installDocumentFixtures(page);
    await page.route(`**/engagement/attachments/${nativeFile.id}`, (r) =>
      json(r, {}, 503),
    );
    await page.goto("/capability-documents.html?files");
    const dialog = await openDelete(page);
    await dialog.getByRole("button", { name: "Confirm delete" }).click();
    let release!: () => void;
    let received!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const started = new Promise<void>((resolve) => {
      received = resolve;
    });
    let reads = 0;
    await page.route("**/engagement/attachments?**", async (r) => {
      if (++reads === 1) {
        received();
        await gate;
        return json(
          r,
          status === 200 ? [nativeFile] : { message: "Obsolete refusal" },
          status,
        );
      }
      return json(r, [{ ...nativeFile, fileName: "Newer current file.txt" }]);
    });
    try {
      await dialog
        .getByRole("button", { name: "Review current files" })
        .click();
      await started;
      await changeDocumentView(page, "files");
      await expect(
        page.getByLabel("Synthetic original document cache"),
      ).toContainText("Newer current file.txt");
    } finally {
      release();
    }
    await expect(
      dialog.getByText(/current files changed during review/),
    ).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: "Confirm delete" }),
    ).toBeDisabled();
    await expect(
      page.getByLabel("Synthetic original document cache"),
    ).toContainText("Newer current file.txt");
    expect(unexpected).toEqual([]);
  });
}

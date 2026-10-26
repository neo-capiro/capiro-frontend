import { test, expect, type Page, type TestInfo } from "@playwright/test";
import {
  assetManagementFixture,
  folderId,
  createdFolderId,
} from "./newsletter-asset-management-fixture";
import {
  openImagePicker,
  chooseDetails,
  asset,
  assetId,
  secondId,
  originalUrl,
  auditDialog,
} from "./newsletter-assets-fixture";
import {
  button,
  heldResponse,
  adoptDocument,
  navigate,
  editorUrl,
  otherClientId,
} from "./newsletter-document-fixtures";

async function chooseFolder(page: Page, name: string, label = "Folder") {
  await page.getByLabel(label, { exact: true }).click();
  await page.getByRole("option", { name, exact: true }).click();
}
async function capture(page: Page, info: TestInfo, name: string) {
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: info.outputPath(`${name}.png`),
    fullPage: false,
  });
}
test("folder creation, bound rename and confirmed deletion preserve images in Unfiled", async ({
  page,
}, info) => {
  const fixture = await assetManagementFixture(page);
  await openImagePicker(page);
  await chooseFolder(page, "Synthetic briefings");
  expect(fixture.managementCalls("createFolder")).toHaveLength(0);
  await button(page, "Add Folder").click();
  await page
    .getByLabel("Folder name", { exact: true })
    .fill("New synthetic folder");
  await auditDialog(page, info, "create-folder-axe");
  await capture(page, info, "create-folder");
  await button(page, "Add Folder").click();
  await expect(
    page.getByText("Folder created.", { exact: true }),
  ).toBeVisible();
  expect(fixture.managementCalls("createFolder")[0]?.input).toEqual({
    body: { name: "New synthetic folder" },
  });
  await button(page, "Back to library").click();
  await expect(button(page, "Refresh library")).toBeFocused();
  await chooseFolder(page, "New synthetic folder");
  await button(page, "Rename Folder").click();
  await page
    .getByLabel("Folder name", { exact: true })
    .fill("Renamed synthetic folder");
  await capture(page, info, "rename-folder");
  await button(page, "Save").click();
  await expect(
    page.getByText("Folder renamed.", { exact: true }),
  ).toBeVisible();
  expect(fixture.managementCalls("renameFolder")[0]?.input).toEqual({
    params: { id: createdFolderId },
    body: { name: "Renamed synthetic folder" },
  });
  await button(page, "Back to library").click();
  await button(page, "Delete Folder").click();
  await expect(button(page, "Cancel")).toBeFocused();
  await expect(
    page.getByText(/images, including saved versions, will remain in Unfiled/),
  ).toBeVisible();
  await capture(page, info, "delete-folder");
  expect(fixture.managementCalls("deleteFolder")).toHaveLength(0);
  await button(page, "Delete Folder").click();
  await expect(
    page.getByText("Folder deleted. Its images are now Unfiled.", {
      exact: true,
    }),
  ).toBeVisible();
  await button(page, "Back to library").click();
  await expect(page.getByLabel("Folder", { exact: true })).toHaveText(
    "Unfiled",
  );
  await expect(button(page, "Select Synthetic policy image")).toBeVisible();
  expect(fixture.managementCalls("deleteFolder")[0]?.input).toEqual({
    params: { id: createdFolderId },
  });
  expect(fixture.managementCalls("delete")).toHaveLength(0);
  expect(fixture.document.calls("save")).toHaveLength(0);
});

test("one selected image moves, renames and deletes its saved versions without editing the newsletter", async ({
  page,
}, info) => {
  const fixture = await assetManagementFixture(page);
  await openImagePicker(page);
  await button(page, "Select Synthetic policy image").click();
  await button(page, "Move to folder").click();
  await chooseFolder(page, "Synthetic briefings", "Destination folder");
  await capture(page, info, "move-image");
  await button(page, "Move image").click();
  await expect(page.getByText(/Image move acknowledged/)).toBeVisible();
  expect(fixture.managementCalls("move")[0]?.input).toEqual({
    body: { ids: [assetId], folderId },
  });
  await button(page, "Back to library").click();
  await chooseFolder(page, "Synthetic briefings");
  await button(page, "Select Synthetic policy image").click();
  await button(page, "Move to folder").click();
  await button(page, "Move image").click();
  await expect(page.getByText(/Image move acknowledged/)).toBeVisible();
  expect(fixture.managementCalls("move")[1]?.input).toEqual({
    body: { ids: [assetId], folderId: null },
  });
  await button(page, "Back to library").click();
  await chooseFolder(page, "Unfiled");
  await chooseDetails(page);
  await button(page, "Rename image").click();
  await page
    .getByLabel("File name", { exact: true })
    .fill("Renamed synthetic image");
  await capture(page, info, "rename-image");
  await button(page, "Save").click();
  await expect(page.getByText("Image renamed.", { exact: true })).toBeVisible();
  await button(page, "Back to library").click();
  await chooseDetails(page, "Renamed synthetic image");
  await button(page, "Delete image").click();
  await expect(button(page, "Cancel")).toBeFocused();
  await expect(
    page.getByText("Existing image links are not revoked.", { exact: true }),
  ).toBeVisible();
  await capture(page, info, "delete-image");
  await button(page, "Delete").click();
  await expect(page.getByText(/Image removed from your library/)).toBeVisible();
  await button(page, "Back to library").click();
  await expect(button(page, "Refresh library")).toBeFocused();
  await expect(
    page.getByText("No images in your library.", { exact: true }),
  ).toBeVisible();
  expect(fixture.managementCalls("rename")[0]?.input).toEqual({
    params: { id: assetId },
    body: { name: "Renamed synthetic image" },
  });
  expect(fixture.managementCalls("delete")[0]?.input).toEqual({
    body: { ids: [assetId] },
  });
  await button(page, "Close").click();
  await expect(page.getByLabel("Image URL", { exact: true })).toHaveValue(
    originalUrl,
  );
  expect(fixture.document.calls("save")).toHaveLength(0);
});

test("history pages show real saved metadata and never expose historical Insert, Preview or Restore", async ({
  page,
}, info) => {
  const fixture = await assetManagementFixture(page);
  await openImagePicker(page);
  await chooseDetails(page);
  await button(page, "Revision History").click();
  await expect(page.getByText("Version 2", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Insert|Preview|Restore/ }),
  ).toHaveCount(0);
  await capture(page, info, "history-current");
  await button(page, "Next versions").click();
  await expect(page.getByText("Version 1", { exact: true })).toBeVisible();
  await expect(page.getByText("Current image", { exact: true })).toHaveCount(0);
  expect(fixture.managementCalls("revisions").at(-1)?.input).toEqual({
    params: { id: assetId },
    query: { page: 2, pageSize: 10 },
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await auditDialog(page, info, "history-narrow-axe");
  await capture(page, info, "history-narrow");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await button(page, "Back to details").click();
  await expect(button(page, "Revision History")).toBeFocused();
  await expect(button(page, "Insert")).toBeEnabled();
  expect(fixture.document.control.remote).toEqual([]);
});

test("explicit URL import captures its folder, survives close while pending and still needs bound details and Insert", async ({
  page,
}, info) => {
  const fixture = await assetManagementFixture(page),
    held = heldResponse();
  fixture.queueManagement("import", async (route) => {
    await held.wait;
    await route.fulfill({ json: asset(secondId, "Synthetic imported image") });
    held.finished();
  });
  await openImagePicker(page);
  await chooseFolder(page, "Synthetic briefings");
  await button(page, "Import URL").click();
  await page
    .getByRole("dialog")
    .getByLabel("Image URL", { exact: true })
    .fill("https://origin.example.test/synthetic.png");
  await capture(page, info, "import-url");
  expect(fixture.managementCalls("import")).toHaveLength(0);
  expect(fixture.document.control.remote).toEqual([]);
  await button(page, "Import").click();
  await expect(button(page, "Import")).toBeDisabled();
  await expect.poll(() => fixture.managementCalls("import").length).toBe(1);
  await button(page, "Close dialog").click();
  held.release();
  await held.settled;
  await button(page, "Replace from image library").click();
  await expect(page.getByText(/Image added to your library/)).toBeVisible();
  expect(fixture.managementCalls("import")[0]?.input).toEqual({
    body: { url: "https://origin.example.test/synthetic.png", folderId },
  });
  await expect(button(page, "Insert")).toBeDisabled();
  await button(page, "View imported image details").click();
  await expect(button(page, "Insert")).toBeEnabled();
  await button(page, "Insert").click();
  await expect(page.getByLabel("Image URL", { exact: true })).toHaveValue(
    asset(secondId).url,
  );
  await expect(page.getByLabel("Alternative text")).toHaveValue(
    "Preserved manual alt",
  );
  await button(page, "Undo").click();
  await expect(page.getByLabel("Image URL", { exact: true })).toHaveValue(
    originalUrl,
  );
  expect(fixture.document.calls("save")).toHaveLength(0);
  expect(fixture.document.control.remote).toEqual([]);
});

for (const scenario of [
  "wrong-folder",
  "wrong-count",
  "lost-import",
] as const) {
  test(`${scenario} acknowledgement remains unknown despite refreshed state and close/reopen`, async ({
    page,
  }, info) => {
    const fixture = await assetManagementFixture(page);
    await openImagePicker(page);
    if (scenario === "wrong-folder") {
      await chooseFolder(page, "Synthetic briefings");
      await button(page, "Rename Folder").click();
      await page
        .getByLabel("Folder name", { exact: true })
        .fill("Changed on server");
      fixture.queueManagement("renameFolder", async (route) => {
        fixture.state.folders[0]!.name = "Changed on server";
        await route.fulfill({
          json: { id: createdFolderId, name: "Changed on server" },
        });
      });
      await button(page, "Save").click();
    } else if (scenario === "wrong-count") {
      await chooseDetails(page);
      await button(page, "Delete image").click();
      fixture.queueManagement("delete", async (route) => {
        fixture.state.deleted = true;
        await route.fulfill({ json: { deleted: 2 } });
      });
      await button(page, "Delete").click();
    } else {
      await button(page, "Import URL").click();
      await page
        .getByRole("dialog")
        .getByLabel("Image URL", { exact: true })
        .fill("https://origin.example.test/synthetic.png");
      fixture.queueManagement("import", (route) =>
        route.fulfill({ status: 503, json: {} }),
      );
      await button(page, "Import").click();
    }
    const notice = page.getByText(/not confirmed. It may have completed/);
    await expect(notice).toBeVisible();
    await button(page, "Close dialog").click();
    await button(page, "Replace from image library").click();
    await expect(notice).toBeVisible();
    await button(page, "Refresh library").click();
    await expect(notice).toBeVisible();
    await expect(button(page, "Add Folder")).toBeDisabled();
    await expect(button(page, "Import URL")).toBeDisabled();
    await expect(button(page, "Upload")).toBeDisabled();
    if (scenario === "wrong-folder")
      await expect(page.getByLabel("Folder", { exact: true })).toHaveText(
        "Changed on server",
      );
    if (scenario === "wrong-count")
      await expect(
        page.getByText("No images in your library.", { exact: true }),
      ).toBeVisible();
    expect(
      fixture.managementCalls(
        scenario === "wrong-folder"
          ? "renameFolder"
          : scenario === "wrong-count"
            ? "delete"
            : "import",
      ),
    ).toHaveLength(1);
    if (scenario === "lost-import") {
      await page.setViewportSize({ width: 390, height: 844 });
      await notice.scrollIntoViewIfNeeded();
      const folderAction = await button(page, "Delete Folder").boundingBox();
      const searchLabel = await page
        .getByText("Search files", { exact: true })
        .boundingBox();
      expect(
        searchLabel!.y - folderAction!.y - folderAction!.height,
      ).toBeGreaterThanOrEqual(12);
      await capture(page, info, "unknown-import-narrow");
    }
    await button(page, "Close").click();
    await expect(page.getByLabel("Image URL", { exact: true })).toHaveValue(
      originalUrl,
    );
    expect(fixture.document.calls("save")).toHaveLength(0);
  });
}

test("denied folders, refused rename and unavailable import remain explicit without a success claim", async ({
  page,
}) => {
  const fixture = await assetManagementFixture(page);
  await openImagePicker(page);
  fixture.queueManagement("folders", (route) =>
    route.fulfill({ status: 403, json: {} }),
  );
  await button(page, "Refresh library").click();
  await expect(page.getByText(/Folders unavailable/)).toBeVisible();
  await expect(button(page, "Rename Folder")).toBeDisabled();
  await button(page, "Refresh library").click();
  await chooseFolder(page, "Synthetic briefings");
  await button(page, "Rename Folder").click();
  await page
    .getByLabel("Folder name", { exact: true })
    .fill("Refused synthetic change");
  fixture.queueManagement("renameFolder", (route) =>
    route.fulfill({ status: 403, json: {} }),
  );
  await button(page, "Save").click();
  await expect(page.getByText(/This change was not allowed/)).toBeVisible();
  await expect(page.getByText("Folder renamed.", { exact: true })).toHaveCount(
    0,
  );
  await button(page, "Cancel").click();
  await button(page, "Import URL").click();
  await page
    .getByRole("dialog")
    .getByLabel("Image URL", { exact: true })
    .fill("https://origin.example.test/synthetic.png");
  fixture.queueManagement("import", (route) =>
    route.fulfill({
      status: 503,
      json: { message: "Image URL import is unavailable." },
    }),
  );
  await button(page, "Import").click();
  await expect(page.getByText(/Import unavailable/)).toBeVisible();
  expect(fixture.managementCalls("import")).toHaveLength(1);
  expect(fixture.document.control.remote).toEqual([]);
});

for (const replacement of ["block", "document", "actor", "client"] as const) {
  test(`late management reply cannot restore private data after ${replacement} replacement`, async ({
    page,
  }) => {
    const fixture = await assetManagementFixture(page),
      held = heldResponse();
    fixture.queueManagement("import", async (route) => {
      await held.wait;
      await route.fulfill({ json: asset(secondId, "Discarded private image") });
      held.finished();
    });
    await openImagePicker(page);
    await button(page, "Import URL").click();
    await page
      .getByRole("dialog")
      .getByLabel("Image URL", { exact: true })
      .fill("https://origin.example.test/synthetic.png");
    await button(page, "Import").click();
    await expect.poll(() => fixture.managementCalls("import").length).toBe(1);
    await button(page, "Close dialog").click();
    if (replacement === "block")
      await page
        .getByRole("navigation", { name: "Newsletter structure" })
        .getByRole("button", { name: "Image", exact: true })
        .click();
    else if (replacement === "document") {
      fixture.document.control.current = {
        ...fixture.document.control.current,
        id: "d2222222-2222-4222-8222-222222222222",
        revision: 5,
      };
      await adoptDocument(page);
    } else if (replacement === "actor")
      await page.evaluate(() =>
        window.dispatchEvent(
          new CustomEvent("test:session", {
            detail: {
              userId: "other-synthetic-user",
              sessionId: "other-synthetic-session",
            },
          }),
        ),
      );
    else await navigate(page, `${editorUrl}&clientId=${otherClientId}`);
    held.release();
    await held.settled;
    await expect(
      page.getByText("Discarded private image", { exact: true }),
    ).toHaveCount(0);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(fixture.managementCalls("import")).toHaveLength(1);
    expect(fixture.document.calls("save")).toHaveLength(0);
    if (replacement === "block") {
      await button(page, "Replace from image library").click();
      await expect(button(page, "Insert")).toBeDisabled();
      await expect(
        page.getByText(/Image added to your library|not confirmed/),
      ).toHaveCount(0);
    }
  });
}

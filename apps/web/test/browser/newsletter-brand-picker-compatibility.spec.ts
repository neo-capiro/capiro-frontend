import { test, expect } from "@playwright/test";
import { authoringFixture } from "./newsletter-brand-survey-fixture";
import { assetDetails, chooseDetails } from "./newsletter-assets-fixture";
import {
  button,
  enterEditor,
  adoptDocument,
  heldResponse,
} from "./newsletter-document-fixtures";

test("logo selection hides absent management capabilities and keeps current details, refresh and uncertain upload", async ({
  page,
}) => {
  const f = await authoringFixture(page);
  let folderReads = 0;
  page.on("request", (request) => {
    if (request.url().includes("workspace.richNewsletter.assetFolders.list"))
      folderReads++;
  });
  await enterEditor(page);
  await adoptDocument(page);
  await button(page, "Brand Kit").click();
  await button(page, "Add logo").click();
  const dialog = page.getByRole("dialog", { name: "Choose a Brand Kit logo" });
  await expect(dialog.getByLabel("Folder", { exact: true })).toBeVisible();
  for (const name of [
    "Import URL",
    "Add Folder",
    "Move to folder",
    "Rename Folder",
    "Delete Folder",
  ])
    await expect(dialog.getByRole("button", { name, exact: true })).toHaveCount(
      0,
    );
  const beforeFolders = folderReads,
    beforeList = f.requests.filter((x) => x.operation === "list").length;
  await button(page, "Refresh library").click();
  await expect.poll(() => folderReads).toBeGreaterThan(beforeFolders);
  await expect
    .poll(() => f.requests.filter((x) => x.operation === "list").length)
    .toBeGreaterThan(beforeList);
  f.queue("detail", (route) =>
    route.fulfill({ json: { ...assetDetails(), currentRevision: false } }),
  );
  await chooseDetails(page);
  await expect(button(page, "Add logo to kit")).toBeDisabled();
  for (const name of ["Rename image", "Delete image", "Revision History"])
    await expect(dialog.getByRole("button", { name, exact: true })).toHaveCount(
      0,
    );
  await button(page, "Back to library").click();
  await chooseDetails(page);
  await expect(button(page, "Add logo to kit")).toBeEnabled();
  await button(page, "Add logo to kit").click();
  await expect(
    button(page, "Settings for logo Synthetic policy image"),
  ).toBeVisible();
  expect(f.calls("brand.save")).toHaveLength(0);
  await button(page, "Add logo").click();
  const held = heldResponse();
  f.queue("upload", async (route) => {
    await held.wait;
    await route.fulfill({ status: 503, json: {} });
    held.finished();
  });
  await dialog
    .getByLabel("Image file", { exact: true })
    .setInputFiles({
      name: "synthetic.png",
      mimeType: "image/png",
      buffer: Buffer.from("synthetic bytes"),
    });
  await button(page, "Upload").click();
  await expect
    .poll(() => f.requests.filter((x) => x.operation === "upload").length)
    .toBe(1);
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  held.release();
  await held.settled;
  await button(page, "Add logo").click();
  await expect(dialog.getByText(/Upload not confirmed/)).toBeVisible();
  await button(page, "Refresh library").click();
  await expect(dialog.getByText(/Upload not confirmed/)).toBeVisible();
  await expect(button(page, "Upload")).toBeDisabled();
  expect(f.requests.filter((x) => x.operation === "upload")).toHaveLength(1);
  expect(f.calls("brand.save")).toHaveLength(0);
  expect(f.document.calls("save")).toHaveLength(0);
});

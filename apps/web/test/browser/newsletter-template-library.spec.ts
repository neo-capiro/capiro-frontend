import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import {
  button,
  documentId,
  expectIsolated,
  heldResponse,
} from "./newsletter-document-fixtures";
import {
  browseSections,
  sectionReady,
} from "./newsletter-section-library-fixtures";
import {
  browseTemplates,
  catalog,
  templateFixture,
} from "./newsletter-template-library-fixtures";

const capture = process.env.CAPIRO_TEMPLATE_CAPTURE_DIR;
test("explicit server-template save, inert preview, loaded filtering and one local apply/undo preserve unsaved campaign identity", async ({
  page,
}) => {
  const f = await templateFixture(page);
  await sectionReady(page);
  await page.getByLabel("Newsletter name").fill("Unsaved name");
  await page.getByLabel("Subject", { exact: true }).fill("Unsaved subject");
  expect(f.templates.reads).toBe(0);
  await button(page, "Save current server newsletter as template").click();
  const dialog = page.getByRole("dialog", {
    name: "Save template",
    exact: true,
  });
  await expect(dialog.getByLabel("Name", { exact: true })).toBeFocused();
  await expect(
    dialog.getByText(/Unsaved editor changes are not included/),
  ).toBeVisible();
  await dialog
    .getByLabel("Name", { exact: true })
    .fill("Current server template");
  await dialog.getByLabel("Folder", { exact: true }).fill("Updates");
  if (capture) {
    mkdirSync(capture, { recursive: true });
    await dialog.screenshot({
      path: join(capture, "template-save-desktop.png"),
    });
  }
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(
    page.getByText(
      "Template added to your saved templates. The newsletter draft is unchanged.",
    ),
  ).toBeVisible();
  expect(f.templates.writes).toEqual([
    {
      operation: "templates.save",
      input: {
        params: { id: documentId },
        body: { name: "Current server template", folder: "Updates" },
      },
    },
  ]);
  await expect(page.getByLabel("Newsletter name")).toHaveValue("Unsaved name");
  await browseTemplates(page);
  const list = catalog(page);
  await list.getByLabel("Search saved templates").fill("not loaded");
  await expect(
    list.getByText("No loaded templates match these filters."),
  ).toBeVisible();
  await list.getByRole("button", { name: "Clear filters" }).click();
  await list.getByLabel("Folder", { exact: true }).click();
  await page.getByRole("option", { name: "Updates", exact: true }).click();
  await expect(list.getByRole("article")).toHaveCount(1);
  if (capture)
    await list.screenshot({
      path: join(capture, "template-catalog-desktop.png"),
    });
  await button(page, "Preview template Monthly update").click();
  const preview = page.getByRole("dialog", { name: "Preview: Monthly update" });
  await expect(preview.locator("iframe")).toHaveAttribute("sandbox", "");
  expect(f.templates.writes).toHaveLength(1);
  await page.keyboard.press("Escape");
  await expect(button(page, "Preview template Monthly update")).toBeFocused();
  await button(page, "Apply template Monthly update").press("Enter");
  await expect(button(page, "Saved templates")).toBeFocused();
  await expect(page.getByLabel("Newsletter name")).toHaveValue("Unsaved name");
  await expect(page.getByLabel("Subject", { exact: true })).toHaveValue(
    "Unsaved subject",
  );
  await expect(
    page.getByRole("heading", { name: "Reusable full template", exact: true }),
  ).toBeVisible();
  await button(page, "Undo").click();
  await expect(
    page.getByRole("heading", { name: "Stored introduction", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Subject", { exact: true })).toHaveValue(
    "Unsaved subject",
  );
  await button(page, "Redo").click();
  await expect(
    page.getByRole("heading", { name: "Reusable full template", exact: true }),
  ).toBeVisible();
  expect(f.calls("save")).toHaveLength(0);
  expectIsolated(f);
});

test("rename/folder and delete use selected library IDs; ACK invalidates projection without rewriting current draft", async ({
  page,
}) => {
  const f = await templateFixture(page);
  await sectionReady(page);
  await browseTemplates(page);
  await button(page, "Rename/move template Monthly update").click();
  const rename = page.getByRole("dialog", {
    name: "Rename/move template",
    exact: true,
  });
  await rename
    .getByLabel("Name", { exact: true })
    .fill("Renamed monthly template");
  await rename.getByLabel("Folder", { exact: true }).fill("New folder");
  if (capture)
    await rename.screenshot({
      path: join(capture, "template-rename-desktop.png"),
    });
  await rename.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText(/Rename\/move acknowledged/)).toBeVisible();
  await expect(catalog(page).getByRole("article")).toHaveCount(0);
  expect(f.templates.writes[0]).toEqual({
    operation: "library.update",
    input: {
      params: { id: f.template.id },
      body: { name: "Renamed monthly template", folder: "New folder" },
    },
  });
  await button(page, "Refresh templates").click();
  await expect(
    catalog(page).getByRole("heading", { name: "Monthly update", exact: true }),
  ).toBeVisible();
  await button(page, "Delete template Monthly update").click();
  const deletion = page.getByRole("dialog", {
    name: "Delete template",
    exact: true,
  });
  await deletion.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(button(page, "Delete template Monthly update")).toBeFocused();
  expect(f.templates.writes).toHaveLength(1);
  await button(page, "Delete template Monthly update").click();
  if (capture)
    await deletion.screenshot({
      path: join(capture, "template-delete-desktop.png"),
    });
  await deletion
    .getByRole("button", { name: "Delete template", exact: true })
    .click();
  await expect(page.getByText(/Delete acknowledged/)).toBeVisible();
  expect(f.templates.writes[1]).toEqual({
    operation: "library.remove",
    input: { params: { id: f.template.id } },
  });
  await button(page, "Back to editor").click();
  await browseSections(page);
  await button(page, "Rename/move section Saved introduction").click();
  const section = page.getByRole("dialog", {
    name: "Rename/move section",
    exact: true,
  });
  await section.getByLabel("Name", { exact: true }).fill("Renamed section");
  await section.getByLabel("Folder", { exact: true }).fill("");
  await section.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText(/Rename\/move acknowledged/)).toBeVisible();
  expect(f.templates.writes[2]).toEqual({
    operation: "library.update",
    input: {
      params: { id: f.first.id },
      body: { name: "Renamed section", folder: "" },
    },
  });
  await button(page, "Refresh sections").click();
  await button(page, "Delete section Saved introduction").click();
  await page
    .getByRole("dialog", { name: "Delete section", exact: true })
    .getByRole("button", { name: "Delete section", exact: true })
    .click();
  await expect(page.getByText(/Delete acknowledged/)).toBeVisible();
  expect(f.templates.writes[3]).toEqual({
    operation: "library.remove",
    input: { params: { id: f.first.id } },
  });
  await expect(
    page.getByRole("heading", { name: "Stored introduction", exact: true }),
  ).toBeVisible();
  expect(f.calls("save")).toHaveLength(0);
  expectIsolated(f);
});

test("uncertain template save cannot be replayed or cleared by matching reads or a different library action", async ({
  page,
}) => {
  const f = await templateFixture(page),
    held = heldResponse();
  f.templates.write = async (route) => {
    await held.wait;
    await route.fulfill({
      status: 503,
      json: { message: "Synthetic lost acknowledgement" },
    });
    held.finished();
  };
  await sectionReady(page);
  await button(page, "Save current server newsletter as template").click();
  const dialog = page.getByRole("dialog", {
    name: "Save template",
    exact: true,
  });
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Saving…" })).toBeDisabled();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  held.release();
  await held.settled;
  await expect(dialog.getByText(/Save was not confirmed/)).toBeVisible();
  await dialog.getByRole("button", { name: "View saved templates" }).click();
  await expect(catalog(page).getByRole("article")).toHaveCount(2);
  await button(page, "Delete template Monthly update").click();
  await expect(dialog.getByText(/Save was not confirmed/)).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Save", exact: true }),
  ).toHaveCount(0);
  expect(f.templates.writes).toHaveLength(1);
  expect(f.calls("save")).toHaveLength(0);
  expectIsolated(f);
});

test("uncertain delete remains unknown after an absent-row read; malformed/inaccessible reads drop old templates", async ({
  page,
}) => {
  const f = await templateFixture(page);
  await sectionReady(page);
  await browseTemplates(page);
  f.templates.write = (route) =>
    route.fulfill({ json: { ok: true, id: f.template.id } });
  await button(page, "Delete template Monthly update").click();
  const dialog = page.getByRole("dialog", {
    name: "Delete template",
    exact: true,
  });
  await dialog
    .getByRole("button", { name: "Delete template", exact: true })
    .click();
  await expect(dialog.getByText(/Delete was not confirmed/)).toBeVisible();
  f.templates.items = [];
  await dialog.getByRole("button", { name: "View saved templates" }).click();
  await expect(catalog(page).getByText(/No saved templates yet/)).toBeVisible();
  await expect(
    page.getByText(/This mounted view will not repeat that request/),
  ).toBeVisible();
  f.templates.items = [f.template];
  await button(page, "Refresh templates").click();
  await expect(catalog(page).getByRole("article")).toHaveCount(1);
  f.templates.list = (route) => route.fulfill({ json: { items: [f.first] } });
  await button(page, "Refresh templates").click();
  await expect(
    catalog(page).getByText(/Saved templates are unavailable/),
  ).toBeVisible();
  await expect(catalog(page).getByRole("article")).toHaveCount(0);
  f.templates.list = (route) =>
    route.fulfill({ status: 403, json: { message: "Current access revoked" } });
  await button(page, "Refresh templates").click();
  await expect(
    catalog(page).getByText(/Saved templates are unavailable/),
  ).toBeVisible();
  expect(f.templates.writes).toHaveLength(1);
  expectIsolated(f);
});

test("held template response cannot repopulate the replacement actor's editor", async ({
  page,
}) => {
  const f = await templateFixture(page),
    held = heldResponse();
  f.templates.list = async (route) => {
    await held.wait;
    await route.fulfill({ json: { items: [f.template] } });
    held.finished();
  };
  await sectionReady(page);
  await button(page, "Saved templates").click();
  await expect(
    catalog(page).getByText("Loading saved templates…"),
  ).toBeVisible();
  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent("test:session", {
        detail: { userId: "other-user", sessionId: "other-session" },
      }),
    ),
  );
  await expect(catalog(page)).toHaveCount(0);
  held.release();
  await held.settled;
  await expect(catalog(page)).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Monthly update", exact: true }),
  ).toHaveCount(0);
  expect(f.templates.writes).toHaveLength(0);
  expectIsolated(f);
});

test("narrow library cards and dialogs wrap; keyboard cancellation restores opener without writes", async ({
  page,
}) => {
  const f = await templateFixture(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await sectionReady(page);
  await browseTemplates(page);
  const list = catalog(page);
  await list.scrollIntoViewIfNeeded();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  if (capture) {
    mkdirSync(capture, { recursive: true });
    await page.screenshot({
      path: join(capture, "template-catalog-narrow.png"),
    });
  }
  await button(page, "Rename/move template Monthly update").focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", {
    name: "Rename/move template",
    exact: true,
  });
  await expect(dialog.getByLabel("Name", { exact: true })).toBeFocused();
  const box = (await dialog.boundingBox())!;
  expect(box.width).toBeLessThanOrEqual(358);
  expect(box.x).toBeGreaterThanOrEqual(16);
  await dialog
    .getByLabel("Folder", { exact: true })
    .fill("A long synthetic folder remains visible and editable");
  if (capture)
    await page.screenshot({
      path: join(capture, "template-rename-narrow.png"),
    });
  await page.keyboard.press("Escape");
  await expect(
    button(page, "Rename/move template Monthly update"),
  ).toBeFocused();
  await button(page, "Back to editor").click();
  await expect(button(page, "Saved templates")).toBeFocused();
  expect(f.templates.writes).toHaveLength(0);
  expectIsolated(f);
});

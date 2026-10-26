import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import {
  button,
  clientId,
  documentId,
  editorUrl,
  expectIsolated,
  heldResponse,
  navigate,
  otherClientId,
  reviewDocument,
} from "./newsletter-document-fixtures";
import {
  browseSections,
  saveSection,
  sectionFixture,
  sectionReady,
  sectionsPanel,
} from "./newsletter-section-library-fixtures";

const capture = process.env.CAPIRO_SECTION_CAPTURE_DIR;
test("stored section save is explicit; loaded filtering then one insertion preserves local changes and one undo", async ({
  page,
}) => {
  const f = await sectionFixture(page);
  await sectionReady(page);
  expect(f.library.reads).toBe(0);
  expect(f.library.writes).toEqual([]);
  await button(page, "Paragraph · Stored paragraph").click();
  await page
    .getByRole("textbox", { name: "Block rich text" })
    .fill("Unsaved local paragraph");
  await saveSection(page).click();
  const dialog = page.getByRole("dialog", {
    name: "Save section",
    exact: true,
  });
  await expect(dialog.getByLabel("Name", { exact: true })).toBeFocused();
  await expect(
    dialog.getByText(/Unsaved editor changes are not included/),
  ).toBeVisible();
  await dialog
    .getByLabel("Name", { exact: true })
    .fill("Saved current server section");
  await dialog.getByLabel("Folder", { exact: true }).fill("Updates");
  if (capture) {
    mkdirSync(capture, { recursive: true });
    await dialog.screenshot({ path: join(capture, "save-dialog-desktop.png") });
  }
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(
    page.getByText(
      "Section added to your saved sections. The newsletter draft is unchanged.",
    ),
  ).toBeVisible();
  expect(f.library.writes).toEqual([
    {
      params: { id: documentId },
      body: {
        name: "Saved current server section",
        folder: "Updates",
        sectionId: f.control.current.design.sections[0]!.id,
      },
    },
  ]);
  expect(f.calls("save")).toHaveLength(0);
  expect(f.library.reads).toBe(0);
  await browseSections(page);
  const panel = sectionsPanel(page);
  await panel.getByLabel("Search saved sections").fill("not loaded");
  await expect(
    panel.getByText("No loaded sections match these filters."),
  ).toBeVisible();
  await expect(
    page
      .getByRole("navigation", { name: "Newsletter structure" })
      .getByRole("heading", { level: 3 }),
  ).toHaveCount(1);
  await panel.getByRole("button", { name: "Clear filters" }).click();
  await panel.getByLabel("Folder", { exact: true }).click();
  await page.getByRole("option", { name: "Updates", exact: true }).click();
  await expect(panel.getByRole("article")).toHaveCount(1);
  if (capture)
    await panel.screenshot({ path: join(capture, "sections-desktop.png") });
  await panel
    .getByRole("button", {
      name: "Insert section Saved introduction",
      exact: true,
    })
    .press("Enter");
  await expect(
    page.getByText(
      "Section inserted at the end of this draft. Save the newsletter to keep it.",
    ),
  ).toBeVisible();
  await expect(button(page, "Saved sections")).toBeFocused();
  const structure = page.getByRole("navigation", {
    name: "Newsletter structure",
  });
  await expect(structure.getByRole("heading", { level: 3 })).toHaveCount(2);
  await expect(
    button(page, "Paragraph · Unsaved local paragraph"),
  ).toBeVisible();
  await button(page, "Undo").click();
  await expect(structure.getByRole("heading", { level: 3 })).toHaveCount(1);
  await expect(
    button(page, "Paragraph · Unsaved local paragraph"),
  ).toBeVisible();
  await button(page, "Redo").click();
  await expect(structure.getByRole("heading", { level: 3 })).toHaveCount(2);
  expect(f.calls("save")).toHaveLength(0);
  expect(f.library.reads).toBe(1);
  expectIsolated(f);
});

test("held and lost library save cannot be repeated or causally confirmed by a matching list row", async ({
  page,
}) => {
  const f = await sectionFixture(page),
    held = heldResponse();
  f.library.save = async (route) => {
    await held.wait;
    await route.fulfill({
      status: 503,
      json: { message: "Synthetic lost acknowledgement" },
    });
    held.finished();
  };
  await sectionReady(page);
  await saveSection(page).click();
  const dialog = page.getByRole("dialog", {
    name: "Save section",
    exact: true,
  });
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(
    dialog.getByRole("button", { name: "Saving…", exact: true }),
  ).toBeDisabled();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  expect(f.library.writes).toHaveLength(1);
  held.release();
  await held.settled;
  await expect(dialog.getByText(/Save was not confirmed/)).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Save", exact: true }),
  ).toHaveCount(0);
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await saveSection(page).click();
  await expect(dialog.getByText(/Save was not confirmed/)).toBeVisible();
  await dialog
    .getByRole("button", { name: "View saved sections", exact: true })
    .click();
  await expect(sectionsPanel(page).getByRole("article")).toHaveCount(2);
  await expect(
    page.getByText(/This mounted view will not repeat that save/),
  ).toBeVisible();
  expect(f.library.writes).toHaveLength(1);
  expect(f.library.reads).toBe(1);
  expect(f.calls("save")).toHaveLength(0);
  expectIsolated(f);
});

test("empty, filtered empty and unavailable reads differ; failed refresh removes old rows", async ({
  page,
}) => {
  const f = await sectionFixture(page);
  f.library.items = [];
  await sectionReady(page);
  await button(page, "Saved sections").click();
  const panel = sectionsPanel(page);
  await expect(
    panel.getByText(
      "No saved sections yet. Save one from Sections to reuse it.",
    ),
  ).toBeVisible();
  f.library.items = [f.first];
  await panel.getByRole("button", { name: "Refresh sections" }).click();
  await expect(panel.getByRole("article")).toHaveCount(1);
  f.library.list = (route) =>
    route.fulfill({ status: 403, json: { message: "Current access revoked" } });
  await panel.getByRole("button", { name: "Refresh sections" }).click();
  await expect(panel.getByText(/Saved sections are unavailable/)).toBeVisible();
  await expect(panel.getByRole("article")).toHaveCount(0);
  await expect(panel.getByText(/No saved sections yet/)).toHaveCount(0);
  expect(f.library.writes).toEqual([]);
  expectIsolated(f);
});

for (const replacement of ["client", "actor", "document"] as const) {
  test(`held library work cannot restore private rows or notices after ${replacement} replacement`, async ({
    page,
  }) => {
    const f = await sectionFixture(page),
      held = heldResponse();
    await sectionReady(page, `${editorUrl}&clientId=${clientId}`);
    if (replacement === "actor") {
      f.library.save = async (route) => {
        await held.wait;
        await route.fulfill({ json: f.first });
        held.finished();
      };
      await saveSection(page).click();
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "Save", exact: true })
        .click();
      await expect.poll(() => f.library.writes.length).toBe(1);
      await page.evaluate(() =>
        window.dispatchEvent(
          new CustomEvent("test:session", {
            detail: { userId: "other-user", sessionId: "other-session" },
          }),
        ),
      );
    } else {
      f.library.list = async (route) => {
        await held.wait;
        await route.fulfill({ json: { items: [f.first] } });
        held.finished();
      };
      await button(page, "Saved sections").click();
      await expect(
        sectionsPanel(page).getByText("Loading saved sections…"),
      ).toBeVisible();
      if (replacement === "client")
        await navigate(page, `${editorUrl}&clientId=${otherClientId}`);
      else {
        f.control.current = {
          ...f.control.current,
          id: "d4444444-4444-7444-8444-444444444444",
          name: "Other saved newsletter",
        };
        await reviewDocument(page, "Other saved newsletter");
        await button(
          page,
          "Adopt saved document and replace local draft",
        ).click();
      }
    }
    await expect(sectionsPanel(page)).toHaveCount(0);
    await expect(
      page.getByRole("dialog", { name: "Save section", exact: true }),
    ).toHaveCount(0);
    held.release();
    await held.settled;
    await expect(sectionsPanel(page)).toHaveCount(0);
    await expect(
      page.getByText(/Section added to your saved sections/),
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Saved introduction", exact: true }),
    ).toHaveCount(0);
    expectIsolated(f);
  });
}

test("the existing pending document recovery blocks section insertion and saving", async ({
  page,
}) => {
  const f = await sectionFixture(page);
  await sectionReady(page);
  await browseSections(page);
  await page.getByLabel("Newsletter name").fill("Changed local draft");
  f.queue("save", (route) =>
    route.fulfill({
      status: 503,
      json: { message: "Synthetic uncertain document write" },
    }),
  );
  await button(page, "Save newsletter").click();
  await expect(
    page.getByRole("heading", { name: "Request not confirmed" }),
  ).toBeVisible();
  await expect(
    sectionsPanel(page).getByRole("button", {
      name: "Insert section Saved introduction",
      exact: true,
    }),
  ).toBeDisabled();
  await expect(saveSection(page)).toBeDisabled();
  expect(f.library.writes).toEqual([]);
  await expect(
    page
      .getByRole("navigation", { name: "Newsletter structure" })
      .getByRole("heading", { level: 3 }),
  ).toHaveCount(1);
  expectIsolated(f);
});

test("narrow inspector and dialog remain contained; keyboard cancel restores exact opener without writing", async ({
  page,
}) => {
  const f = await sectionFixture(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await sectionReady(page);
  await saveSection(page).focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", {
    name: "Save section",
    exact: true,
  });
  await expect(dialog.getByLabel("Name", { exact: true })).toBeFocused();
  await dialog
    .getByLabel("Name", { exact: true })
    .fill("An unusually long saved section name that remains editable");
  await dialog
    .getByLabel("Folder", { exact: true })
    .fill("Synthetic long folder for this locally captured example");
  const box = (await dialog.boundingBox())!;
  expect(box.width).toBeLessThanOrEqual(358);
  expect(box.x).toBeGreaterThanOrEqual(16);
  if (capture) {
    mkdirSync(capture, { recursive: true });
    await page.screenshot({ path: join(capture, "save-dialog-narrow.png") });
  }
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(saveSection(page)).toBeFocused();
  await browseSections(page);
  const panel = sectionsPanel(page);
  await panel.scrollIntoViewIfNeeded();
  const bounds = (await panel.boundingBox())!;
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  if (capture)
    await page.screenshot({ path: join(capture, "sections-narrow.png") });
  await panel.getByRole("button", { name: "Back to sections" }).press("Enter");
  await expect(button(page, "Saved sections")).toBeFocused();
  expect(f.library.writes).toEqual([]);
  expect(f.calls("save")).toHaveLength(0);
  expectIsolated(f);
});

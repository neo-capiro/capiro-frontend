import { test, expect, type Locator, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import {
  authoringFixture,
  font,
  surveyId,
} from "./newsletter-brand-survey-fixture";
import { assetDetails, chooseDetails } from "./newsletter-assets-fixture";
import {
  button,
  enterEditor,
  adoptDocument,
  heldResponse,
  expectIsolated,
  documentId,
} from "./newsletter-document-fixtures";
const capture = process.env.CAPIRO_AUTHORING_CAPTURE_DIR;
async function shot(target: Locator, name: string) {
  if (capture) {
    mkdirSync(capture, { recursive: true });
    const page = target.page(),
      viewport = page.viewportSize();
    const fullBrand = name.startsWith("brand-") && !name.includes("settings");
    if (fullBrand && viewport) {
      const bounds = await target.boundingBox();
      if (bounds)
        await page.setViewportSize({
          width: viewport.width,
          height: Math.ceil(bounds.height) + 160,
        });
    }
    if (name.startsWith("brand-") && !name.includes("settings")) {
      await target.evaluate((element) => {
        for (
          let ancestor = element.parentElement;
          ancestor;
          ancestor = ancestor.parentElement
        )
          ancestor.scrollTop = 0;
      });
    }
    await target.screenshot({ path: join(capture, name + ".png") });
    if (fullBrand && viewport) await page.setViewportSize(viewport);
  }
}
async function ready(page: Page) {
  await enterEditor(page);
  await adoptDocument(page);
}
async function choose(page: Page, label: string, name: string) {
  await page.getByLabel(label, { exact: true }).click();
  await page.getByRole("option", { name, exact: true }).click();
}
const brand = (page: Page) => page.getByRole("region", { name: "Brand Kit" });

test("explicit brand entry reuses current logo picker; settings save once and local Apply has Undo without newsletter writes", async ({
  page,
}) => {
  const f = await authoringFixture(page);
  await ready(page);
  expect(f.state.requests).toHaveLength(0);
  await button(page, "Brand Kit").click();
  await expect(
    brand(page).getByRole("heading", { name: "Logos", exact: true }),
  ).toBeVisible();
  await button(page, "Add logo").click();
  f.queue("detail", (route) =>
    route.fulfill({ json: { ...assetDetails(), currentRevision: false } }),
  );
  await chooseDetails(page);
  await expect(button(page, "Add logo to kit")).toBeDisabled();
  await button(page, "Back to library").click();
  await chooseDetails(page);
  await expect(button(page, "Add logo to kit")).toBeEnabled();
  await button(page, "Add logo to kit").click();
  await button(page, "Settings for logo Synthetic policy image").click();
  const logo = page.getByRole("dialog", { name: "Logo settings" });
  await logo.getByLabel("Logo name").fill("Primary synthetic logo");
  await logo.getByRole("switch", { name: "Primary Brand Kit logo" }).check();
  await logo
    .getByLabel("Alt text", { exact: true })
    .fill("Synthetic brand mark");
  await shot(logo, "brand-logo-settings-desktop");
  await logo.getByRole("button", { name: "Done", exact: true }).click();
  await shot(brand(page), "brand-logos-desktop");
  await page.getByRole("tab", { name: "Colors", exact: true }).click();
  await page.getByLabel("primary color 1").fill("#123456");
  await shot(brand(page), "brand-colors-desktop");
  await page.getByRole("tab", { name: "Fonts", exact: true }).click();
  await choose(page, "Heading font", "Georgia");
  await shot(brand(page), "brand-fonts-desktop");
  await page.getByRole("tab", { name: "Buttons", exact: true }).click();
  await brand(page)
    .getByRole("button", { name: /^Settings for button/ })
    .first()
    .click();
  const settings = page.getByRole("dialog", { name: "Button settings" });
  await settings.getByLabel("Button name").fill("Read more");
  await shot(settings, "brand-button-settings-desktop");
  await settings.getByRole("button", { name: "Done", exact: true }).click();
  expect(f.calls("brand.save")).toHaveLength(0);
  await button(page, "Save Brand Kit").click();
  await expect(
    brand(page).getByText(/Brand Kit saved at revision 2/),
  ).toBeVisible();
  expect(f.calls("brand.save")).toHaveLength(1);
  expect(f.calls("brand.save")[0]!.input).toMatchObject({
    body: { revision: 1 },
  });
  await button(page, "Apply saved kit to local draft").click();
  await button(page, "Cancel and return to editor").click();
  await expect(button(page, "Undo")).toBeEnabled();
  await button(page, "Undo").click();
  await expect(button(page, "Redo")).toBeEnabled();
  expect(f.document.calls("save")).toHaveLength(0);
  expect(f.document.calls("stage")).toHaveLength(0);
  expectIsolated(f.document);
});

test("brand revision mismatch remains unknown through matching reload and close; failed read removes private controls", async ({
  page,
}) => {
  const f = await authoringFixture(page);
  await ready(page);
  await button(page, "Brand Kit").click();
  await expect(button(page, "Save Brand Kit")).toBeEnabled();
  f.queueAuthoring("brand.save", (route) =>
    route.fulfill({ json: { ...f.state.kit, revision: 3 } }),
  );
  await button(page, "Save Brand Kit").click();
  await expect(
    brand(page).getByText(/Brand Kit save was not confirmed/),
  ).toBeVisible();
  await button(page, "Read current saved kit").click();
  await expect(button(page, "Save Brand Kit")).toBeDisabled();
  await button(page, "Cancel and return to editor").click();
  await button(page, "Brand Kit").click();
  await expect(
    brand(page).getByText(/Brand Kit save was not confirmed/),
  ).toBeVisible();
  f.queueAuthoring("brand.read", (route) =>
    route.fulfill({ status: 403, json: { message: "Synthetic revoked" } }),
  );
  await button(page, "Read current saved kit").click();
  await expect(brand(page).getByText(/Brand Kit is unavailable/)).toBeVisible();
  await expect(brand(page).getByRole("tab", { name: "Logos" })).toHaveCount(0);
  expect(f.calls("brand.save")).toHaveLength(1);
  expectIsolated(f.document);
});

test("font asset upload is explicit and only attaches after kit save; lost upload never retries when the page reopens", async ({
  page,
}) => {
  const f = await authoringFixture(page);
  const blockedFonts: {
    url: string;
    type: string;
    failure: string | undefined;
  }[] = [];
  let routedFonts = 0;
  page.on("requestfailed", (request) => {
    if (request.url() === font.url)
      blockedFonts.push({
        url: request.url(),
        type: request.resourceType(),
        failure: request.failure()?.errorText,
      });
  });
  await page.route(font.url, (route) => {
    routedFonts++;
    return route.abort("blockedbyclient");
  });
  await ready(page);
  await button(page, "Brand Kit").click();
  await page.getByRole("tab", { name: "Fonts", exact: true }).click();
  await page.getByLabel("Upload a font", { exact: true }).setInputFiles({
    name: "synthetic.woff2",
    mimeType: "application/octet-stream",
    buffer: Buffer.from("synthetic-font-fixture"),
  });
  await button(page, "Upload font asset").click();
  await expect(brand(page).getByText(/Font asset uploaded/)).toBeVisible();
  expect(f.calls("brand.font")).toHaveLength(1);
  expect(f.calls("brand.save")).toHaveLength(0);
  await choose(page, "Heading font", "Synthetic font");
  await button(page, "Save Brand Kit").click();
  await expect(
    brand(page).getByText(/Brand Kit saved at revision 2/),
  ).toBeVisible();
  expect(f.calls("brand.save")[0]!.input).toMatchObject({
    body: { fonts: { uploaded: [font] } },
  });
  f.queueAuthoring("brand.font", (route) =>
    route.fulfill({ json: { ok: true } }),
  );
  await button(page, "Upload font asset").click();
  await expect(
    brand(page).getByText(/Font upload was not confirmed/),
  ).toBeVisible();
  await button(page, "Cancel and return to editor").click();
  await button(page, "Brand Kit").click();
  await expect(
    brand(page).getByText(/Font upload was not confirmed/),
  ).toBeVisible();
  expect(f.calls("brand.font")).toHaveLength(2);
  // Chromium emits request events for CSP-denied fonts; none may reach routing/network.
  expect(blockedFonts.length).toBeGreaterThan(0);
  expect(blockedFonts.map((request) => request.url)).toEqual(f.document.remote);
  expect(
    blockedFonts.every(
      (request) => request.type === "font" && request.failure === "csp",
    ),
  ).toBe(true);
  expect(routedFonts).toBe(0);
  expectIsolated({
    ...f.document,
    remote: f.document.remote.filter((url) => url !== font.url),
  });
});

test("survey create/edit keep exact draft revisions and newline choices; tabs retain messages and never stage or publish", async ({
  page,
}) => {
  const f = await authoringFixture(page);
  await ready(page);
  expect(f.calls("surveys.list")).toHaveLength(0);
  await button(page, "Survey drafts").click();
  await button(page, "Create survey draft").click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Saved draft name").fill("New priorities");
  await shot(dialog, "survey-create-desktop");
  await button(page, "Add section").click();
  await button(page, "Add choice").click();
  await dialog
    .getByLabel("Choice 1", { exact: true })
    .fill("An entire\nchoice");
  await dialog.getByRole("tab", { name: "Messages & appearance" }).click();
  await dialog.getByLabel("Closed survey message").fill("Draft closed text");
  await shot(dialog, "survey-messages-desktop");
  await dialog.getByRole("tab", { name: "Questions", exact: true }).click();
  await expect(dialog.getByLabel("Choice 1", { exact: true })).toHaveValue(
    "An entire\nchoice",
  );
  await button(page, "Save survey draft").click();
  await expect(
    dialog.getByText(/Server returned saved draft revision 1/),
  ).toBeVisible();
  const created = f.calls("surveys.save")[0]!.input;
  expect(created.params).toEqual({ id: documentId });
  expect(created.body).not.toHaveProperty("id");
  expect(created.body).not.toHaveProperty("revision");
  expect(created.body).toMatchObject({
    definition: {
      closedMessage: "Draft closed text",
      questions: [{ options: ["An entire\nchoice"] }],
    },
  });
  await button(page, "Cancel").click();
  await button(page, "Survey drafts").click();
  await button(page, "Edit Member priorities").click();
  await expect(dialog.getByLabel("Choice 1", { exact: true })).toHaveValue(
    "One\nchoice",
  );
  await dialog.getByLabel("Saved draft name").fill("Edited priorities");
  await shot(dialog, "survey-edit-desktop");
  await button(page, "Save survey draft").click();
  await expect(
    dialog.getByText(/Server returned saved draft revision 5/),
  ).toBeVisible();
  expect(f.calls("surveys.save")[1]!.input.body).toMatchObject({
    id: surveyId,
    revision: 4,
  });
  expect(f.document.calls("save")).toHaveLength(0);
  expect(f.document.calls("stage")).toHaveLength(0);
  expectIsolated(f.document);
});

test("newer survey readback is unconfirmed rather than no-write; list review and close cannot retire the write fence", async ({
  page,
}) => {
  const f = await authoringFixture(page);
  await ready(page);
  await button(page, "Survey drafts").click();
  await button(page, "Edit Member priorities").click();
  f.queueAuthoring("surveys.save", (route) =>
    route.fulfill({ json: { ...f.saved, revision: 6 } }),
  );
  await button(page, "Save survey draft").click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText(/Save was not confirmed/)).toBeVisible();
  await expect(
    dialog.getByText(/made no change|nothing was saved/i),
  ).toHaveCount(0);
  await shot(dialog, "survey-unconfirmed-desktop");
  await button(page, "Read current saved drafts").click();
  await expect(button(page, "Create survey draft")).toBeDisabled();
  await expect(button(page, "Edit Member priorities")).toBeDisabled();
  await button(page, "Close").click();
  await button(page, "Survey drafts").click();
  await expect(dialog.getByText(/Save was not confirmed/)).toBeVisible();
  expect(f.calls("surveys.save")).toHaveLength(1);
  expectIsolated(f.document);
});

test("a held authoring read cannot return private data into a replacement actor", async ({
  page,
}) => {
  const f = await authoringFixture(page),
    held = heldResponse();
  await ready(page);
  f.queueAuthoring("brand.read", async (route) => {
    await held.wait;
    await route.fulfill({ json: f.state.kit });
    held.finished();
  });
  await button(page, "Brand Kit").click();
  await expect(brand(page).getByText("Loading Brand Kit…")).toBeVisible();
  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent("test:session", {
        detail: { userId: "other-user", sessionId: "other-session" },
      }),
    ),
  );
  await expect(brand(page)).toHaveCount(0);
  held.release();
  await held.settled;
  await expect(brand(page)).toHaveCount(0);
  expect(f.calls("brand.save")).toHaveLength(0);
  expectIsolated(f.document);
});

test("narrow survey controls contain long choices and messages; keyboard cancellation restores the exact opener", async ({
  page,
}) => {
  const f = await authoringFixture(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page);
  await button(page, "Survey drafts").focus();
  await page.keyboard.press("Enter");
  await button(page, "Edit Member priorities").click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Saved draft name")).toBeVisible();
  const box = (await dialog.boundingBox())!;
  expect(box.width).toBeLessThanOrEqual(358);
  expect(box.x).toBeGreaterThanOrEqual(16);
  await shot(dialog, "survey-edit-narrow");
  await dialog.getByRole("tab", { name: "Questions", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(dialog.getByLabel("Closed survey message")).toBeVisible();
  await shot(dialog, "survey-messages-narrow");
  await page.keyboard.press("Escape");
  await expect(button(page, "Survey drafts")).toBeFocused();
  await button(page, "Brand Kit").click();
  await page.getByRole("tab", { name: "Fonts", exact: true }).click();
  await expect(page.getByLabel("Upload a font", { exact: true })).toBeVisible();
  expect(
    await brand(page).evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
  await shot(brand(page), "brand-fonts-narrow");
  expect(f.calls("surveys.save")).toHaveLength(0);
  expectIsolated(f.document);
});

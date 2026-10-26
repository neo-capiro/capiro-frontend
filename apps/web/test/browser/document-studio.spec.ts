import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { studioFixture } from "./document-studio-fixture";
import { openBlueprint, chooseVersion } from "./document-blueprint-fixture";
import {
  studioDefinition,
  studioTheme,
  studioAsset,
  studioUpload,
} from "../../tests/document-studio-fixtures";

async function capture(page: Page, name: string) {
  const directory = process.env.CAPIRO_BLUEPRINT_CAPTURE_DIR;
  if (!directory) return;
  mkdirSync(directory, { recursive: true });
  await page.screenshot({ path: join(directory, name), fullPage: true });
}
async function draftEditor(page: Page) {
  await openBlueprint(page);
  await chooseVersion(page, 3);
  await page
    .getByRole("button", { name: "Edit definition", exact: true })
    .click();
  return page.getByRole("dialog", { name: "Edit blueprint · v3" });
}
async function openTheme(page: Page, version = 1) {
  await page.getByRole("tab", { name: "Themes", exact: true }).click();
  await page.getByRole("button", { name: /Synthetic house theme/ }).click();
  await page.getByRole("combobox", { name: "Saved theme version" }).click();
  await page
    .getByRole("option", {
      name: `v${version} · ${version === 1 ? "draft" : "published"}`,
      exact: true,
    })
    .click();
}

test("edits complete definition, tests saved content and publishes then retires exact version", async ({
  page,
}) => {
  const f = await studioFixture(page);
  const editor = await draftEditor(page);
  await editor.getByText("Edit section 1", { exact: true }).click();
  await editor
    .getByLabel("Authoring instructions", { exact: true })
    .fill("Use reviewed primary evidence.");
  await capture(page, "definition-editor-desktop.png");
  await editor
    .getByRole("button", { name: "Save definition", exact: true })
    .click();
  await expect(editor).toBeHidden();
  await expect(
    page.getByText("Use reviewed primary evidence.", { exact: true }),
  ).toBeVisible();
  const saved = f.studio.versions[2]!.definition;
  expect(saved).toEqual({
    ...studioDefinition,
    sections: [
      {
        ...studioDefinition.sections[0],
        instructions: "Use reviewed primary evidence.",
      },
    ],
  });
  await page.getByText("Test saved draft", { exact: true }).click();
  await page
    .getByLabel("Sample answers by question identifier (JSON)")
    .fill('{"audience":"Committee"}');
  await page
    .getByRole("button", { name: "Run sample test", exact: true })
    .click();
  await expect(
    page.getByText("Sample test passed for this saved draft."),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Publish version 3", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm publish", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Retire version 3", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Edit definition", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Retire version 3", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm retire", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Use version 3", exact: true }),
  ).toHaveCount(0);
  expect(f.studio.versions[2]!.status).toBe("retired");
  expect(f.studio.writes.map((row) => row.key)).toEqual([
    "workspace.blueprints.save",
    "workspace.blueprints.test",
    "workspace.blueprints.publish",
    "workspace.blueprints.retire",
  ]);
});

test("new parent and empty draft are explicit, while cloning copies selected historical content", async ({
  page,
}) => {
  const f = await studioFixture(page);
  await openBlueprint(page);
  await chooseVersion(page, 1);
  await page
    .getByRole("button", { name: "Clone selected version", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Version 4", exact: true }),
  ).toBeVisible();
  expect(f.studio.writes[0]!.input.body).toEqual({
    fromVersionId: f.studio.versions[0]!.id,
    expectedDefinitionHash: f.studio.versions[0]!.definitionHash,
  });
  expect(f.studio.versions[3]!.definition).toEqual(studioDefinition);
  await page
    .getByRole("button", { name: "New blueprint", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "New document blueprint" });
  await dialog.getByLabel("Blueprint name").fill("Synthetic new blueprint");
  await dialog.getByLabel("Blueprint slug").fill("synthetic-new");
  await dialog.getByLabel("Product", { exact: true }).fill("Brief");
  await dialog
    .getByRole("button", { name: "Create blueprint", exact: true })
    .click();
  await expect(dialog).toBeHidden();
  await page
    .getByRole("button", { name: "New draft version", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Version 1", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Edit definition", exact: true })
    .click();
  await expect(page.getByLabel("Document type label")).toHaveValue(
    "Synthetic new blueprint",
  );
  expect(f.studio.versions[0]!.definition).toEqual({});
});

test("refuses changed saved version before PATCH and does not invent a sample-test receipt", async ({
  page,
}) => {
  const f = await studioFixture(page);
  const editor = await draftEditor(page);
  f.studio.savedRace = true;
  await editor
    .getByRole("button", { name: "Save definition", exact: true })
    .click();
  await expect(
    editor.getByText("This version changed. Refresh it before continuing."),
  ).toBeVisible();
  expect(f.studio.writes).toHaveLength(0);
  await editor.getByRole("button", { name: "Close dialog" }).click();
  f.studio.versions[2]!.status = "draft";
  f.studio.sampleWrong = true;
  await page.getByText("Test saved draft", { exact: true }).click();
  await page
    .getByRole("button", { name: "Run sample test", exact: true })
    .click();
  await expect(
    page.getByText(
      "The test did not match this saved version. Refresh and test again.",
    ),
  ).toBeVisible();
  await expect(
    page.getByText("Sample test passed for this saved draft."),
  ).toHaveCount(0);
});

test("a concurrent change after preflight rejects the exact saved hash without overwriting the newer draft", async ({
  page,
}) => {
  const f = await studioFixture(page);
  const editor = await draftEditor(page);
  const expectedHash = f.studio.versions[2]!.definitionHash;
  await editor.getByLabel("Document type label").fill("Local unsaved label");
  f.studio.concurrentWrite = true;
  await editor
    .getByRole("button", { name: "Save definition", exact: true })
    .click();
  await expect(
    editor.getByText(
      "This blueprint changed before the write. Refresh and review it.",
    ),
  ).toBeVisible();
  expect(f.studio.writes).toHaveLength(1);
  expect(f.studio.writes[0]!.input.body).toMatchObject({
    expectedDefinitionHash: expectedHash,
  });
  expect(f.studio.versions[2]!.definitionHash).not.toBe(expectedHash);
  expect(f.studio.versions[2]!.definition).toEqual(studioDefinition);
  await expect(editor.getByLabel("Document type label")).toHaveValue(
    "Local unsaved label",
  );
  await editor
    .getByRole("button", { name: "Save definition", exact: true })
    .click();
  await expect(
    editor.getByText("This version changed. Refresh it before continuing."),
  ).toBeVisible();
  expect(f.studio.writes).toHaveLength(1);
});

test("lost save acknowledgement stays fenced through dialog close, catalog refresh and studio tabs", async ({
  page,
}) => {
  const f = await studioFixture(page);
  const editor = await draftEditor(page);
  f.studio.lose = "workspace.blueprints.save";
  await editor
    .getByRole("button", { name: "Save definition", exact: true })
    .click();
  await expect(
    editor.getByText(/The write could not be confirmed/),
  ).toBeVisible();
  await editor.getByRole("button", { name: "Close dialog" }).click();
  await page
    .getByRole("button", { name: "Refresh catalog", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "New blueprint", exact: true }),
  ).toBeDisabled();
  await page.getByRole("tab", { name: "Themes", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "New theme", exact: true }),
  ).toBeDisabled();
  await page.getByRole("tab", { name: "Blueprints", exact: true }).click();
  await page
    .getByRole("button", { name: /Synthetic policy brief.*Latest v3/ })
    .click();
  await chooseVersion(page, 3);
  await expect(
    page.getByRole("button", { name: "Edit definition", exact: true }),
  ).toBeDisabled();
  expect(
    f.studio.writes.filter((row) => row.key === "workspace.blueprints.save"),
  ).toHaveLength(1);
  await capture(page, "uncertain-authoring.png");
});

test("theme editing preserves opaque settings and lifecycle, with explicit published settings copy", async ({
  page,
}) => {
  const f = await studioFixture(page);
  await openBlueprint(page);
  await openTheme(page);
  await page
    .getByRole("button", { name: "Edit theme settings", exact: true })
    .click();
  const editor = page.getByRole("dialog", { name: "Edit theme v1" });
  await editor.getByLabel("Theme settings (JSON)").fill('{"color":');
  await editor
    .getByRole("button", { name: "Save theme settings", exact: true })
    .click();
  await expect(editor.getByLabel("Theme settings (JSON)")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  expect(f.studio.writes).toHaveLength(0);
  await editor.getByLabel("Theme settings (JSON)").fill('{"size":1e999}');
  await expect(editor.getByLabel("Theme settings (JSON)")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await editor
    .getByLabel("Theme settings (JSON)")
    .fill('{"color":"#654321","retained":{"nested":true}}');
  await editor
    .getByRole("button", { name: "Save theme settings", exact: true })
    .click();
  await expect(editor).toBeHidden();
  expect(f.studio.themes[0]!.versions[0]!.settings).toEqual({
    color: "#654321",
    retained: { nested: true },
  });
  await capture(page, "theme-desktop.png");
  await page
    .getByRole("button", { name: "Publish theme version", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm publish", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Retire theme version", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Retire theme version", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm retire", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Edit theme settings", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("tab", { name: "Blueprints", exact: true }).click();
  await chooseVersion(page, 3);
  await page
    .getByRole("button", { name: "Edit definition", exact: true })
    .click();
  await page.getByText("Embedded default theme", { exact: true }).click();
  await page.getByRole("combobox", { name: "Theme to copy" }).click();
  await page
    .getByRole("option", { name: studioTheme.name, exact: true })
    .click();
  await page.getByRole("combobox", { name: "Published theme version" }).click();
  await page.getByRole("option", { name: "v2", exact: true }).click();
  await page
    .getByRole("button", { name: "Copy selected theme settings", exact: true })
    .click();
  await expect(page.getByLabel("Default theme settings (JSON)")).toHaveValue(
    JSON.stringify(studioTheme.versions[1]!.settings, null, 2),
  );
  await page
    .getByRole("button", { name: "Save definition", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(f.studio.versions[2]!.definition.defaultTheme).toEqual({
    id: studioTheme.id,
    name: studioTheme.name,
    settings: studioTheme.versions[1]!.settings,
  });
});

test("creates a firm theme and a distinct draft copied from the latest saved settings", async ({
  page,
}) => {
  const f = await studioFixture(page);
  await openBlueprint(page);
  await page.getByRole("tab", { name: "Themes", exact: true }).click();
  await page.getByRole("button", { name: "New theme", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "New document theme" });
  await dialog
    .getByLabel("Theme name", { exact: true })
    .fill("Synthetic new theme");
  await dialog
    .getByLabel("Theme slug", { exact: true })
    .fill("synthetic-new-theme");
  await dialog
    .getByRole("button", { name: "Create theme", exact: true })
    .click();
  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole("heading", { name: "Synthetic new theme", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "New theme draft version", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Version 2", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Synthetic new theme.*Latest v2/ }),
  ).toBeVisible();
  const theme = f.studio.themes[1]!;
  expect(theme.versions).toHaveLength(2);
  expect(theme.versions[1]!.id).not.toBe(theme.versions[0]!.id);
  expect(theme.versions[1]!.settings).toEqual(theme.versions[0]!.settings);
  expect(f.studio.writes.map((row) => row.key)).toEqual([
    "workspace.themes.create",
    "workspace.themes.createVersion",
  ]);
});

test("registers exact available upload, discloses readiness and respects referenced-asset refusal", async ({
  page,
}) => {
  const f = await studioFixture(page);
  await openBlueprint(page);
  await page.getByRole("tab", { name: "Brand assets", exact: true }).click();
  await page.getByRole("combobox", { name: "Confirmed image" }).click();
  await page.getByRole("option", { name: /Synthetic mark.png/ }).click();
  await expect(
    page.getByText("Synthetic scan disclosure", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Add selected image to library", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "Open current image", exact: true }),
  ).toBeVisible();
  expect(f.studio.writes[0]!.input.body).toEqual({
    attachmentId: f.studio.uploads[0]!.id,
  });
  f.studio.referencedAsset = true;
  await page
    .getByRole("button", { name: "Remove Synthetic mark.png", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm remove asset", exact: true })
    .click();
  await expect(
    page
      .getByRole("dialog")
      .getByText(
        "This asset is referenced by a saved theme, blueprint or document.",
        { exact: true },
      ),
  ).toBeVisible();
  f.studio.referencedAsset = false;
  await page
    .getByRole("button", { name: "Confirm remove asset", exact: true })
    .click();
  await expect(page.getByText("No document brand assets yet.")).toBeVisible();
  expect(f.studio.assets).toHaveLength(0);
});

test("malformed registration pauses writes and unavailable asset does not expose an old URL", async ({
  page,
}) => {
  const f = await studioFixture(page);
  f.studio.assets = [{ ...studioAsset, available: false, url: null }];
  await openBlueprint(page);
  await page.getByRole("tab", { name: "Brand assets", exact: true }).click();
  await expect(page.getByText(/Image is currently unavailable/)).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Open current image" }),
  ).toHaveCount(0);
  f.studio.wrong = "workspace.brandAssets.register";
  await page.getByRole("combobox", { name: "Confirmed image" }).click();
  await page.getByRole("option", { name: /Synthetic mark.png/ }).click();
  await page
    .getByRole("button", { name: "Add selected image to library", exact: true })
    .click();
  await expect(
    page.getByText(/The write could not be confirmed/),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Refresh assets", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Add selected image to library",
      exact: true,
    }),
  ).toBeDisabled();
  expect(f.studio.writes).toHaveLength(1);
});

test("narrow definition uses native keyboard dialog and exact switch asset dimensions", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await studioFixture(page);
  const editor = await draftEditor(page);
  await expect(
    editor.getByRole("button", { name: "Close dialog" }),
  ).toBeFocused();
  const toggle = editor.getByRole("switch", {
    name: "Required: Executive summary",
  });
  await toggle.focus();
  await page.keyboard.press("Space");
  await expect(toggle).toHaveAttribute("aria-checked", "false");
  const image = toggle.locator("img");
  await expect(image).toHaveAttribute("src", /switch-off\.svg/);
  expect(
    await image.evaluate((node) => ({
      width: node.getBoundingClientRect().width,
      height: node.getBoundingClientRect().height,
    })),
  ).toEqual({ width: 34, height: 20 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await capture(page, "definition-editor-narrow.png");
  await page.keyboard.press("Escape");
  await expect(editor).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Edit definition", exact: true }),
  ).toBeFocused();
  await page.getByRole("tab", { name: "Brand assets", exact: true }).click();
  await capture(page, "assets-narrow.png");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("upload confirmation stays separate from registration and uses the existing credential-free storage transfer", async ({
  page,
}) => {
  const f = await studioFixture(page);
  f.studio.uploads = [];
  const calls: string[] = [];
  const bytes = Buffer.alloc(240, 1);
  await page.route("**/api/capiro/strategies.context.file.ticket", (route) => {
    calls.push("ticket");
    expect(route.request().postDataJSON()).toEqual({
      body: {
        fileName: "Synthetic mark.png",
        contentType: "image/png",
        contentLength: 240,
      },
    });
    return route.fulfill({
      json: {
        url: "https://studio.s3.amazonaws.com/",
        fields: { key: studioUpload.s3Key, "Content-Type": "image/png" },
        s3Key: studioUpload.s3Key,
      },
    });
  });
  await page.route("https://studio.s3.amazonaws.com/", (route) => {
    calls.push("storage");
    const headers = route.request().headers();
    expect(headers.authorization).toBeUndefined();
    expect(headers.cookie).toBeUndefined();
    return route.fulfill({ status: 204, body: "" });
  });
  await page.route("**/api/capiro/strategies.context.file.confirm", (route) => {
    calls.push("confirm");
    expect(route.request().postDataJSON()).toEqual({
      body: {
        fileName: "Synthetic mark.png",
        contentType: "image/png",
        s3Key: studioUpload.s3Key,
      },
    });
    return route.fulfill({
      json: {
        id: studioUpload.id,
        clientId: null,
        fileName: "Synthetic mark.png",
        contentType: "image/png",
        byteSize: 240,
        s3Key: studioUpload.s3Key,
        lifecycleStatus: "ready",
        scanStatus: "pending",
      },
    });
  });
  await openBlueprint(page);
  await page.getByRole("tab", { name: "Brand assets", exact: true }).click();
  await page.getByLabel("Upload an image", { exact: true }).setInputFiles({
    name: "Synthetic mark.png",
    mimeType: "image/png",
    buffer: bytes,
  });
  await page
    .getByRole("button", { name: "Upload selected image", exact: true })
    .click();
  await expect(
    page.getByText(/Upload confirmed. Refresh available uploads/),
  ).toBeVisible();
  expect(calls).toEqual(["ticket", "storage", "confirm"]);
  expect(f.studio.writes).toHaveLength(0);
  await expect(
    page.getByRole("button", {
      name: "Add selected image to library",
      exact: true,
    }),
  ).toBeDisabled();
  f.studio.uploads = [structuredClone(studioUpload)];
  await page
    .getByRole("button", { name: "Refresh available uploads", exact: true })
    .click();
  await page.getByRole("combobox", { name: "Confirmed image" }).click();
  await page.getByRole("option", { name: /Synthetic mark.png/ }).click();
  await page
    .getByRole("button", { name: "Add selected image to library", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "Open current image", exact: true }),
  ).toBeVisible();
  expect(f.studio.writes.map((row) => row.key)).toEqual([
    "workspace.brandAssets.register",
  ]);
});

test("identity replacement clears the editor and prior definition even when a save finishes late", async ({
  page,
}) => {
  const f = await studioFixture(page);
  const editor = await draftEditor(page);
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let entered = false;
  await page.route("**/api/capiro/workspace.blueprints.save", async (route) => {
    entered = true;
    await held;
    await route.fulfill({ json: f.studio.versions[2] }).catch(() => undefined);
  });
  await editor
    .getByRole("button", { name: "Save definition", exact: true })
    .click();
  await expect.poll(() => entered).toBe(true);
  f.studio.denied = true;
  await f.switchActor();
  release();
  await expect(editor).toBeHidden();
  await expect(page.getByText("Use reviewed primary evidence.")).toHaveCount(0);
  await expect(page.getByText("Save blueprint confirmed.")).toHaveCount(0);
});

import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import {
  adoptedDraft,
  blueprint,
  publishedPin,
  versions,
} from "../../tests/document-blueprint-fixtures";
import {
  blueprintFixture,
  blueprintUrl,
  chooseVersion,
  createDialog,
  openBlueprint,
} from "./document-blueprint-fixture";
import { heldResponse } from "./newsletter-document-fixtures";
import { client, clientId } from "./next-modules-fixtures";

const capture = process.env.CAPIRO_BLUEPRINT_CAPTURE_DIR;
async function shot(page: import("@playwright/test").Page, name: string) {
  if (!capture) return;
  mkdirSync(capture, { recursive: true });
  await page.screenshot({ path: join(capture, name), fullPage: true });
}

test("Workspace exposes the document catalog through tools and New document", async ({
  page,
}) => {
  const f = await blueprintFixture(page);
  await page.goto("/modules/workspace");
  await page
    .getByRole("button", { name: "Workspace tools", exact: true })
    .click();
  await expect(
    page.getByRole("menuitem", { name: "Template Studio", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("menuitem", { name: "Document blueprints", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Document blueprints", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "← Documents", exact: true }).click();
  await page
    .getByRole("button", { name: "+ New document", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Start from a document blueprint",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("heading", { name: "Document blueprints", exact: true }),
  ).toBeVisible();
  expect(f.writes).toEqual([]);
});

test("explicit saved-version adoption uses ordinary creation and survives readback/reload", async ({
  page,
}) => {
  const f = await blueprintFixture(page);
  await openBlueprint(page);
  await expect(page.getByRole("button", { name: /^Use version/ })).toHaveCount(
    0,
  );
  await chooseVersion(page);
  await shot(page, "catalog-desktop.png");
  const dialog = await createDialog(page);
  await expect(dialog.getByText(/blank document in General/)).toBeVisible();
  await dialog.getByLabel("Document title").fill("Explicit pinned document");
  await shot(page, "adopt-desktop.png");
  await dialog
    .getByRole("button", { name: "Create document", exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`draftId=${adoptedDraft().id}`));
  await expect(
    page.getByText("Document blueprint · pinned v2", { exact: true }),
  ).toBeVisible();
  expect(f.writes).toEqual([
    {
      docTitle: "Explicit pinned document",
      clientId: null,
      blueprintPin: publishedPin(),
    },
  ]);
  await page.reload();
  await expect(
    page.getByText("Document blueprint · pinned v2", { exact: true }),
  ).toBeVisible();
  expect(f.writes).toHaveLength(1);
  await shot(page, "adopted-document.png");
});

test("history shows actual versions, only adjacent changed-key comparisons, and returns focus", async ({
  page,
}) => {
  const f = await blueprintFixture(page);
  await openBlueprint(page);
  const opener = page.getByRole("button", {
    name: "Version history",
    exact: true,
  });
  await opener.click();
  const dialog = page.getByRole("dialog", {
    name: "Version history",
    exact: true,
  });
  await dialog
    .getByRole("button", { name: "Compare v1 to v2", exact: true })
    .click();
  await expect(
    dialog.getByText("No top-level definition changes."),
  ).toBeVisible();
  await dialog
    .getByRole("button", { name: "Compare v2 to v3", exact: true })
    .click();
  await expect(
    dialog.getByRole("region", { name: "Comparison v2 to v3" }),
  ).toContainText("contentRules");
  await expect(
    dialog.getByRole("button", { name: "Compare v1 to v3" }),
  ).toHaveCount(0);
  await shot(page, "history-desktop.png");
  await page.keyboard.press("Escape");
  await expect(opener).toBeFocused();
  expect(f.writes).toEqual([]);
});

test("the authorized client scope is retained by ordinary blueprint creation", async ({
  page,
}) => {
  const f = await blueprintFixture(page);
  await openBlueprint(page, `${blueprintUrl}&clientId=${clientId}`);
  await chooseVersion(page);
  const dialog = await createDialog(page);
  await expect(
    dialog.getByText(`Create a blank document in ${client.name}`, {
      exact: false,
    }),
  ).toBeVisible();
  await dialog
    .getByRole("button", { name: "Create document", exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`draftId=${adoptedDraft().id}`));
  await expect(page).toHaveURL(new RegExp(`clientId=${clientId}`));
  await expect(
    page.getByText("Document blueprint · pinned v2", { exact: true }),
  ).toBeVisible();
  expect(f.writes).toEqual([
    { docTitle: blueprint.name, clientId, blueprintPin: publishedPin() },
  ]);
});

test("draft, retired, mismatched resource and changed preflight versions cannot create", async ({
  page,
}) => {
  const f = await blueprintFixture(page);
  await openBlueprint(page);
  for (const version of [1, 3]) {
    await chooseVersion(page, version);
    await expect(
      page.getByRole("button", { name: /^Use version/ }),
    ).toHaveCount(0);
  }
  f.control.wrongVersion = { ...versions[1], blueprintId: versions[0]!.id };
  await page.getByLabel("Saved version").click();
  await page
    .getByRole("option", { name: "v2 · published", exact: true })
    .click();
  await expect(
    page.getByText("Could not load this saved version."),
  ).toBeVisible();
  f.control.wrongVersion = undefined;
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Use version 2" }),
  ).toBeVisible();
  const dialog = await createDialog(page);
  f.control.currentVersions[1]!.status = "retired";
  await dialog
    .getByRole("button", { name: "Create document", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText(
    "could not be verified",
  );
  expect(f.writes).toEqual([]);
});

test("lost create acknowledgement stays fenced across close, catalog refresh and another selection", async ({
  page,
}) => {
  const f = await blueprintFixture(page);
  f.control.loseCreate = true;
  await openBlueprint(page);
  await chooseVersion(page);
  let dialog = await createDialog(page);
  await dialog
    .getByRole("button", { name: "Create document", exact: true })
    .click();
  await expect(
    dialog.getByText("Creation could not be confirmed"),
  ).toBeVisible();
  await page.keyboard.press("Enter");
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Refresh catalog" }).click();
  await page
    .getByRole("button", { name: /Synthetic policy brief.*Latest v3/ })
    .click();
  await chooseVersion(page);
  await page
    .getByRole("button", { name: "Use version 2", exact: true })
    .click();
  dialog = page.getByRole("dialog", {
    name: "Create from blueprint",
    exact: true,
  });
  await expect(
    dialog.getByText("Creation could not be confirmed"),
  ).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Create document", exact: true }),
  ).toHaveCount(0);
  expect(f.writes).toHaveLength(1);
  await shot(page, "uncertain-create.png");
});

for (const mismatch of ["wrongPin", "wrongClient"] as const)
  test(`a ${mismatch} create response cannot announce adoption or navigate`, async ({
    page,
  }) => {
    const f = await blueprintFixture(page);
    f.control[mismatch] = true;
    await openBlueprint(page);
    await chooseVersion(page);
    const dialog = await createDialog(page);
    await dialog
      .getByRole("button", { name: "Create document", exact: true })
      .click();
    await expect(
      dialog.getByText("Creation could not be confirmed"),
    ).toBeVisible();
    await expect(page).toHaveURL(new RegExp("view=document-templates"));
    expect(f.writes).toHaveLength(1);
  });

test("a late selected-version response cannot replace a newer selection", async ({
  page,
}) => {
  const f = await blueprintFixture(page);
  const held = heldResponse();
  await openBlueprint(page);
  f.control.queued.push(async (route, value) => {
    await held.wait;
    try {
      await route.fulfill({ json: value });
    } catch {
      /* The superseded request may already be aborted. */
    } finally {
      held.finished();
    }
  });
  await page.getByLabel("Saved version").click();
  await page
    .getByRole("option", { name: "v2 · published", exact: true })
    .click();
  await expect(page.getByText("Loading selected version…")).toBeVisible();
  await chooseVersion(page, 3);
  held.release();
  await held.settled;
  await expect(
    page.getByRole("region", { name: "Selected version 3" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Use version 2" })).toHaveCount(
    0,
  );
  expect(f.writes).toEqual([]);
});

test("identity replacement discards a pending preflight and prior blueprint contents", async ({
  page,
}) => {
  const f = await blueprintFixture(page);
  const held = heldResponse();
  await openBlueprint(page);
  await chooseVersion(page);
  const dialog = await createDialog(page);
  f.control.queued.push(async (route, value) => {
    await held.wait;
    try {
      await route.fulfill({ json: value });
    } catch {
      /* Actor replacement aborts the obsolete request. */
    } finally {
      held.finished();
    }
  });
  await dialog
    .getByRole("button", { name: "Create document", exact: true })
    .click();
  await expect(
    dialog.getByText("Checking the selected version…"),
  ).toBeVisible();
  f.control.catalog = [];
  await f.switchActor();
  await expect(
    page.getByRole("heading", { name: "No document blueprints available." }),
  ).toBeVisible();
  held.release();
  await held.settled;
  await expect(
    page.getByText("Synthetic policy brief", { exact: true }),
  ).toHaveCount(0);
  expect(f.writes).toEqual([]);
});

test("390px catalog and history wrap, keep assets at their native size, and work by keyboard", async ({
  page,
}) => {
  const f = await blueprintFixture(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await openBlueprint(page);
  await chooseVersion(page);
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 390);
  const dots = page.locator('img[src$="-dot.svg"]');
  expect(
    await dots.evaluateAll((nodes) =>
      nodes.every(
        (node) =>
          node instanceof HTMLImageElement &&
          node.complete &&
          node.naturalWidth > 0 &&
          node.getBoundingClientRect().width === 5 &&
          node.getBoundingClientRect().height === 5,
      ),
    ),
  ).toBe(true);
  await shot(page, "catalog-narrow.png");
  const history = page.getByRole("button", {
    name: "Version history",
    exact: true,
  });
  await history.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", {
    name: "Version history",
    exact: true,
  });
  await dialog
    .getByRole("button", { name: "Compare v2 to v3", exact: true })
    .click();
  await expect(dialog).toBeVisible();
  expect(
    await dialog.evaluate((node) => node.scrollWidth <= node.clientWidth),
  ).toBe(true);
  await shot(page, "history-narrow.png");
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await expect(history).toBeFocused();
  expect(f.writes).toEqual([]);
});

test("empty and refused reads do not retain prior catalog data or create invitations", async ({
  page,
}) => {
  const f = await blueprintFixture(page);
  f.control.catalog = [];
  await page.goto(blueprintUrl);
  await expect(
    page.getByRole("heading", { name: "No document blueprints available." }),
  ).toBeVisible();
  expect(f.writes).toEqual([]);
  f.control.catalog = [
    { ...blueprint, versions: [versions[2]], pinnedDocCount: 0 },
  ];
  await page.getByRole("button", { name: "Refresh catalog" }).click();
  await page.getByRole("button", { name: /Synthetic policy brief/ }).click();
  f.control.denied = true;
  await page.getByRole("button", { name: "Refresh blueprint" }).click();
  await expect(page.getByText("Could not load this blueprint.")).toBeVisible();
  await expect(page.getByLabel("Saved version")).toHaveCount(0);
  f.control.denied = false;
  f.control.catalog = { items: [] };
  await page.getByRole("button", { name: "Refresh catalog" }).click();
  await expect(
    page.getByText("Could not load document blueprints."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Synthetic policy brief/ }),
  ).toHaveCount(0);
  expect(f.writes).toEqual([]);
});

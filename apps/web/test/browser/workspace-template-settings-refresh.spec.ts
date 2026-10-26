import { fileURLToPath } from "node:url";
import { expect, type Page } from "@playwright/test";
import { test } from "./runtime-observed-test";
import { onlyLocalRequests, operationFixtures } from "./fixtures";
import { moduleRouteFixtures } from "./module-route-fixtures";
import { client, clientId } from "./next-modules-fixtures";
import type { OutreachTemplate } from "../../src/shared/capiro/operations/outreach-template-schemas";

const firstId = "71000000-0000-4000-8000-000000000001";
const secondId = "71000000-0000-4000-8000-000000000002";
const originalName = "Synthetic first template";
const changedName = "Revised synthetic template";
const secondName = "Synthetic second template";
const studioUrl = `/modules/workspace?clientId=${clientId}&view=templates`;
function template(id: string, name: string): OutreachTemplate {
  return {
    id,
    name,
    description: "Original description",
    campaignType: "Original type",
    ownerUserId: "test-user",
    clientId: null,
    scope: "private",
    status: "active",
    currentDraftVersionId: null,
    publishedVersionId: null,
    createdAt: "2026-10-25T10:00:00Z",
    updatedAt: "2026-10-25T10:00:00Z",
    archivedAt: null,
    draftVersionNumber: null,
    publishedVersionNumber: null,
    usageCount: 0,
    lastUsedAt: null,
    previewSummary: null,
    capabilities: {
      canUse: false,
      canDuplicate: true,
      canInspect: true,
      canEdit: true,
      canCreateVersion: true,
      canPublish: false,
      canArchive: true,
      canRestore: false,
    },
  };
}
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
async function fixture(
  page: Page,
  outcome: "success" | "denied" | "unknown" = "success",
) {
  await onlyLocalRequests(page);
  if (process.env.CAPIRO_BROWSER_TEST_DEV === "1")
    await page.route("**/Geist-Variable.woff2*", (route) =>
      route.fulfill({
        path: fileURLToPath(
          new URL(
            "../../../../node_modules/geist/dist/fonts/geist-sans/Geist-Variable.woff2",
            import.meta.url,
          ),
        ),
        contentType: "font/woff2",
      }),
    );
  const rows = new Map([
    [firstId, template(firstId, originalName)],
    [secondId, template(secondId, secondName)],
  ]);
  const gate = deferred();
  const state = {
    lists: 0,
    details: [] as string[],
    writes: 0,
    aborted: 0,
    completed: false,
  };
  page.on("requestfailed", (request) => {
    if (
      request.url().includes("/workspace.template.metadata") &&
      request.failure()?.errorText.includes("ABORTED")
    )
      state.aborted++;
  });
  await operationFixtures(page, {
    ...moduleRouteFixtures,
    "clients.list": [client],
    "workspace.clients": { items: [client] },
    "workspace.templates": () => {
      state.lists++;
      return [...rows.values()];
    },
    "workspace.template": (input) => {
      const id = (input as { params: { templateId: string } }).params
        .templateId;
      state.details.push(id);
      const row = rows.get(id)!;
      return { template: row, versions: [], capabilities: row.capabilities };
    },
  });
  await page.route("**/api/backend/core/clients/*", (route) =>
    route.fulfill({ json: client }),
  );
  await page.route(
    "**/api/capiro/workspace.template.metadata",
    async (route) => {
      state.writes++;
      const input = route.request().postDataJSON() as {
        params: { templateId: string };
        body: Pick<
          OutreachTemplate,
          "name" | "description" | "campaignType" | "scope"
        >;
      };
      await gate.promise;
      if (outcome === "denied") {
        await route
          .fulfill({ status: 403, json: { message: "Metadata edit denied" } })
          .catch(() => {});
      } else {
        const updated = {
          ...rows.get(input.params.templateId)!,
          ...input.body,
        };
        rows.set(input.params.templateId, updated);
        // Simulate an effect whose acknowledgement is lost; no success may be inferred.
        if (outcome === "unknown") await route.abort("failed").catch(() => {});
        else await route.fulfill({ json: updated }).catch(() => {});
      }
      state.completed = true;
    },
  );
  return { state, release: gate.resolve };
}
const dialog = (page: Page) =>
  page.getByRole("dialog", { name: "Edit template", exact: true });
const card = (page: Page, name: string) =>
  page.getByRole("article", { includeHidden: true }).filter({
    has: page.getByRole("heading", { name, exact: true, includeHidden: true }),
  });
async function settings(page: Page, name = originalName) {
  await page
    .getByRole("button", { name: `Actions for ${name}`, exact: true })
    .click();
  await page
    .getByRole("menuitem", { name: "Edit settings", exact: true })
    .click();
  await expect(dialog(page).getByLabel("Name", { exact: true })).toHaveValue(
    name,
  );
}
async function edit(page: Page) {
  await dialog(page).getByLabel("Name", { exact: true }).fill(changedName);
  await dialog(page)
    .getByLabel("Description", { exact: true })
    .fill("Revised description");
  await dialog(page)
    .getByLabel("Campaign type", { exact: true })
    .fill("Revised type");
  await dialog(page).getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog(page).getByLabel("Name", { exact: true })).toBeDisabled();
}

test("template presentation keeps compact settings, dismissal and retained actions", async ({
  page,
}, testInfo) => {
  const { state } = await fixture(page);
  await page.goto(studioUrl);
  await expect(card(page, originalName)).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  expect(
    await page.evaluate(() => document.fonts.check("14px TestGeist")),
  ).toBe(true);
  await expect(
    page.getByRole("navigation", { name: "Workspace views" }),
  ).toContainText("Template Studio");
  const disabled = card(page, originalName).getByRole("button", {
    name: "Publish before use",
  });
  await expect(disabled).toBeDisabled();
  expect(
    await disabled.evaluate((el) => getComputedStyle(el).backgroundColor),
  ).toBe("rgb(245, 245, 244)");
  await page.screenshot({
    path: testInfo.outputPath("template-studio-desktop.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "More template actions" }).click();
  await page
    .getByRole("menuitem", { name: "Save campaign as template" })
    .click();
  await expect(
    page.getByRole("dialog", {
      name: "Save campaign as template",
      exact: true,
    }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await settings(page);
  await expect(dialog(page).getByRole("heading")).toHaveCount(1);
  expect((await dialog(page).boundingBox())!.width).toBe(580);
  expect((await dialog(page).boundingBox())!.y).toBe(80);
  await page.screenshot({
    path: testInfo.outputPath("template-settings-desktop.png"),
    fullPage: true,
  });
  await dialog(page)
    .getByLabel("Name", { exact: true })
    .fill("Unsaved synthetic name");
  await dialog(page)
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  await expect(dialog(page)).toHaveCount(0);
  expect(state.writes).toBe(0);
  await settings(page);
  await expect(dialog(page).getByLabel("Name", { exact: true })).toHaveValue(
    originalName,
  );
  await page.keyboard.press("Escape");
  await expect(dialog(page)).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await settings(page);
  expect((await dialog(page).boundingBox())!.width).toBe(358);
  expect(
    await dialog(page).evaluate((el) => el.scrollWidth <= el.clientWidth),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("template-settings-narrow.png"),
    fullPage: false,
  });
  await page.keyboard.press("Escape");
  expect(state.writes).toBe(0);
});

test("acknowledged metadata save refreshes detail and outer card without manual refresh", async ({
  page,
}) => {
  const { state, release } = await fixture(page);
  await page.goto(studioUrl);
  await settings(page);
  await edit(page);
  release();
  await expect.poll(() => state.details.length).toBe(2);
  await expect(dialog(page).getByLabel("Name", { exact: true })).toBeEnabled();
  await expect(dialog(page).getByLabel("Name", { exact: true })).toHaveValue(
    changedName,
  );
  await dialog(page).getByRole("button", { name: "Close dialog" }).click();
  await expect(card(page, changedName)).toBeVisible();
  await expect(card(page, changedName)).toHaveCount(1);
  await expect(card(page, changedName)).toContainText("Revised description");
  await expect(card(page, changedName)).toContainText("Revised type");
  await expect(card(page, originalName)).toHaveCount(0);
  expect(state.writes).toBe(1);
  expect(state.lists).toBe(2);
  expect(state.details).toEqual([firstId, firstId]);
});

for (const outcome of ["denied", "unknown"] as const) {
  test(`${outcome} save retains entered metadata and does not refresh or claim success`, async ({
    page,
  }) => {
    const { state, release } = await fixture(page, outcome);
    await page.goto(studioUrl);
    await settings(page);
    await edit(page);
    release();
    await expect(dialog(page).getByRole("alert")).toBeVisible();
    await expect(
      dialog(page).getByLabel("Name", { exact: true }),
    ).toBeEnabled();
    await expect(dialog(page).getByLabel("Name", { exact: true })).toHaveValue(
      changedName,
    );
    await expect(
      dialog(page).getByLabel("Description", { exact: true }),
    ).toHaveValue("Revised description");
    await expect(
      dialog(page).getByLabel("Campaign type", { exact: true }),
    ).toHaveValue("Revised type");
    await expect(
      dialog(page).getByText("Template settings saved.", { exact: true }),
    ).toHaveCount(0);
    await expect(card(page, originalName)).toHaveCount(1);
    await expect(card(page, changedName)).toHaveCount(0);
    expect(state.writes).toBe(1);
    expect(state.lists).toBe(1);
    expect(state.details).toEqual([firstId]);
  });
}

for (const change of ["template", "session"] as const) {
  test(`pending ${change} change cancels the save and cannot refresh the newly selected detail`, async ({
    page,
  }) => {
    const { state, release } = await fixture(page);
    await page.goto(studioUrl);
    await settings(page);
    await edit(page);
    if (change === "template") {
      await dialog(page).getByRole("button", { name: "Close dialog" }).click();
    } else {
      await page.evaluate(() =>
        window.dispatchEvent(
          new CustomEvent("test:session", {
            detail: {
              userId: "replacement-test-user",
              sessionId: "replacement-test-session",
              orgId: "replacement-test-org",
            },
          }),
        ),
      );
    }
    await expect(dialog(page)).toHaveCount(0);
    await expect.poll(() => state.aborted).toBe(1);
    await settings(page, secondName);
    release();
    await expect.poll(() => state.completed).toBe(true);
    await expect(dialog(page).getByLabel("Name", { exact: true })).toHaveValue(
      secondName,
    );
    await expect(
      dialog(page).getByText("Template settings saved.", { exact: true }),
    ).toHaveCount(0);
    await expect(
      dialog(page).getByText(changedName, { exact: true }),
    ).toHaveCount(0);
    expect(state.writes).toBe(1);
    expect(state.lists).toBe(change === "session" ? 2 : 1);
    expect(state.details).toEqual([firstId, secondId]);
  });
}

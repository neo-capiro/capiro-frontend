import { test, expect, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { onlyLocalRequests, operationFixtures, testIdentity } from "./fixtures";
import { settingsFixtures } from "./settings-fixtures";
import captured from "../../tests/meri-tenant-settings-fixture.json" with { type: "json" };

const endpoint = "**/api/settings/tenant/*";
test.beforeEach(async ({ page }) => {
  await onlyLocalRequests(page);
});
const saveButton = (page: Page) =>
  page.getByRole("button", { name: "Save workspace limits", exact: true });
// Synthetic platform facts; browser UI/control transport only, no native host.
const browserPolicy = {
  enabled: true,
  allowedOrigins: ["https://records.example", "https://notices.example"],
  tools: ["browser_snapshot"],
  timeouts: { actionMs: 5000, navigationMs: 30000 },
  downloads: { enabled: false, formats: [], maxBytes: 1, maxFiles: 1 },
};
const browserDocument = {
  ...captured.read,
  browserPolicy: { browser: { tools: ["browser_snapshot"] } },
  browserStatus: "resolved",
  browserPlatform: {
    maximum: browserPolicy,
    defaults: browserPolicy,
    roleCeilings: {
      standard_user: {
        ...browserPolicy,
        allowedOrigins: ["https://records.example"],
      },
    },
  },
};
async function open(page: Page, enabled = true) {
  await operationFixtures(page, {
    ...settingsFixtures,
    "me.read": testIdentity,
  });
  if (enabled)
    await page.addInitScript(() =>
      sessionStorage.setItem("tenant-settings-enabled", "true"),
    );
  await page.goto("/settings/preferences");
  await page
    .getByRole("tab", { name: "Usage and limits", exact: true })
    .click();
}
async function enterLimits(page: Page) {
  await page
    .getByLabel("Monthly model budget (USD)", { exact: true })
    .fill("1");
  await page
    .getByLabel("Per-query model budget (USD)", { exact: true })
    .fill("0.25");
  await page.getByLabel("Maximum turns per query", { exact: true }).fill("5");
}

test("browser admin chooses approved websites, preserves other policy fields and reloads after save", async ({
  page,
}) => {
  let saved = browserDocument;
  const writes: {
    expectedRevision: number;
    settings: Record<string, unknown>;
  }[] = [];
  await page.route(endpoint, (route) => {
    if (route.request().url().endsWith("/read"))
      return route.fulfill({ json: saved });
    const body = route.request().postDataJSON();
    writes.push(body);
    saved = { ...saved, ...body.settings, revision: saved.revision + 1 };
    const { browserPlatform: omitted, ...response } = saved;
    void omitted;
    return route.fulfill({ json: response });
  });
  await open(page);
  const form = page.getByRole("form", { name: "Workspace browser access" });
  await expect(form).toBeVisible();
  await form
    .getByRole("group", { name: "Workspace", exact: true })
    .getByLabel("https://notices.example", { exact: true })
    .uncheck();
  await form.getByRole("button", { name: "Save browser settings" }).click();
  await expect(
    page.getByText(
      "Browser settings saved. Reload current limits before making another change.",
    ),
  ).toBeVisible();
  expect(writes).toHaveLength(1);
  expect(writes[0]!.expectedRevision).toBe(captured.read.revision);
  expect(writes[0]!.settings.model).toBeUndefined();
  expect(writes[0]!.settings.browserPolicy).toMatchObject({
    browser: {
      tools: ["browser_snapshot"],
      allowedOrigins: ["https://records.example"],
    },
  });
  await expect(
    form.getByRole("button", { name: "Save browser settings" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Reload current limits" }).click();
  await expect(
    form.getByRole("button", { name: "Save browser settings" }),
  ).toBeEnabled();
  await expect(
    form
      .getByRole("group", { name: "Workspace", exact: true })
      .getByLabel("https://notices.example", { exact: true }),
  ).not.toBeChecked();
});

test("browser admin conflict blocks repeat writes until reloaded", async ({
  page,
}) => {
  let writes = 0;
  await page.route(endpoint, (route) =>
    route.request().url().endsWith("/read")
      ? route.fulfill({ json: browserDocument })
      : (writes++,
        route.fulfill({
          status: 409,
          json: { error: { code: "SETTINGS_REVISION_CONFLICT" } },
        })),
  );
  await open(page);
  const button = page.getByRole("button", {
    name: "Save browser settings",
    exact: true,
  });
  await button.click();
  await expect(
    page.getByText(
      "Workspace settings changed elsewhere. Reload current limits and review them before saving again.",
    ),
  ).toBeVisible();
  await expect(button).toBeDisabled();
  expect(writes).toBe(1);
});

test("disabled tenant slot remains inactive and never reads or writes", async ({
  page,
}) => {
  let requests = 0;
  await page.route(endpoint, (route) => {
    requests++;
    return route.abort();
  });
  await open(page, false);
  await expect(
    page.getByText("Workspace-approved configuration unavailable"),
  ).toHaveCount(0);
  await expect(page.getByLabel("Agent model", { exact: true })).toHaveValue(
    "Workspace-approved configuration unavailable",
  );
  await expect(saveButton(page)).toHaveCount(0);
  expect(requests).toBe(0);
});

test("mounted admin reads existing values, saves complete preserved document once and explicitly reads back", async ({
  page,
}) => {
  let reads = 0;
  const writes: unknown[] = [],
    errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route(endpoint, (route) => {
    if (route.request().url().endsWith("/read")) {
      reads++;
      return route.fulfill({
        json: reads === 1 ? captured.read : captured.readback,
      });
    }
    writes.push(route.request().postDataJSON());
    return route.fulfill({ json: captured.save });
  });
  await open(page);
  await expect(
    page.getByLabel("Monthly model budget (USD)", { exact: true }),
  ).toHaveValue("9");
  await expect(
    page.getByText(/Saved revision 7\. Workspace timezone: Australia\/Sydney/),
  ).toBeVisible();
  await enterLimits(page);
  await saveButton(page).focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByText(
      "Workspace limits saved. Reload current limits before making another change.",
    ),
  ).toBeVisible();
  expect(writes).toEqual([captured.request]);
  await expect(saveButton(page)).toBeDisabled();
  await page
    .getByRole("button", { name: "Reload current limits", exact: true })
    .click();
  await expect(page.getByText(/Saved revision 8\./)).toBeVisible();
  await expect(saveButton(page)).toBeEnabled();
  expect(writes).toHaveLength(1);
  expect(reads).toBe(2);
  expect(errors).toEqual([]);
  await mkdir("test-results/tenant-settings", { recursive: true });
  await page.screenshot({
    path: "test-results/tenant-settings/desktop.png",
    fullPage: true,
  });
});

test("unconfigured cap stays blank and invalid amounts/turns never submit on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  let writes = 0;
  await page.route(endpoint, (route) => {
    if (route.request().url().endsWith("/save")) writes++;
    return route.fulfill({ json: captured.initial });
  });
  await open(page);
  await expect(page.getByText(/No monthly cap is configured/)).toBeVisible();
  await expect(
    page.getByLabel("Monthly model budget (USD)", { exact: true }),
  ).toHaveValue("");
  await enterLimits(page);
  await page
    .getByLabel("Monthly model budget (USD)", { exact: true })
    .fill("0.0000001");
  await saveButton(page).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Enter positive USD" }),
  ).toBeVisible();
  await enterLimits(page);
  await page.getByLabel("Maximum turns per query", { exact: true }).fill("101");
  await saveButton(page).click();
  expect(writes).toBe(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await mkdir("test-results/tenant-settings", { recursive: true });
  await page.screenshot({
    path: "test-results/tenant-settings/mobile.png",
    fullPage: true,
  });
});

test("canonical member response denies controls even when shell role is admin", async ({
  page,
}) => {
  await page.route(endpoint, (route) =>
    route.fulfill({ json: captured.member }),
  );
  await open(page);
  await expect(
    page.getByText(
      "A current workspace administrator is required to view and change model limits.",
    ),
  ).toBeVisible();
  await expect(saveButton(page)).toHaveCount(0);
});

test("conflict requires explicit reload and never automatically resubmits", async ({
  page,
}) => {
  let reads = 0,
    writes = 0;
  await page.route(endpoint, (route) => {
    if (route.request().url().endsWith("/read")) {
      reads++;
      return route.fulfill({
        json: reads === 1 ? captured.read : captured.readback,
      });
    }
    writes++;
    return route.fulfill({
      status: 409,
      json: { error: { code: "SETTINGS_REVISION_CONFLICT" } },
    });
  });
  await open(page);
  await enterLimits(page);
  await saveButton(page).click();
  await expect(
    page.getByText(/Workspace settings changed elsewhere/),
  ).toBeVisible();
  await expect(saveButton(page)).toBeDisabled();
  expect(reads).toBe(1);
  expect(writes).toBe(1);
  await page
    .getByRole("button", { name: "Reload current limits", exact: true })
    .click();
  await expect(page.getByText(/Saved revision 8\./)).toBeVisible();
  expect(reads).toBe(2);
  expect(writes).toBe(1);
});

test("uncertain save reconciles by read with no false save claim or retry", async ({
  page,
}) => {
  let reads = 0,
    writes = 0;
  await page.route(endpoint, (route) => {
    if (route.request().url().endsWith("/read")) {
      reads++;
      return route.fulfill({
        json: reads === 1 ? captured.read : captured.readback,
      });
    }
    writes++;
    return route.fulfill({
      status: 503,
      json: { error: { code: "SETTINGS_COMMIT_UNKNOWN" } },
    });
  });
  await open(page);
  await enterLimits(page);
  await saveButton(page).click();
  await expect(page.getByText(/The save outcome is uncertain/)).toBeVisible();
  await expect(saveButton(page)).toBeDisabled();
  await page
    .getByRole("button", { name: "Reload current limits", exact: true })
    .click();
  await expect(
    page.getByText(/earlier save outcome was uncertain/),
  ).toBeVisible();
  await expect(
    page.getByLabel("Monthly model budget (USD)", { exact: true }),
  ).toHaveValue("1");
  expect(writes).toBe(1);
  expect(reads).toBe(2);
});

test("save refusal clears private values and never displays success", async ({
  page,
}) => {
  await page.route(endpoint, (route) =>
    route.fulfill(
      route.request().url().endsWith("/read")
        ? { json: captured.read }
        : {
            status: 403,
            json: {
              error: {
                code: "MEMBERSHIP_REVOKED",
                outcome: "RESULT_NOT_RELEASED",
              },
            },
          },
    ),
  );
  await open(page);
  await enterLimits(page);
  await saveButton(page).click();
  await expect(
    page.getByText(/Current administrator access was refused/),
  ).toBeVisible();
  await expect(
    page.getByLabel("Monthly model budget (USD)", { exact: true }),
  ).toHaveCount(0);
  await expect(page.getByText(/Workspace limits saved\./)).toHaveCount(0);
});

test("session replacement discards loaded document and pending save observation", async ({
  page,
}) => {
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(endpoint, async (route) => {
    if (route.request().url().endsWith("/read"))
      return route.fulfill({ json: captured.read });
    await pending;
    await route.fulfill({ json: captured.save }).catch(() => undefined);
  });
  await open(page);
  await enterLimits(page);
  await saveButton(page).click();
  await expect(page.getByText(/Saving workspace limits/)).toBeVisible();
  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent("test:session", {
        detail: { userId: null, sessionId: null, orgId: null },
      }),
    ),
  );
  release();
  await expect(
    page.getByLabel("Monthly model budget (USD)", { exact: true }),
  ).toHaveCount(0);
  await expect(page.getByText(/Workspace limits saved\./)).toHaveCount(0);
});

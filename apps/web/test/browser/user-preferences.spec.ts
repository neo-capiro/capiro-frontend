import { test, expect, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { onlyLocalRequests, operationFixtures, testIdentity } from "./fixtures";
import { settingsFixtures } from "./settings-fixtures";
import { currentPreferencesFixture as captured } from "../../tests/meri-user-preferences-fixtures";

async function identity(page: Page, enabled = true) {
  await onlyLocalRequests(page);
  await operationFixtures(page, {
    ...settingsFixtures,
    "me.read": {
      ...testIdentity,
      user: { ...testIdentity.user, id: captured.read.owner.actorId },
      tenant: { ...testIdentity.tenant, id: captured.read.owner.tenantId },
    },
  });
  if (enabled)
    await page.addInitScript(() =>
      sessionStorage.setItem("user-preferences-enabled", "true"),
    );
}
const endpoint = "**/api/settings/user/*";
const navigate = async (page: Page, path: string) =>
  page.evaluate((path) => {
    history.pushState({}, "", path);
    dispatchEvent(new PopStateEvent("popstate"));
  }, path);

test("personal preferences remain disabled without literal opt-in", async ({
  page,
}) => {
  await identity(page, false);
  let requests = 0;
  await page.route(endpoint, (route) => {
    requests++;
    return route.abort();
  });
  await page.goto("/settings/preferences");
  await expect(
    page.getByText("Meri preferences connection unavailable"),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Save preferences", exact: true }),
  ).toBeDisabled();
  expect(requests).toBe(0);
});

test("current synthetic application replies support complete save/readback and local panel preview", async ({
  page,
}) => {
  await identity(page);
  let reads = 0;
  const writes: unknown[] = [];
  const errors: string[] = [];
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
  await page.goto("/settings/preferences");
  await page.getByRole("button", { name: "Load current preferences" }).click();
  await page
    .getByRole("combobox", { name: "Theme", exact: true })
    .selectOption("dark");
  await page
    .getByRole("combobox", { name: "Density", exact: true })
    .selectOption("compact");
  await page.getByLabel("Timezone", { exact: true }).fill("America/New_York");
  await page.getByRole("button", { name: "Save personal preferences" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText(/Save accepted/)).toBeVisible();
  expect(writes).toEqual([captured.request]);
  await page.getByRole("button", { name: "Check current preferences" }).click();
  await expect(page.getByText(/Current saved preferences match/)).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Theme", exact: true }),
  ).toHaveValue("dark");
  await expect(
    page.locator('form[data-theme="dark"][data-density="compact"]'),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.dataset.theme),
  ).toBeUndefined();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await mkdir("test-results/user-preferences", { recursive: true });
  await page.screenshot({
    path: "test-results/user-preferences/personal-preferences-desktop.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
  expect(writes).toHaveLength(1);
  expect(reads).toBe(2);
});

test("revision conflict requires explicit reload and preserves current values", async ({
  page,
}) => {
  await identity(page);
  let reads = 0;
  let writes = 0;
  await page.route(endpoint, (route) => {
    if (route.request().url().endsWith("/read")) {
      reads++;
      return route.fulfill({
        json: reads === 1 ? captured.read : captured.readback,
      });
    }
    writes++;
    return route.fulfill({
      status: captured.conflict.status,
      json: captured.conflict.body,
    });
  });
  await page.goto("/settings/meri-preferences");
  await page.getByRole("button", { name: "Load current preferences" }).click();
  await page
    .getByRole("combobox", { name: "Theme", exact: true })
    .selectOption("light");
  await page.getByRole("button", { name: "Save personal preferences" }).click();
  await expect(page.getByText(/Preferences changed elsewhere/)).toBeVisible();
  expect(reads).toBe(1);
  expect(writes).toBe(1);
  await page
    .getByRole("button", { name: "Reload current preferences" })
    .click();
  await expect(
    page.getByRole("combobox", { name: "Theme", exact: true }),
  ).toHaveValue("dark");
  expect(writes).toBe(1);
});

test("unknown save survives navigation and requires safe read-only reconciliation or explicit newer-state adoption", async ({
  page,
}) => {
  await identity(page);
  let reads = 0;
  let writes = 0;
  const newer = {
    ...captured.readback,
    revision: 4,
    preferences: { ...captured.readback.preferences, theme: "light" },
  };
  await page.route(endpoint, (route) => {
    if (route.request().url().endsWith("/read")) {
      reads++;
      return route.fulfill(
        reads === 2
          ? { status: captured.conflict.status, json: captured.conflict.body }
          : { json: reads < 4 ? captured.read : newer },
      );
    }
    writes++;
    return route.abort("failed");
  });
  await page.goto("/settings/preferences");
  await page.getByRole("button", { name: "Load current preferences" }).click();
  await page
    .getByRole("combobox", { name: "Theme", exact: true })
    .selectOption("dark");
  await page.getByRole("button", { name: "Save personal preferences" }).click();
  await expect(page.getByText(/save outcome is uncertain/)).toBeVisible();
  await navigate(page, "/settings/personal");
  await expect(
    page.getByRole("heading", { name: "Personal", exact: true }),
  ).toBeVisible();
  await navigate(page, "/settings/preferences");
  await expect(
    page.getByText(/previous save needs read-only reconciliation/),
  ).toBeVisible();
  await page.getByRole("button", { name: "Check current preferences" }).click();
  await expect(page.getByText(/Any previous save remains held/)).toBeVisible();
  await page.getByRole("button", { name: "Check current preferences" }).click();
  await expect(page.getByText(/Writes remain held/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Use current saved preferences" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Check current preferences" }).click();
  await expect(
    page.getByRole("combobox", { name: "Theme", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Use current saved preferences" })
    .click();
  await expect(
    page.getByRole("combobox", { name: "Theme", exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByRole("combobox", { name: "Theme", exact: true }),
  ).toHaveValue("light");
  expect(writes).toBe(1);
});

test("access loss removes drafts and never redispatches a known withheld save", async ({
  page,
}) => {
  await identity(page);
  let writes = 0;
  await page.route(endpoint, (route) => {
    if (route.request().url().endsWith("/read"))
      return route.fulfill({ json: captured.read });
    writes++;
    return route.fulfill({
      status: 403,
      json: {
        error: { code: "ACCESS_DENIED", outcome: "RESULT_NOT_RELEASED" },
      },
    });
  });
  await page.goto("/settings/preferences");
  await page.getByRole("button", { name: "Load current preferences" }).click();
  await page.getByLabel("Timezone", { exact: true }).fill("America/New_York");
  await page.getByRole("button", { name: "Save personal preferences" }).click();
  await expect(page.getByText(/Access changed/)).toBeVisible();
  await expect(page.getByLabel("Timezone", { exact: true })).toHaveCount(0);
  await navigate(page, "/settings/personal");
  await navigate(page, "/settings/preferences");
  await expect(
    page.getByRole("button", { name: "Check current preferences" }),
  ).toHaveCount(0);
  expect(writes).toBe(1);
});

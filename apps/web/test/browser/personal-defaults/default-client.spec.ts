import { expect, test } from "@playwright/test";
import { onlyLocalRequests } from "../fixtures";
import { currentPreferencesFixture } from "../../../tests/meri-user-preferences-fixtures";
const id = "30000000-0000-4000-8000-000000000001";
const reply = {
  ...currentPreferencesFixture.read,
  preferences: {
    ...currentPreferencesFixture.read.preferences,
    defaultClientId: id,
  },
};
const client = {
  id,
  name: "Synthetic default",
  status: "active",
  profileStatus: "active",
};
const pagePath = "/personal-defaults/index.html";
test.beforeEach(async ({ page }) => {
  await onlyLocalRequests(page);
});
test("fresh default opens one retained client intent and a second click cannot duplicate it", async ({
  page,
}) => {
  let reads = 0,
    clients = 0;
  await page.route("**/api/settings/user/read", (route) => {
    reads++;
    return route.fulfill({ json: reply });
  });
  await page.route("**/api/backend/core/clients/*", (route) => {
    clients++;
    return route.fulfill({ json: client });
  });
  await page.goto(pagePath);
  expect(reads).toBe(0);
  await page
    .getByRole("button", { name: "New conversation", exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`/meri\\?clientId=${id}$`));
  await page
    .getByRole("button", { name: "New conversation", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("unknown outcome");
  expect(reads).toBe(2);
  expect(clients).toBe(2);
});
test("missing default prompts for scope without looking up a client", async ({
  page,
}) => {
  let clients = 0;
  await page.route("**/api/settings/user/read", (route) =>
    route.fulfill({
      json: {
        ...reply,
        preferences: { ...reply.preferences, defaultClientId: null },
      },
    }),
  );
  await page.route("**/api/backend/core/clients/*", (route) => {
    clients++;
    return route.abort();
  });
  await page.goto(pagePath);
  await page
    .getByRole("button", { name: "New conversation", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Choose General");
  expect(clients).toBe(0);
  expect(await page.evaluate(() => sessionStorage.length)).toBe(0);
});
test("revoked client produces no intent or navigation", async ({ page }) => {
  await page.route("**/api/settings/user/read", (route) =>
    route.fulfill({ json: reply }),
  );
  await page.route("**/api/backend/core/clients/*", (route) =>
    route.fulfill({ status: 403, json: { message: "Denied" } }),
  );
  await page.goto(pagePath);
  await page
    .getByRole("button", { name: "New conversation", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("could not be verified");
  await expect(page).toHaveURL(new RegExp(pagePath + "$"));
  expect(await page.evaluate(() => sessionStorage.length)).toBe(0);
});
test("account change retires an in-flight default lookup", async ({ page }) => {
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/settings/user/read", (route) =>
    route.fulfill({ json: reply }),
  );
  await page.route("**/api/backend/core/clients/*", async (route) => {
    await held;
    await route.fulfill({ json: client }).catch(() => {});
  });
  await page.goto(pagePath);
  const requested = page.waitForRequest("**/api/backend/core/clients/*");
  await page
    .getByRole("button", { name: "New conversation", exact: true })
    .click();
  await requested;
  await expect(
    page.getByRole("button", { name: "New conversation", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Switch account" }).click();
  release();
  await expect(
    page.getByRole("button", { name: "New conversation", exact: true }),
  ).toBeEnabled();
  await expect(page).toHaveURL(new RegExp(pagePath + "$"));
  expect(await page.evaluate(() => sessionStorage.length)).toBe(0);
});
test("device reduced motion makes progress static after one minimal iteration and preserves keyboard focus", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(pagePath);
  const progress = page.getByTestId("progress");
  await expect(progress).toHaveCSS("animation-duration", "1e-05s");
  await expect(progress).toHaveCSS("animation-iteration-count", "1");
  await page.getByLabel("Focus example").focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  await expect(page.getByLabel("Focus example")).toHaveCSS(
    "outline-style",
    "solid",
  );
});

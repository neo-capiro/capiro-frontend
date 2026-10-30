import { test, expect } from "@playwright/test";
import { onlyLocalRequests, operationFixtures } from "./fixtures";
import { settingsFixtures } from "./settings-fixtures";
import {
  client,
  clientId,
  otherClient,
  otherClientId,
  navigate,
} from "./next-modules-fixtures";

test.beforeEach(async ({ page }) => {
  await onlyLocalRequests(page);
  await operationFixtures(page, settingsFixtures);
  await page.route("**/api/backend/core/clients/*", (route) =>
    route.fulfill({
      json: route.request().url().endsWith(otherClientId)
        ? otherClient
        : client,
    }),
  );
});

test("verified client survives Modules, Settings sections and all product destinations", async ({
  page,
}, info) => {
  await page.goto(`/modules?clientId=${clientId}`);
  const account = page.getByRole("link", {
    name: "Account settings",
    exact: true,
  });
  await expect(account).toHaveAttribute(
    "href",
    `/settings/personal?clientId=${clientId}`,
  );
  await account.click();
  await expect(
    page.getByRole("heading", { name: "Personal", exact: true }),
  ).toBeVisible();
  const settings = page.getByRole("navigation", {
    name: "Settings",
    exact: true,
  });
  await expect(
    settings.getByRole("link", { name: "Team", exact: true }),
  ).toHaveAttribute("href", `/settings/team?clientId=${clientId}`);
  await settings.getByRole("link", { name: "Team", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Team", exact: true }),
  ).toBeVisible();
  const modes = page.getByRole("navigation", { name: "Product modes" });
  await expect(
    modes.getByRole("link", { name: "Meri", exact: true }),
  ).toHaveAttribute("href", `/meri?clientId=${clientId}`);
  await expect(
    modes.getByRole("link", { name: "Portfolio", exact: true }),
  ).toHaveAttribute("href", `/portfolio/${clientId}`);
  await expect(
    modes.getByRole("link", { name: "Modules", exact: true }),
  ).toHaveAttribute("href", `/modules?clientId=${clientId}`);
  await page.screenshot({
    path: info.outputPath("settings-verified-client-1440x1040.png"),
    fullPage: true,
  });
  await page.getByRole("link", { name: "All modules", exact: true }).click();
  await expect(page).toHaveURL(`/modules?clientId=${clientId}`);
});

test("unavailable client never blocks account Settings or escapes in mode links", async ({
  page,
}) => {
  await page.route(`**/api/backend/core/clients/${clientId}`, (route) =>
    route.fulfill({ status: 403, json: { message: "No access" } }),
  );
  await page.goto(`/settings/personal?clientId=${clientId}`);
  await expect(
    page.getByRole("heading", { name: "Personal", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Selected client unavailable" }),
  ).toHaveCount(0);
  const modes = page.getByRole("navigation", { name: "Product modes" });
  await expect(
    modes.getByRole("link", { name: "Meri", exact: true }),
  ).toHaveAttribute("href", "/meri?scope=general");
  await expect(
    modes.getByRole("link", { name: "Portfolio", exact: true }),
  ).toHaveAttribute("href", "/portfolio");
  await expect(
    page.getByRole("link", { name: "All modules", exact: true }),
  ).toHaveAttribute("href", "/modules");
});

test("Settings client replacement hides former scope until the replacement is verified", async ({
  page,
}) => {
  let release: (() => Promise<void>) | undefined;
  await page.goto(`/settings/personal?clientId=${clientId}`);
  const modes = page.getByRole("navigation", { name: "Product modes" });
  await expect(
    modes.getByRole("link", { name: "Meri", exact: true }),
  ).toHaveAttribute("href", `/meri?clientId=${clientId}`);
  await page.route(`**/api/backend/core/clients/${otherClientId}`, (route) => {
    release = () => route.fulfill({ json: otherClient });
  });
  await navigate(page, `/settings/personal?clientId=${otherClientId}`);
  await expect.poll(() => Boolean(release)).toBe(true);
  await expect(
    modes.getByRole("link", { name: "Meri", exact: true }),
  ).toHaveAttribute("href", "/meri?scope=general");
  await expect(
    page.getByRole("heading", { name: "Personal", exact: true }),
  ).toBeVisible();
  await release!();
  await expect(
    modes.getByRole("link", { name: "Meri", exact: true }),
  ).toHaveAttribute("href", `/meri?clientId=${otherClientId}`);
});

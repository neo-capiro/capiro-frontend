import { expect, test } from "@playwright/test";
import { onlyLocalRequests, operationFixtures, testIdentity } from "./fixtures";

const id = "10000000-0000-4000-8000-000000000010";
const connection = {
  id,
  provider: "google_workspace",
  accountEmail: "fixture@example.test",
  displayName: "Synthetic mailbox",
  status: "connected",
  scopes: ["requested-only"],
  lastSyncAt: null,
  lastError: null,
};
const capabilities = {
  configured: true,
  redirectUri: "https://example.test/callback",
  scopes: [],
};
const stats = {
  scanned: 0,
  matched: 0,
  skipped: 0,
  removed: 0,
  failed: 0,
  pages: 1,
  hasMore: false,
};
test.beforeEach(async ({ page }) => {
  await onlyLocalRequests(page);
});

async function fixtures(
  page: Parameters<typeof operationFixtures>[0],
  rows = [connection],
) {
  await operationFixtures(page, {
    "me.read": testIdentity,
    "clients.list": [],
    "settings.integrations.list": rows,
    "settings.integrations.microsoftCapabilities": capabilities,
    "settings.integrations.googleCapabilities": capabilities,
  });
}

test("provider success needs a matching current connection and is consumed once", async ({
  page,
}) => {
  await fixtures(page);
  await page.goto(
    `/settings/integrations?provider=google_workspace&connected=1&connectionId=${id}#detail`,
  );
  await expect(
    page.getByText("Account is connected", { exact: true }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/settings\/integrations#detail$/);
  await page.reload();
  await expect(
    page.getByText("Account is connected", { exact: true }),
  ).toHaveCount(0);
});

test("wrong connection and provider details never produce success", async ({
  page,
}) => {
  await fixtures(page, []);
  await page.goto(
    `/settings/integrations?provider=google_workspace&connected=1&connectionId=${id}`,
  );
  await expect(
    page.getByText("Connection could not be confirmed", { exact: true }),
  ).toBeVisible();
  await page.goto(
    "/settings/integrations?provider=google_workspace&error=private-provider-text&error_description=private-detail",
  );
  await expect(
    page.getByText("Connection was not confirmed", { exact: true }),
  ).toBeVisible();
  await expect(page.locator("body")).not.toContainText("private-provider-text");
  await expect(page.locator("body")).not.toContainText("private-detail");
});

test("partial sync and unverified grants are explicit", async ({ page }) => {
  await fixtures(page);
  await operationFixtures(page, {
    "me.read": testIdentity,
    "clients.list": [],
    "settings.integrations.list": [connection],
    "settings.integrations.microsoftCapabilities": capabilities,
    "settings.integrations.googleCapabilities": capabilities,
    "settings.integrations.syncGoogle": { connectionId: id, calendar: stats },
  });
  await page.goto("/settings/integrations");
  await page.getByRole("button", { name: "Sync now", exact: true }).click();
  await expect(page.getByText(/Sync returned only part/)).toBeVisible();
  await page.getByRole("button", { name: "Permissions", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Current grants have not been verified",
  );
});

test("errored connections can be retried or disconnected and IMAP cannot register", async ({
  page,
}) => {
  await fixtures(page, [{ ...connection, status: "error" }]);
  await page.goto("/settings/integrations");
  await expect(
    page.getByRole("button", { name: "Retry sync", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Disconnect", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "become unavailable in mail views",
  );
  await page.getByRole("button", { name: "Keep connected" }).click();
  await expect(
    page.getByText("IMAP / CalDAV ingestion is not supported.", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "+ Register account", exact: true }),
  ).toHaveCount(2);
});

test("callback confirmation recovers a failed read and updates after disconnect", async ({
  page,
}) => {
  let unavailable = true;
  let rows = [connection];
  await operationFixtures(page, {
    "me.read": testIdentity,
    "clients.list": [],
    "settings.integrations.list": () =>
      unavailable ? { invalid: true } : rows,
    "settings.integrations.microsoftCapabilities": capabilities,
    "settings.integrations.googleCapabilities": capabilities,
    "settings.integrations.disconnectGoogle": () => {
      rows = [];
      return {
        connectionId: id,
        disconnected: true,
        providerRevocation: "unconfirmed",
      };
    },
  });
  await page.goto(
    `/settings/integrations?provider=google_workspace&connected=1&connectionId=${id}`,
  );
  const unavailableNotice = page
    .getByRole("alert")
    .filter({ hasText: "Connection status unavailable" });
  await expect(unavailableNotice).toBeVisible();
  unavailable = false;
  await unavailableNotice
    .getByRole("button", { name: "Retry", exact: true })
    .click();
  await expect(
    page.getByText("Account is connected", { exact: true }),
  ).toBeVisible();
  // Recover the independent list request as well; it owns the account rows.
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await page.getByRole("button", { name: "Disconnect", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Disconnect", exact: true })
    .click();
  await expect(
    page.getByText("Account is connected", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Connection could not be confirmed", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(/Google token revocation was not confirmed/),
  ).toBeVisible();
});

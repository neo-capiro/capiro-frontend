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

test("failed Realtime reconciliation refreshes persisted partial health", async ({
  page,
}) => {
  let configured = true;
  await operationFixtures(page, {
    "me.read": testIdentity,
    "clients.list": [],
    "settings.integrations.list": () => [
      {
        ...connection,
        provider: "microsoft_365",
        subscriptions: {
          configured,
          updatedAt: null,
          lastNotificationAt: null,
          lastLifecycleEvent: null,
          resources: [],
        },
      },
    ],
    "settings.integrations.microsoftCapabilities": {
      ...capabilities,
      subscriptionsConfigured: true,
    },
    "settings.integrations.googleCapabilities": capabilities,
  });
  await page.route(
    "**/api/capiro/settings.integrations.configureMicrosoftSubscriptions",
    async (route) => {
      expect(route.request().method()).toBe("POST");
      expect(route.request().postDataJSON()).toEqual({
        params: { connectionId: id },
      });
      configured = false;
      await route.fulfill({
        status: 503,
        json: { message: "Synthetic subscription renewal failed" },
      });
    },
  );
  await page.goto("/settings/integrations");
  await expect(
    page.getByText(/Realtime notifications: configured\./),
  ).toBeVisible();
  await page.getByRole("button", { name: "Realtime", exact: true }).click();
  await expect(
    page.getByText("Integration action failed", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(/Realtime notifications: not confirmed\./),
  ).toBeVisible();
  await expect(
    page.getByText("Realtime subscriptions are configured.", { exact: true }),
  ).toHaveCount(0);
});

for (const provider of ["google_workspace", "microsoft_365"] as const) {
  test(`${provider} restart requires review and ordinary retry resumes after failure`, async ({
    page,
  }) => {
    let failed = false;
    const writes: unknown[] = [];
    const operation =
      provider === "microsoft_365" ? "syncMicrosoft" : "syncGoogle";
    await operationFixtures(page, {
      "me.read": testIdentity,
      "clients.list": [],
      "settings.integrations.list": () => [
        {
          ...connection,
          provider,
          status: failed ? "error" : "connected",
          lastError: failed
            ? "Synthetic import interrupted; progress is saved."
            : null,
        },
      ],
      "settings.integrations.microsoftCapabilities": capabilities,
      "settings.integrations.googleCapabilities": capabilities,
    });
    await page.route(
      `**/api/capiro/settings.integrations.${operation}`,
      async (route) => {
        expect(route.request().method()).toBe("POST");
        writes.push(route.request().postDataJSON());
        if (writes.length === 1) {
          failed = true;
          return route.fulfill({
            status: 503,
            json: { message: "Synthetic import interrupted" },
          });
        }
        return route.fulfill({
          json: {
            connectionId: id,
            calendar: stats,
            mail: { inbox: { ...stats, hasMore: true } },
          },
        });
      },
    );
    await page.goto("/settings/integrations");
    await page
      .getByRole("button", { name: "Restart sync…", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toContainText(
      "configured folders and history window",
    );
    await page.screenshot({ path: test.info().outputPath("restart-sync.png") });
    expect(writes).toEqual([]);
    await page
      .getByRole("button", { name: "Keep current progress", exact: true })
      .click();
    expect(writes).toEqual([]);
    await page
      .getByRole("button", { name: "Restart sync…", exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Restart sync", exact: true })
      .click();
    await expect(
      page.getByText("Integration action failed", { exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(
      page.getByText("Synthetic import interrupted; progress is saved."),
    ).toBeVisible();
    await page.getByRole("button", { name: "Retry sync", exact: true }).click();
    await expect(
      page.getByText(
        "Sync made progress. More records remain to import; coverage is incomplete.",
        { exact: true },
      ),
    ).toBeVisible();
    expect(writes).toEqual([
      { params: { connectionId: id }, query: { reset: true } },
      { params: { connectionId: id } },
    ]);
  });
}

test("restart remains unavailable when reconnect is required", async ({
  page,
}) => {
  await fixtures(page, [{ ...connection, status: "needs_configuration" }]);
  await page.goto("/settings/integrations");
  await expect(
    page.getByRole("button", { name: "Restart sync…", exact: true }),
  ).toBeDisabled();
});

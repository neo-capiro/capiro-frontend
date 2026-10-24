import { expect, test, type Route } from "@playwright/test";
import { onlyLocalRequests, operationFixtures, testIdentity } from "./fixtures";

const connectionId = "10000000-0000-4000-8000-000000000001";
const connection = {
  id: connectionId,
  provider: "microsoft_365",
  accountEmail: "person@example.test",
  displayName: "Example account",
  status: "connected",
  scopes: ["Calendars.Read"],
  lastSyncAt: null,
  lastError: null,
};

async function reply(route: Route, status: number, data: unknown) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(data),
  });
}

for (const outcome of ["refusal", "unknown"] as const)
  test(`pending disconnect keeps its confirmation through dismissals and a ${outcome} response`, async ({
    page,
  }) => {
    let writes = 0;
    let removed = false;
    let releaseFirst!: () => void;
    const firstPending = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    await onlyLocalRequests(page);
    await operationFixtures(page, {
      "me.read": testIdentity,
      "clients.list": [],
    });
    await page.route("**/api/capiro/*", async (route) => {
      const operation = decodeURIComponent(
        new URL(route.request().url()).pathname.split("/").at(-1) ?? "",
      );
      if (operation === "settings.integrations.list") {
        await reply(route, 200, removed ? [] : [connection]);
      } else if (
        operation === "settings.integrations.microsoftCapabilities" ||
        operation === "settings.integrations.googleCapabilities"
      ) {
        await reply(route, 200, {
          configured: false,
          redirectUri: "https://example.test/callback",
          scopes: [],
        });
      } else if (operation === "settings.integrations.disconnectMicrosoft") {
        writes++;
        if (writes === 1) {
          await firstPending;
          await reply(route, outcome === "refusal" ? 409 : 500, {
            message: "Synthetic disconnect failed",
          });
        } else {
          removed = true;
          await reply(route, 200, {
            disconnected: true,
            connectionId,
            subscriptionsDeleted: 0,
          });
        }
      } else {
        await route.fallback();
      }
    });

    await page.goto("/settings/integrations");
    await page.getByRole("button", { name: "Disconnect", exact: true }).click();
    const dialog = page.getByRole("dialog", {
      name: "Disconnect Microsoft 365?",
    });
    await expect(dialog).toContainText("person@example.test");
    await dialog.getByRole("button", { name: "Disconnect" }).click();
    await expect(
      dialog.getByRole("button", { name: "Disconnect" }),
    ).toBeDisabled();
    await expect.poll(() => writes).toBe(1);

    await expect(
      dialog.getByRole("button", { name: "Close dialog" }),
    ).toBeDisabled();
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeVisible();
    await page.mouse.click(8, 8);
    await expect(dialog).toBeVisible();

    releaseFirst();
    if (outcome === "unknown") {
      await expect(dialog).toContainText(
        "This change will not be submitted again.",
      );
      await expect(
        dialog.getByRole("button", { name: "Disconnect", exact: true }),
      ).toBeDisabled();
      await dialog
        .getByRole("button", { name: "Check current result" })
        .click();
      await expect(
        dialog.getByRole("button", { name: "Disconnect", exact: true }),
      ).toBeDisabled();
      await page.reload();
      await expect(
        page.getByRole("button", { name: "Disconnect", exact: true }),
      ).toBeDisabled();
      await expect(
        page.getByRole("heading", { name: "Example account", exact: true }),
      ).toBeVisible();
      expect(writes).toBe(1);
      return;
    }
    await expect(dialog.getByText("Synthetic disconnect failed")).toBeVisible();
    await expect(dialog).toContainText("person@example.test");
    await dialog.getByRole("button", { name: "Disconnect" }).click();
    await expect(dialog).not.toBeVisible();
    await expect(
      page.getByText("No accounts registered.").first(),
    ).toBeVisible();
    await expect(page.getByText("Example account")).toHaveCount(0);
    expect(writes).toBe(2);
  });

import { test, expect } from "@playwright/test";
import { clientId, json } from "./fixtures";
import {
  installCurrentWatchlist,
  openCurrentWatchlist,
  watchlistIdentity,
} from "./watchlist-current-fixtures";

const savedPreferences = {
  triggers: ["newMatch"],
  materiality: "medium",
  emailEnabled: true,
  emailAddress: "current@example.test",
  emailCadence: "daily",
  smsEnabled: false,
  smsPhone: null,
  smsPhoneVerified: false,
  smsCadence: "realtime",
  quietHoursStart: null,
  quietHoursEnd: null,
};

for (const backend of ["core", "intelligence"] as const)
  test(`Configure opens only the explicit ${backend} personal preference owner`, async ({
    page,
  }) => {
    const fixture = await installCurrentWatchlist(page, backend);
    let reads = 0;
    const path =
      backend === "core"
        ? `intelligence/clients/${clientId}/tracker/alert-prefs`
        : `tracker/watchlists/${clientId}/alert-prefs`;
    await page.route(`**/api/backend/${backend}/${path}`, (route) => {
      expect(route.request().method()).toBe("GET");
      reads++;
      return json(
        route,
        backend === "core"
          ? savedPreferences
          : {
              ...savedPreferences,
              clientId,
              userId: watchlistIdentity.user.clerkUserId,
              tenantId: watchlistIdentity.tenant.id,
              jurisdictions: [],
            },
      );
    });
    const dialog = await openCurrentWatchlist(page, backend);
    await dialog
      .getByRole("button", { name: "My alert preferences", exact: true })
      .click();
    const personal = page.getByRole("dialog", {
      name: "My bill alerts",
      exact: true,
    });
    await expect(
      personal.getByLabel("Email address", { exact: true }),
    ).toHaveValue("current@example.test");
    expect(reads).toBe(1);
    expect(fixture.writes).toEqual([]);
    expect(fixture.unexpected).toEqual([]);
  });

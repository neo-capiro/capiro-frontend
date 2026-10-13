import { test, expect } from "@playwright/test";
import { clientId, json } from "./fixtures";
import {
  installCurrentWatchlist,
  watchlistDialog,
  settleWatchlist,
} from "./watchlist-current-fixtures";
import { installAlertChannels, openAlerts } from "./alert-channel-helpers";

test("Core client 404 keeps preferences visible and disabled with zero Intel calls", async ({
  page,
}) => {
  const fixture = await installCurrentWatchlist(page, "intelligence");
  const intel: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/backend/intelligence/"))
      intel.push(request.url());
  });
  await page.route(`**/api/backend/core/clients/${clientId}`, (route) =>
    json(route, { message: "Client not found" }, 404),
  );
  await page.goto("/watchlist-current.html?backend=intelligence");
  const entry = watchlistDialog(page).getByRole("button", {
    name: "My alert preferences",
    exact: true,
  });
  await expect(entry).toBeVisible();
  await expect(entry).toBeDisabled();
  await settleWatchlist(page);
  expect(intel).toEqual([]);
  expect(fixture.writes).toEqual([]);
});
test("requested phone-code copy matches Figma 1028:188442 without delivery claims", async ({
  page,
}) => {
  await installAlertChannels(page, "intelligence");
  const dialog = await openAlerts(page, "intelligence");
  await dialog
    .getByRole("button", { name: "Request verification code", exact: true })
    .click();
  const acknowledged = dialog.getByText(/Request acknowledged for/);
  await expect(acknowledged).toContainText(
    "Enter the code if it arrives. Confirming this phone enables SMS alerts.",
  );
  await expect(
    dialog.getByText(/Request a code for the saved phone number/),
  ).toHaveCount(0);
  await expect(dialog.getByText(/code sent|delivered/i)).toHaveCount(0);
});

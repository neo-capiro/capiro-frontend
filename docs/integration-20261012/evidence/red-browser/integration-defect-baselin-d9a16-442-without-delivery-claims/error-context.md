# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: integration-defect-baselines.spec.ts >> requested phone-code copy matches Figma 1028:188442 without delivery claims
- Location: tests/browser/integration-defect-baselines.spec.ts:19:1

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: getByRole('dialog', { name: 'My bill alerts', exact: true }).getByText(/Request acknowledged for/)
Expected substring: "Enter the code if it arrives. Confirming this phone enables SMS alerts."
Received string:    "Request acknowledged for ••• ••• 0123. Enter the code if it arrives."
Timeout: 5000ms

Call log:
  - Expect "toContainText" with timeout 5000ms
  - waiting for getByRole('dialog', { name: 'My bill alerts', exact: true }).getByText(/Request acknowledged for/)
    13 × locator resolved to <p role="status" class="_help_1b1ko_156">Request acknowledged for ••• ••• 0123. Enter the …</p>
       - unexpected value "Request acknowledged for ••• ••• 0123. Enter the code if it arrives."

```

```yaml
- status: Request acknowledged for ••• ••• 0123. Enter the code if it arrives.
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | import { clientId, json } from "./fixtures";
  3  | import { installCurrentWatchlist, watchlistDialog, settleWatchlist } from "./watchlist-current-fixtures";
  4  | import { installAlertChannels, openAlerts } from "./alert-channel-helpers";
  5  | 
  6  | test("Core client 404 keeps preferences visible and disabled with zero Intel calls", async ({ page }) => {
  7  |   const fixture = await installCurrentWatchlist(page, "intelligence");
  8  |   const intel: string[] = [];
  9  |   page.on("request", request => { if (request.url().includes("/api/backend/intelligence/")) intel.push(request.url()); });
  10 |   await page.route(`**/api/backend/core/clients/${clientId}`, route => json(route, { message: "Client not found" }, 404));
  11 |   await page.goto("/watchlist-current.html?backend=intelligence");
  12 |   const entry = watchlistDialog(page).getByRole("button", { name: "My alert preferences", exact: true });
  13 |   await expect(entry).toBeVisible();
  14 |   await expect(entry).toBeDisabled();
  15 |   await settleWatchlist(page);
  16 |   expect(intel).toEqual([]);
  17 |   expect(fixture.writes).toEqual([]);
  18 | });
  19 | test("requested phone-code copy matches Figma 1028:188442 without delivery claims", async ({ page }) => {
  20 |   await installAlertChannels(page, "intelligence");
  21 |   const dialog = await openAlerts(page, "intelligence");
  22 |   await dialog.getByRole("button", { name: "Request verification code", exact: true }).click();
  23 |   const acknowledged = dialog.getByText(/Request acknowledged for/);
> 24 |   await expect(acknowledged).toContainText("Enter the code if it arrives. Confirming this phone enables SMS alerts.");
     |                              ^ Error: expect(locator).toContainText(expected) failed
  25 |   await expect(dialog.getByText(/Request a code for the saved phone number/)).toHaveCount(0);
  26 |   await expect(dialog.getByText(/code sent|delivered/i)).toHaveCount(0);
  27 | });
  28 | 
```
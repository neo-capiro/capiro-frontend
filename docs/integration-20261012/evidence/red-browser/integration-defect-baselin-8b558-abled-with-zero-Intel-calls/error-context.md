# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: integration-defect-baselines.spec.ts >> Core client 404 keeps preferences visible and disabled with zero Intel calls
- Location: tests/browser/integration-defect-baselines.spec.ts:6:1

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 4

- Array []
+ Array [
+   "http://127.0.0.1:5191/api/backend/intelligence/tracker/issue-areas",
+   "http://127.0.0.1:5191/api/backend/intelligence/legiwatch/bills/corpus-metadata",
+ ]
```

# Page snapshot

```yaml
- generic:
  - generic:
    - main:
      - paragraph: Synthetic Watchlist checks. Service requests are intercepted.
      - status: "0"
  - dialog "Configure Bill Tracker" [ref=e2]:
    - banner [ref=e3]:
      - heading "Configure Bill Tracker" [level=2] [ref=e4]
      - button "Close" [active] [ref=e5] [cursor=pointer]:
        - img [ref=e6]
    - paragraph [ref=e9]: Shared client targeting. Changes take effect when you save; notification settings are separate.
    - generic [ref=e10]:
      - paragraph [ref=e11]: Choose your personal email and SMS preferences for this client.
      - button "My alert preferences" [disabled] [ref=e12]
    - status "Current data unavailable" [ref=e13]:
      - heading "Current data unavailable" [level=3] [ref=e14]
      - paragraph [ref=e15]: Your local edits are retained. Refresh the current client and targeting data before continuing.
      - button "Retry" [ref=e16] [cursor=pointer]
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
> 16 |   expect(intel).toEqual([]);
     |                 ^ Error: expect(received).toEqual(expected) // deep equality
  17 |   expect(fixture.writes).toEqual([]);
  18 | });
  19 | test("requested phone-code copy matches Figma 1028:188442 without delivery claims", async ({ page }) => {
  20 |   await installAlertChannels(page, "intelligence");
  21 |   const dialog = await openAlerts(page, "intelligence");
  22 |   await dialog.getByRole("button", { name: "Request verification code", exact: true }).click();
  23 |   const acknowledged = dialog.getByText(/Request acknowledged for/);
  24 |   await expect(acknowledged).toContainText("Enter the code if it arrives. Confirming this phone enables SMS alerts.");
  25 |   await expect(dialog.getByText(/Request a code for the saved phone number/)).toHaveCount(0);
  26 |   await expect(dialog.getByText(/code sent|delivered/i)).toHaveCount(0);
  27 | });
  28 | 
```
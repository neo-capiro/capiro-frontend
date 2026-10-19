# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: review-billing-route.spec.ts >> Manage billing uses canonical local Settings
- Location: tests/browser/review-billing-route.spec.ts:4:1

# Error details

```
Error: expect(locator).toHaveAttribute(expected) failed

Locator:  getByRole('dialog', { name: 'Add profile', exact: true }).getByRole('group', { name: 'Current plan and usage' }).getByRole('link', { name: 'Manage billing' })
Expected: "/settings/billing"
Received: "http://127.0.0.1:5191/existing/settings/billing"
Timeout:  5000ms

Call log:
  - Expect "toHaveAttribute" with timeout 5000ms
  - waiting for getByRole('dialog', { name: 'Add profile', exact: true }).getByRole('group', { name: 'Current plan and usage' }).getByRole('link', { name: 'Manage billing' })
    14 × locator resolved to <a class="_manageLink_14nkp_74" href="http://127.0.0.1:5191/existing/settings/billing">Manage billing</a>
       - unexpected value "http://127.0.0.1:5191/existing/settings/billing"

```

```yaml
- link "Manage billing":
  - /url: http://127.0.0.1:5191/existing/settings/billing
```

# Test source

```ts
  1  | import { expect, test } from "@playwright/test";
  2  | import { installFixtures, json } from "./fixtures";
  3  | 
  4  | test("Manage billing uses canonical local Settings", async ({ page }) => {
  5  |   await installFixtures(page);
  6  |   await page.route("**/api/backend/core/me", route => json(route, {
  7  |     user: { id: "billing-reader", email: "synthetic@example.test" },
  8  |     tenant: { id: "billing-tenant", name: "Synthetic billing tenant" },
  9  |     role: "user_admin", billingAdmin: true,
  10 |   }));
  11 |   await page.route("**/api/backend/core/billing/summary", route => json(route, {
  12 |     billingEnabled: true, status: "active", slots: 14, usedSlots: 12,
  13 |     pricePerSlotUsd: 217, llmAllowanceUsd: 11.25, llmUsedUsd: 9.34,
  14 |     llmOverageUsd: 1.19, llmWarn: false, llmHardCapUsd: null,
  15 |     currentPeriodEnd: "2026-11-01T00:00:00Z", hasSubscription: true,
  16 |   }));
  17 |   await page.goto("/portfolio");
  18 |   await page.getByRole("button", { name: "Add profile", exact: true })
  19 |     .first().click();
  20 |   const dialog = page.getByRole("dialog", { name: "Add profile", exact: true });
  21 |   const panel = dialog.getByRole("group", { name: "Current plan and usage" });
  22 |   await panel.locator("summary").click();
  23 |   await expect(panel.getByText("12 active profiles")).toBeVisible();
  24 |   await expect(panel.getByRole("link", { name: "Manage billing" }))
> 25 |     .toHaveAttribute("href", "/settings/billing");
     |      ^ Error: expect(locator).toHaveAttribute(expected) failed
  26 | });
  27 | 
```
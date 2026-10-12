import { expect, test } from "@playwright/test";
import { installFixtures, json } from "./fixtures";

test("Manage billing uses canonical local Settings", async ({ page }) => {
  await installFixtures(page);
  await page.route("**/api/backend/core/me", (route) =>
    json(route, {
      user: { id: "billing-reader", email: "synthetic@example.test" },
      tenant: { id: "billing-tenant", name: "Synthetic billing tenant" },
      role: "user_admin",
      billingAdmin: true,
    }),
  );
  await page.route("**/api/backend/core/billing/summary", (route) =>
    json(route, {
      billingEnabled: true,
      status: "active",
      slots: 14,
      usedSlots: 12,
      pricePerSlotUsd: 217,
      llmAllowanceUsd: 11.25,
      llmUsedUsd: 9.34,
      llmOverageUsd: 1.19,
      llmWarn: false,
      llmHardCapUsd: null,
      currentPeriodEnd: "2026-11-01T00:00:00Z",
      hasSubscription: true,
    }),
  );
  await page.goto("/portfolio");
  await page
    .getByRole("button", { name: "Add profile", exact: true })
    .first()
    .click();
  const dialog = page.getByRole("dialog", { name: "Add profile", exact: true });
  const panel = dialog.getByRole("group", { name: "Current plan and usage" });
  await panel.locator("summary").click();
  await expect(panel.getByText("12 active profiles")).toBeVisible();
  await expect(
    panel.getByRole("link", { name: "Manage billing" }),
  ).toHaveAttribute("href", "/settings/billing");
});

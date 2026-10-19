import { expect } from "@playwright/test";
import { test } from "./runtime-observed-test";
import { setup } from "./next-modules-fixtures";
import { moduleRouteFixtures } from "./module-route-fixtures";
for (const status of [403, 503]) {
  test(`catalog ${status} exposes explicit held retry while independent Engagement reads remain usable`, async ({
    page,
  }) => {
    await setup(page, moduleRouteFixtures);
    let reads = 0,
      release!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route("**/api/capiro/clients.list**", async (route) => {
      reads++;
      if (reads === 1)
        return route.fulfill({
          status,
          json: { message: "Synthetic client catalog refusal" },
        });
      await held;
      return route.fulfill({
        json: [
          {
            id: "30000000-0000-4000-8000-000000000001",
            name: "Synthetic recovered client",
            status: "ACTIVE",
            profileStatus: "ACTIVE",
          },
        ],
      });
    });
    await page.goto("/modules/engagement");
    const scope = page.getByRole("combobox", {
      name: "Engagement client scope",
    });
    await expect(page.getByRole("alert")).toContainText(
      "Synthetic client catalog refusal",
    );
    await expect(scope).toBeDisabled();
    await expect(page.getByLabel("Search outreach")).toBeVisible();
    const retry = page.getByRole("button", {
      name: "Retry client scopes",
      exact: true,
    });
    await retry.focus();
    await page.keyboard.press("Enter");
    try {
      await expect.poll(() => reads).toBe(2);
      await expect(scope).toBeDisabled();
      await expect(page.getByRole("status")).toContainText(
        "Loading client scopes",
      );
      await expect(page.getByLabel("Search outreach")).toBeVisible();
    } finally {
      release();
    }
    await expect(scope).toBeEnabled();
    await expect(scope.locator("option")).toHaveCount(2);
    await expect(
      page.getByText("Synthetic client catalog refusal"),
    ).toHaveCount(0);
    await scope.selectOption("30000000-0000-4000-8000-000000000001");
    await expect(page).toHaveURL(
      /clientId=30000000-0000-4000-8000-000000000001/,
    );
    await expect(page.getByLabel("Search outreach")).toBeVisible();
  });
}

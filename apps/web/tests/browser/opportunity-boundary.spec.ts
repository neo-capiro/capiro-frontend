import { test, expect } from "@playwright/test";
import { clientId, installFixtures, json } from "./fixtures";

for (const status of [403, 503]) {
  test(`failed opportunity refresh removes cached results, counts and links while programs remain (HTTP ${status})`, async ({
    page,
  }) => {
    const unexpected = await installFixtures(page);
    await page.goto(`/portfolio/${clientId}/opportunities`);
    const matched = page.getByRole("region", { name: "Matched opportunities" });
    await expect(
      matched.getByRole("link", { name: "Test opportunity", exact: true }),
    ).toBeVisible();
    await page.route(
      "**/core/intelligence/opportunities/v2/search?*",
      (route) =>
        json(route, { message: "Synthetic matched feed unavailable" }, status),
    );
    await page.getByRole("button", { name: "Refresh", exact: true }).click();
    await expect(matched.getByRole("alert")).toBeVisible();
    await expect(matched.getByRole("link")).toHaveCount(0);
    await expect(
      matched.getByRole("button", { name: "Next", exact: true }),
    ).toHaveCount(0);
    await expect(
      page
        .getByRole("region", { name: "Opportunity summary" })
        .getByText("Active matched opportunities")
        .locator("..")
        .locator("strong"),
    ).toHaveText("Unavailable");
    await expect(page.getByRole("link", { name: "Open PE →" })).toBeVisible();
    await page.unroute("**/core/intelligence/opportunities/v2/search?*");
    await matched.getByRole("button", { name: "Retry", exact: true }).click();
    await expect(
      matched.getByRole("link", { name: "Test opportunity", exact: true }),
    ).toBeVisible();
    await expect(matched.getByRole("alert")).toHaveCount(0);
    expect(unexpected).toEqual([]);
  });

  test(`failed program refresh removes cached programs and count while opportunities remain (HTTP ${status})`, async ({
    page,
  }) => {
    const unexpected = await installFixtures(page);
    await page.goto(`/portfolio/${clientId}/opportunities`);
    const programs = page.getByRole("region", {
      name: "Relevant budget programs",
    });
    await expect(
      programs.getByRole("link", { name: "Open PE →" }),
    ).toBeVisible();
    await page.route(
      `**/core/intelligence/clients/${clientId}/pe-relevance?*`,
      (route) =>
        json(route, { message: "Synthetic program feed unavailable" }, status),
    );
    await page.getByRole("button", { name: "Refresh", exact: true }).click();
    await expect(programs.getByRole("alert")).toBeVisible();
    await expect(programs.getByRole("link")).toHaveCount(0);
    await expect(programs.getByText("Synthetic test program")).toHaveCount(0);
    await expect(
      page
        .getByRole("region", { name: "Opportunity summary" })
        .getByText("Programs shown")
        .locator("..")
        .locator("strong"),
    ).toHaveText("Unavailable");
    await expect(
      page.getByRole("link", { name: "Test opportunity", exact: true }),
    ).toBeVisible();
    await page.unroute(
      `**/core/intelligence/clients/${clientId}/pe-relevance?*`,
    );
    await programs.getByRole("button", { name: "Retry", exact: true }).click();
    await expect(
      programs.getByRole("link", { name: "Open PE →" }),
    ).toBeVisible();
    await expect(programs.getByRole("alert")).toHaveCount(0);
    expect(unexpected).toEqual([]);
  });
}

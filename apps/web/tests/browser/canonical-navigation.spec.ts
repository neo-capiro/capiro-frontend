import { test, expect } from "@playwright/test";
import { installFixtures } from "./fixtures";

for (const path of ["/", "/portfolio"]) {
  test(`Portfolio current navigation follows ${path} and its client filter through history`, async ({
    page,
  }) => {
    const unexpected = await installFixtures(page);
    await page.goto(path);
    const navigation = page.getByRole("navigation", {
      name: "Portfolio",
      exact: true,
    });
    const overview = navigation.getByRole("link", {
      name: "Portfolio Overview",
      exact: true,
    });
    const clients = navigation.getByRole("link", {
      name: "Portfolio Clients",
      exact: true,
    });
    await expect(overview).toHaveAttribute("aria-current", "page");
    await expect(navigation.locator('[aria-current="page"]')).toHaveCount(1);
    await page.goto(`${path}?type=CLIENT`);
    await expect(clients).toHaveAttribute("aria-current", "page");
    await expect(overview).not.toHaveAttribute("aria-current", "page");
    await expect(navigation.locator('[aria-current="page"]')).toHaveCount(1);
    await page.goBack();
    await expect(overview).toHaveAttribute("aria-current", "page");
    await page.goForward();
    await expect(clients).toHaveAttribute("aria-current", "page");
    expect(unexpected).toEqual([]);
  });
}

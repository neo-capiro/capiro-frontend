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
    const prospects = navigation.getByRole("link", {
      name: "Portfolio Prospects",
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
    await expect(prospects).toHaveAttribute("href", "/portfolio?type=PROSPECT");
    await prospects.click();
    await expect(page).toHaveURL("/portfolio?type=PROSPECT");
    await expect(prospects).toHaveAttribute("aria-current", "page");
    await expect(navigation.locator('[aria-current="page"]')).toHaveCount(1);
    const typeNavigation = page.getByRole("navigation", {
      name: "Profile type",
    });
    const bdList = typeNavigation.getByRole("link", {
      name: "Business Development list",
    });
    await expect(bdList).toBeVisible();
    const pipelineY = (
      await typeNavigation.getByRole("link", { name: "Pipeline" }).boundingBox()
    )?.y;
    expect((await bdList.boundingBox())?.y).toBe(pipelineY);
    const objectiveY = (
      await typeNavigation
        .getByRole("button", { name: "New objective" })
        .boundingBox()
    )?.y;
    expect(Math.abs((objectiveY ?? 0) - (pipelineY ?? 0))).toBeLessThanOrEqual(
      2,
    );
    await bdList.click();
    await expect(page).toHaveURL("/portfolio/prospects");
    await expect(
      page.getByRole("textbox", { name: "Search prospects" }),
    ).toBeVisible();
    await expect(prospects).not.toHaveAttribute("aria-current", "page");
    expect(unexpected).toEqual([]);
  });
}

import { test, expect } from "@playwright/test";
import { operationFixtures, onlyLocalRequests } from "./fixtures";
import { moduleRouteFixtures } from "./module-route-fixtures";

const routes = [
  { slug: "engagement", heading: "Engagement" },
  { slug: "planner", heading: "Planner" },
  { slug: "calendar", heading: "Master calendar" },
  { slug: "workspace", heading: "Workspace" },
  { slug: "strategies", heading: "Strategies" },
  { slug: "directory", heading: "Directory" },
  { slug: "intelligence", heading: "Intelligence Center" },
  { slug: "research-portfolios", heading: "Research Portfolios" },
];
for (const { slug, heading } of routes)
  test(`${heading} primary route renders through the canonical session/API boundary`, async ({
    page,
  }) => {
    const failures: string[] = [];
    page.on("pageerror", (error) => failures.push(error.message));
    page.on("response", (response) => {
      if (response.url().includes("/api/capiro/") && !response.ok())
        failures.push(
          `${response.status()}:${new URL(response.url()).pathname}`,
        );
    });
    await onlyLocalRequests(page);
    await operationFixtures(page, moduleRouteFixtures);
    await page.goto(`/modules/${slug}`);
    await expect(
      page.getByRole("heading", { name: heading, exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("main")).not.toContainText("Loading…");
    await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
    expect(failures).toEqual([]);
    await page.screenshot({
      path: `test-results/module-${slug}.png`,
      fullPage: true,
      animations: "disabled",
    });
  });

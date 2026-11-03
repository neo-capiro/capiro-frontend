import { test, expect } from "@playwright/test";
import { installFixtures, json, clientId, opportunitySearch } from "./fixtures";

test("portfolio distinguishes an incomplete DIBBS initial sync from an overdue SBIR update", async ({
  page,
}) => {
  const unexpected = await installFixtures(page);
  await page.route("**/core/intelligence/opportunities/v2/search?*", (route) =>
    json(route, {
      ...opportunitySearch,
      catalogComplete: false,
      counts: { active: null, grants: null, contracts: null, closed: null },
      freshness: [
        {
          source: "dibbs",
          state: "initial_partial",
          lastSyncedAt: null,
          lastSuccessAt: null,
          latestAttemptAt: "2026-11-03T09:00:00Z",
        },
        {
          source: "sbir_sttr",
          state: "stale",
          lastSyncedAt: "2026-10-22T01:21:16.466Z",
          lastSuccessAt: "2026-10-22T01:21:16.466Z",
          latestAttemptAt: "2026-11-03T09:00:00Z",
        },
      ],
    }),
  );
  await page.goto(`/portfolio/${clientId}/opportunities`);
  await page.getByText("Source status", { exact: true }).click();
  const health = page.locator("details").filter({ hasText: "Source status" });
  await expect(health).toContainText(
    "DIBBS · Initial sync incomplete · No successful update yet",
  );
  await expect(health).toContainText(
    "SBIR/STTR · Update overdue · Last successful update Oct 22, 2026, 01:21 UTC",
  );
  await expect(health).toContainText("Latest attempt Nov 03, 2026, 09:00 UTC");
  await expect(page.getByRole("status")).toContainText(
    "Some catalogs are incomplete",
  );
  expect(unexpected).toEqual([]);
  await page.screenshot({
    path: "test-results/portfolio-source-coverage.png",
    fullPage: true,
  });
});

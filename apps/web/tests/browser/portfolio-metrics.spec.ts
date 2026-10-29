import { expect, test, type Page } from "@playwright/test";
import { installFixtures, json } from "./fixtures";
import {
  portfolioMetricsFixture,
  portfolioTenantId,
} from "../portfolio-metrics-fixture";
async function setup(page: Page) {
  const unexpected = await installFixtures(page);
  await page.route("**/core/me", (route) =>
    json(route, {
      user: {
        id: "20000000-0000-4000-8000-000000000001",
        email: "synthetic@example.invalid",
      },
      tenant: { id: portfolioTenantId, name: "Synthetic" },
      role: "standard_user",
    }),
  );
  return unexpected;
}
const pulse = (page: Page) =>
  page.getByRole("region", { name: "Portfolio pulse", exact: true });
test("counts the full population independently of one displayed client and explains each metric", async ({
  page,
}) => {
  const unexpected = await setup(page);
  await page.route("**/core/clients/metrics", (route) =>
    json(route, portfolioMetricsFixture()),
  );
  await page.goto("/portfolio");
  for (const name of [
    "Active clients: 60",
    "Objectives: 62",
    "Awaiting review: 2",
    "Overdue CRM: 8",
    "CRM activity · 30d: 612",
  ])
    await expect(
      pulse(page).getByRole("group", { name, exact: true }),
    ).toBeVisible();
  await expect(pulse(page).getByText("50%", { exact: true })).toBeVisible();
  await pulse(page).getByText("Metric definitions and coverage").click();
  await expect(pulse(page)).toContainText(
    "strictly before the snapshot in UTC",
  );
  await expect(pulse(page)).toContainText("not the displayed page");
  expect(unexpected).toEqual([]);
});
test("partial sources preserve true zeros and empty coverage has no percentage", async ({
  page,
}) => {
  const unexpected = await setup(page),
    fixture = portfolioMetricsFixture();
  fixture.clients = { status: "unavailable" };
  fixture.objectives = {
    status: "available",
    coverage: "complete",
    counts: { objectives: 0, awaitingReview: 0, ready: 0 },
  };
  fixture.billWatch = {
    status: "available",
    coverage: "complete",
    counts: {
      activeClients: 0,
      clientsWithWatches: 0,
      clientBillWatches: 0,
      distinctBills: 0,
    },
  };
  await page.route("**/core/clients/metrics", (route) => json(route, fixture));
  await page.goto("/portfolio");
  await expect(
    pulse(page).getByRole("group", {
      name: "Active clients: Unavailable",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    pulse(page).getByRole("group", { name: "Objectives: 0", exact: true }),
  ).toBeVisible();
  await expect(pulse(page)).toContainText("Some sources unavailable");
  await expect(pulse(page)).toContainText("no eligible clients");
  await expect(pulse(page).getByText("0%", { exact: true })).toHaveCount(0);
  expect(unexpected).toEqual([]);
});
test("labels stale snapshots and removes previous counts after access loss", async ({
  page,
}) => {
  const unexpected = await setup(page);
  let revoked = false;
  await page.route("**/core/clients/metrics", (route) =>
    revoked
      ? json(route, { message: "Access denied" }, 403)
      : json(route, portfolioMetricsFixture(Date.now() - 180000)),
  );
  await page.goto("/portfolio");
  await expect(pulse(page)).toContainText("Stale snapshot");
  await expect(
    pulse(page).getByRole("group", { name: "Active clients: 60", exact: true }),
  ).toBeVisible();
  revoked = true;
  await pulse(page).getByRole("button", { name: "Refresh metrics" }).click();
  await expect(pulse(page)).toContainText("Portfolio metrics unavailable.");
  await expect(pulse(page).getByText("60", { exact: true })).toHaveCount(0);
  expect(unexpected).toEqual([]);
});
test("rejects another tenant's metrics and refresh recovers the current account", async ({
  page,
}) => {
  const unexpected = await setup(page);
  let foreign = true;
  await page.route("**/core/clients/metrics", (route) =>
    json(route, {
      ...portfolioMetricsFixture(),
      tenantId: foreign
        ? "40000000-0000-4000-8000-000000000001"
        : portfolioTenantId,
    }),
  );
  await page.goto("/portfolio");
  await expect(pulse(page)).toContainText("Portfolio metrics unavailable.");
  foreign = false;
  await pulse(page).getByRole("button", { name: "Refresh metrics" }).click();
  await expect(
    pulse(page).getByRole("group", { name: "Active clients: 60", exact: true }),
  ).toBeVisible();
  expect(unexpected).toEqual([]);
});
test("keeps counts and refresh usable on a narrow screen", async ({ page }) => {
  const unexpected = await setup(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/core/clients/metrics", (route) =>
    json(route, portfolioMetricsFixture()),
  );
  await page.goto("/portfolio");
  await expect(
    pulse(page).getByRole("group", { name: "Active clients: 60", exact: true }),
  ).toBeVisible();
  await expect(
    pulse(page).getByRole("button", { name: "Refresh metrics" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  expect(unexpected).toEqual([]);
});

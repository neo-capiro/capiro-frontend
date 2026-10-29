import { expect, test, type Page } from "@playwright/test";
import { installFixtures, clientId, json } from "./fixtures";
import {
  activityMetricsFixture,
  metricsTenantId,
} from "../activity-metrics-fixture";

async function setup(page: Page) {
  const unexpected = await installFixtures(page);
  await page.route("**/core/me", (route) =>
    json(route, {
      user: {
        id: "20000000-0000-4000-8000-000000000001",
        email: "synthetic@example.invalid",
      },
      tenant: { id: metricsTenantId, name: "Synthetic" },
      role: "standard_user",
    }),
  );
  return unexpected;
}
const pulse = (page: Page) =>
  page.getByRole("region", { name: "Engagement pulse", exact: true });
test("full server counts and definitions are independent of a failed timeline page", async ({
  page,
}) => {
  const unexpected = await setup(page);
  await page.route(`**/clients/${clientId}/activity?*`, (route) =>
    json(route, { message: "Timeline unavailable" }, 503),
  );
  await page.route(`**/clients/${clientId}/activity/metrics`, (route) =>
    json(route, activityMetricsFixture()),
  );
  await page.goto(`/portfolio/${clientId}`);
  await expect(pulse(page).getByText("612", { exact: true })).toBeVisible();
  await expect(pulse(page).getByText("8", { exact: true })).toBeVisible();
  await expect(pulse(page).getByText("3", { exact: true })).toBeVisible();
  await expect(pulse(page)).toContainText("last 30 days · UTC");
  await expect(pulse(page)).toContainText(
    "Meetings, mail and Planner work are excluded",
  );
  await expect(
    page
      .getByRole("region", { name: "Deadline stress and requests" })
      .getByText("2", { exact: true }),
  ).toBeVisible();
  expect(unexpected).toEqual([]);
});
test("unavailable counts do not become zero; explicit retry reads real zeros", async ({
  page,
}) => {
  const unexpected = await setup(page);
  let unavailable = true;
  await page.route(`**/clients/${clientId}/activity/metrics`, (route) => {
    const fixture = activityMetricsFixture();
    fixture.counts = {
      recordedActivities: 0,
      openRequests: 0,
      overdueRequests: 0,
      openCommitments: 0,
      overdueCommitments: 0,
    };
    return unavailable
      ? json(route, { message: "Unavailable" }, 503)
      : json(route, fixture);
  });
  await page.goto(`/portfolio/${clientId}`);
  await expect(
    pulse(page).getByText("Counts unavailable.", { exact: false }),
  ).toBeVisible();
  await expect(pulse(page).getByText("—", { exact: true })).toHaveCount(3);
  unavailable = false;
  await pulse(page).getByRole("button", { name: "Retry counts" }).click();
  await expect(
    pulse(page).locator("strong").filter({ hasText: /^0$/ }),
  ).toHaveCount(4);
  expect(unexpected).toEqual([]);
});
test("stale counts are labelled and refresh uses a new observation", async ({
  page,
}) => {
  const unexpected = await setup(page);
  let stale = true;
  await page.route(`**/clients/${clientId}/activity/metrics`, (route) =>
    json(route, activityMetricsFixture(Date.now() - (stale ? 180000 : 0))),
  );
  await page.goto(`/portfolio/${clientId}`);
  await expect(pulse(page)).toContainText("Stale counts");
  stale = false;
  await pulse(page).getByRole("button", { name: "Refresh counts" }).click();
  await expect(pulse(page)).not.toContainText("Stale counts");
  expect(unexpected).toEqual([]);
});
test("a foreign aggregate is unavailable while the permitted profile stays visible", async ({
  page,
}) => {
  const unexpected = await setup(page);
  await page.route(`**/clients/${clientId}/activity/metrics`, (route) =>
    json(route, {
      ...activityMetricsFixture(),
      tenantId: "40000000-0000-4000-8000-000000000001",
    }),
  );
  await page.goto(`/portfolio/${clientId}`);
  await expect(pulse(page)).toContainText("Counts unavailable.");
  await expect(pulse(page).getByText("612", { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "Client identity" }),
  ).toBeVisible();
  expect(unexpected).toEqual([]);
});

test("access loss on refresh hides previously visible counts", async ({
  page,
}) => {
  const unexpected = await setup(page);
  let revoked = false;
  await page.route(`**/clients/${clientId}/activity/metrics`, (route) =>
    revoked
      ? json(route, { message: "Access denied" }, 403)
      : json(route, activityMetricsFixture(Date.now() - 180000)),
  );
  await page.goto(`/portfolio/${clientId}`);
  await expect(pulse(page).getByText("612", { exact: true })).toBeVisible();
  revoked = true;
  await pulse(page).getByRole("button", { name: "Refresh counts" }).click();
  await expect(pulse(page)).toContainText("Counts unavailable.");
  await expect(pulse(page).getByText("612", { exact: true })).toHaveCount(0);
  expect(unexpected).toEqual([]);
});

test("count definitions and controls remain usable on a narrow screen", async ({
  page,
}) => {
  const unexpected = await setup(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route(`**/clients/${clientId}/activity/metrics`, (route) =>
    json(route, activityMetricsFixture()),
  );
  await page.goto(`/portfolio/${clientId}`);
  await expect(pulse(page).getByText("612", { exact: true })).toBeVisible();
  const box = await pulse(page).boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  expect(unexpected).toEqual([]);
});

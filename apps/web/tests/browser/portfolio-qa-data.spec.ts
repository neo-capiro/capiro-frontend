import { test, expect } from "@playwright/test";
import { client, clientId, json } from "./fixtures";
import { layoutActor, layoutReceipt } from "./portfolio-layout-fixtures";
import { deferred, qaFixtures } from "./portfolio-qa-fixtures";

test("pending profile capacity reports checking and enables manual entry after the read", async ({
  page,
}, info) => {
  const unexpected = await qaFixtures(page);
  const held = deferred();
  await page.route("**/core/billing/state", async (route) => {
    await held.promise;
    return json(route, {
      billingEnabled: true,
      status: "active",
      slots: 12,
      usedSlots: 11,
      locked: false,
      trialEndsAt: null,
      onboardingFlowVersion: 1,
    });
  });
  await page.goto("/portfolio");
  await page
    .getByRole("button", { name: "Add profile", exact: true })
    .first()
    .click();
  const dialog = page.getByRole("dialog", { name: "Add profile", exact: true });
  await expect(
    dialog.getByText("Checking profile capacity…", { exact: true }),
  ).toBeVisible();
  await expect(dialog).not.toContainText("Your plan does not allow");
  await expect(
    dialog.getByRole("button", { name: /Manual entry/ }),
  ).toBeDisabled();
  await dialog.screenshot({
    path: info.outputPath("profile-capacity-checking.png"),
  });
  held.release();
  await expect(
    dialog.getByRole("button", { name: /Manual entry/ }),
  ).toBeEnabled();
  await expect(dialog).toContainText("11 of 12 client slots");
  expect(unexpected).toEqual([]);
});

test("first Customize reads the saved order without a false permission failure or retry", async ({
  page,
}) => {
  const unexpected = await qaFixtures(page);
  const secondId = "10000000-0000-4000-8000-000000000002";
  await page.route("**/core/me", (route) =>
    json(route, {
      user: { id: layoutActor.userId, email: "synthetic@example.test" },
      tenant: { id: layoutActor.tenantId, name: "Synthetic tenant" },
      role: "standard_user",
    }),
  );
  await page.route("**/core/clients", (route) =>
    json(route, [
      client,
      { ...client, id: secondId, name: "Second synthetic client" },
    ]),
  );
  const held = deferred();
  let reads = 0;
  await page.route("**/core/me/portfolio-layout", async (route) => {
    reads++;
    await held.promise;
    return json(route, layoutReceipt(1, [clientId, secondId]));
  });
  await page.goto("/portfolio");
  await page.getByRole("button", { name: "Customize", exact: true }).click();
  await expect.poll(() => reads).toBe(1);
  await expect(page.getByRole("main")).not.toContainText(
    "Your current session cannot change",
  );
  await expect(page.getByRole("main")).not.toContainText(
    "do not have permission",
  );
  held.release();
  await expect(
    page.getByRole("button", {
      name: "Move Test Aerospace later",
      exact: true,
    }),
  ).toBeEnabled();
  expect(reads).toBe(1);
  expect(unexpected).toEqual([]);
});

test("prospect context hides client actions and an All search omits empty client tables", async ({
  page,
}, info) => {
  const unexpected = await qaFixtures(page);
  const pulse = page.getByRole("region", {
    name: "Portfolio pulse",
    exact: true,
  });
  for (const path of [
    "/portfolio?view=list",
    "/portfolio?type=CLIENT&view=list",
  ]) {
    await page.goto(path);
    await expect(pulse).toBeVisible();
  }
  await page.goto("/portfolio?type=PROSPECT&view=list");
  await expect(page.getByLabel("Search profiles")).toHaveAttribute(
    "placeholder",
    "Search profiles",
  );
  for (const name of ["Customize", "New objective"])
    await expect(page.getByRole("button", { name, exact: true })).toHaveCount(
      0,
    );
  await expect(pulse).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Needs attention" }),
  ).toHaveCount(0);
  await page.screenshot({
    path: info.outputPath("prospect-context-desktop.png"),
  });
  await page.goto("/portfolio?view=list&q=Test+Prospect");
  await expect(
    page.getByRole("table", { name: "Portfolio profiles" }),
  ).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Test Prospect/ })).toBeVisible();
  await page.goto("/portfolio?type=CLIENT&view=list");
  const row = page
    .getByRole("table", { name: "Portfolio profiles" })
    .getByRole("row")
    .nth(1);
  await expect(row.getByRole("cell").nth(1)).toHaveText("Client");
  expect(unexpected).toEqual([]);
});

test.describe("civil legislative dates", () => {
  test.use({ timezoneId: "America/Los_Angeles" });
  test("table and detail preserve the September 17 action day west of UTC", async ({
    page,
  }) => {
    const unexpected = await qaFixtures(page);
    await page.route(
      `**/intelligence/clients/${clientId}/tracker/board*`,
      (route) =>
        json(route, {
          columns: [
            {
              id: "committee",
              label: "In committee",
              cards: [
                {
                  billId: "tx-2025-hb1",
                  displayNum: "HB 1",
                  title: "Synthetic date-only measure",
                  stage: "committee",
                  passageProbability: 0.17,
                  matchedTags: [],
                  changeChip: null,
                  terminalRisk: false,
                  unread: false,
                  hearingCount: 0,
                  lastHearingSessionId: null,
                  canonicalStatus: "In committee",
                  latestActionText: "Referred to committee",
                  latestActionDate: "2025-09-17",
                  jurisdiction: "TX",
                },
              ],
            },
          ],
          total: 1,
          nextCursor: null,
          hasMore: false,
          withheld: 0,
        }),
    );
    await page.goto(`/portfolio/${clientId}/bills`);
    const row = page
      .getByRole("row")
      .filter({ hasText: "Synthetic date-only measure" });
    await expect(row).toContainText("Sep 17, 2025");
    await row.getByRole("button", { name: "HB 1", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "HB 1", exact: true });
    await expect(dialog.locator('time[datetime="2025-09-17"]')).toHaveText(
      "Sep 17, 2025",
    );
    expect(unexpected).toEqual([]);
  });
});

test("capability fit reserves zero for a confirmed computed empty result", async ({
  page,
}) => {
  const unexpected = await qaFixtures(page);
  let computed = false;
  const fit = () => ({
    status: computed ? "empty" : "not_computed",
    computedAt: computed ? "2026-11-04T12:00:00Z" : null,
    matches: [],
  });
  await page.route(`**/core/clients/${clientId}/capability-fit`, (route) =>
    json(route, fit()),
  );
  await page.route(
    `**/core/clients/${clientId}/capability-fit/refresh`,
    (route) => {
      computed = true;
      return json(route, fit());
    },
  );
  await page.goto(`/portfolio/${clientId}/capabilities`);
  const region = page.getByRole("region", {
    name: "Capability fit",
    exact: true,
  });
  await expect(region.locator("summary")).toHaveText("Not scored");
  await expect(region).not.toContainText("0 fit matches");
  await region.getByRole("button", { name: "Refresh", exact: true }).click();
  await expect(region.locator("summary")).toHaveText("0 fit matches available");
  await region.locator("summary").click();
  await expect(region).toContainText("Computed");
  expect(unexpected).toEqual([]);
});

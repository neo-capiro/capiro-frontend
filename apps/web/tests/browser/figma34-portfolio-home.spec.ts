import { expect, test, type Page } from "@playwright/test";
import { client, installFixtures, json, prospect } from "./fixtures";

const actor = {
  tenantId: "20000000-0000-4000-8000-000000000001",
  userId: "30000000-0000-4000-8000-000000000001",
};
const member = {
  id: actor.userId,
  firstName: "Jordan",
  lastName: "Carter",
  email: "jordan@example.test",
};
const clientNames = [
  ["Anduril", "Defense technology", "Costa Mesa", "CA"],
  ["Hidden Level", "Passive RF sensing", "Syracuse", "NY"],
  ["Firestorm Labs", "Expeditionary manufacturing", "San Diego", "CA"],
  ["Castelion", "Hypersonics", "El Segundo", "CA"],
  ["Regent Craft", "Seagliders", "North Kingstown", "RI"],
  ["Shield AI", "Autonomy", "San Diego", "CA"],
  ["Applied Intuition", "Vehicle software", "Mountain View", "CA"],
  ["Overland AI", "Ground autonomy", "Seattle", "WA"],
] as const;
const clients = clientNames.map(([name, sectorTag, city, state], index) => ({
  ...client,
  id: `10000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
  name,
  sectorTag,
  intakeData: { city, state },
}));
const prospectNames = [
  ["Northline Robotics", "Ground autonomy", "Pittsburgh, PA"],
  ["Halcyon Space", "Space sensing", "Boulder, CO"],
  ["Mariner Systems", "Maritime systems", "Norfolk, VA"],
  ["Cedar Research", "Defense research", "Arlington, VA"],
  ["Aster Labs", "Sensors", "Austin, TX"],
  ["Beacon Works", "Manufacturing", "Denver, CO"],
] as const;
const prospects = prospectNames.map(
  ([displayName, serviceHypothesis, geography], index) => ({
    ...prospect,
    id: `70000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    displayName,
    serviceHypothesis,
    geography,
    ownerUserId: actor.userId,
    stage: "identified",
    status: "active",
    linkedClientId: null,
  }),
);

async function homeFixtures(page: Page, prospectFailure = false) {
  const unexpected = await installFixtures(page);
  await page.route("**/api/backend/core/me", (route) =>
    json(route, {
      user: { ...member, email: member.email },
      tenant: { id: actor.tenantId, name: "Synthetic tenant" },
      role: "user_admin",
    }),
  );
  await page.route("**/api/backend/core/clients", (route) =>
    json(route, clients),
  );
  await page.route("**/api/backend/core/client-account-owners", (route) =>
    json(
      route,
      Object.fromEntries(
        clients.map(({ id }) => [
          id,
          { accountOwnerUserId: actor.userId, accountOwner: member },
        ]),
      ),
    ),
  );
  await page.route(
    "**/api/backend/core/client-account-owners/options",
    (route) => json(route, [member]),
  );
  await page.route("**/api/backend/core/me/portfolio-layout", (route) =>
    json(route, {
      contractVersion: 1,
      ...actor,
      version: 0,
      updatedAt: null,
      order: clients.map(({ id }) => `client:${id}`),
    }),
  );
  await page.route(
    "**/api/backend/core/business-development/prospects?*",
    (route) =>
      prospectFailure
        ? json(route, { message: "Synthetic prospect read unavailable" }, 503)
        : json(route, {
            prospects,
            counts: {
              visible: prospects.length,
              total: prospects.length,
              active: prospects.length,
              dismissed: 0,
              byStage: { identified: prospects.length },
            },
          }),
  );
  await page.route(
    "**/api/backend/core/intelligence/portfolio-alerts?*",
    (route) =>
      json(route, {
        alerts: Array.from({ length: 9 }, (_, index) => {
          const linked = clients[index % clients.length]!;
          return {
            id: `${linked.id}:synthetic:${index}`,
            clientId: linked.id,
            clientName: linked.name,
            type: "comment_deadline",
            severity: index === 0 ? "critical" : "notable",
            title: `Synthetic client update ${index + 1} needs review`,
            subtitle: "Synthetic source detail",
            when: "2026-10-20T12:00:00Z",
            countdownDays: 2,
            countdownLabel: "2 days",
            href: null,
            state: null,
          };
        }),
        total: 9,
        clientCount: 8,
        generatedAt: "2026-10-18T12:00:00Z",
      }),
  );
  return unexpected;
}

test("desktop All grid joins source-backed clients and active prospects after the client layout", async ({
  page,
}, info) => {
  const unexpected = await homeFixtures(page);
  await page.goto("/portfolio");
  await expect(
    page.getByRole("heading", { name: "Portfolio 14" }),
  ).toBeVisible();
  await expect(page.getByRole("article")).toHaveCount(8);
  await expect(page.getByRole("link", { name: /^Open prospect / })).toHaveCount(
    6,
  );
  await expect(page.getByLabel("9 shown alerts")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  const positions = [
    [page.getByRole("region", { name: "Portfolio profiles" }), 264, 321, 720],
    [
      page.getByRole("complementary", { name: "Needs attention" }),
      1008,
      321,
      400,
    ],
    [page.getByRole("article").first(), 264, 371, 352],
  ] as const;
  for (const [locator, x, y, width] of positions) {
    const box = await locator.boundingBox();
    expect(box).not.toBeNull();
    expect(Math.abs(box!.x - x)).toBeLessThanOrEqual(6);
    expect(Math.abs(box!.y - y)).toBeLessThanOrEqual(6);
    expect(Math.abs(box!.width - width)).toBeLessThanOrEqual(6);
  }
  await page.screenshot({ path: info.outputPath("home-desktop-light.png") });
  await page.getByRole("button", { name: "Prospects 6" }).click();
  await expect(
    page.getByRole("heading", { name: "Portfolio 14" }),
  ).toBeVisible();
  await expect(page.getByRole("article")).toHaveCount(0);
  await expect(page.getByRole("link", { name: /^Open prospect / })).toHaveCount(
    6,
  );
  await expect(
    page.getByRole("link", { name: "Add prospect" }),
  ).toHaveAttribute("href", "/portfolio/prospects?new=1");
  await page.screenshot({
    path: info.outputPath("prospects-desktop-light.png"),
  });
  await page.getByRole("button", { name: "Clients 8" }).click();
  await expect(
    page.getByRole("heading", { name: "Portfolio —" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /^Open prospect / })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "All —", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Portfolio 14" }),
  ).toBeVisible();
  await expect(page.getByRole("article")).toHaveCount(8);
  await expect(page.getByRole("link", { name: /^Open prospect / })).toHaveCount(
    6,
  );
  expect(unexpected).toEqual([]);
});

test("failed prospect read leaves client cards and an independent retry", async ({
  page,
}) => {
  const unexpected = await homeFixtures(page, true);
  await page.goto("/portfolio");
  await expect(page.getByRole("article")).toHaveCount(8);
  await expect(page.getByRole("link", { name: /^Open prospect / })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("heading", { name: "Portfolio —" }),
  ).toBeVisible();
  await expect(page.getByRole("alert")).toContainText(
    "Synthetic prospect read unavailable",
  );
  expect(unexpected).toEqual([]);
});

test("core-only prospects remain reachable and linked core prospects use the BD card", async ({
  page,
}) => {
  const unexpected = await homeFixtures(page);
  const coreOnly = {
    ...client,
    id: "10000000-0000-4000-8000-000000000091",
    name: "Legacy Prospect",
    profileType: "PROSPECT",
  };
  const linked = {
    ...coreOnly,
    id: "10000000-0000-4000-8000-000000000092",
    name: "Linked Prospect",
  };
  await page.route("**/api/backend/core/clients", (route) =>
    json(route, [...clients, coreOnly, linked]),
  );
  await page.route(
    "**/api/backend/core/business-development/prospects?*",
    (route) =>
      json(route, {
        prospects: [
          { ...prospects[0], linkedClientId: linked.id },
          ...prospects.slice(1),
        ],
        counts: {
          visible: prospects.length,
          total: prospects.length,
          active: prospects.length,
          dismissed: 0,
          byStage: { identified: prospects.length },
        },
      }),
  );
  await page.goto("/portfolio?type=PROSPECT");
  await expect(
    page.getByRole("heading", { name: "Portfolio 15" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Prospects 7" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Open Legacy Prospect" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Open Linked Prospect" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Open prospect Northline Robotics" }),
  ).toBeVisible();
  expect(unexpected).toEqual([]);
});

test("capped BD results disclose truncation and keep the combined title unknown", async ({
  page,
}) => {
  const unexpected = await homeFixtures(page);
  await page.route(
    "**/api/backend/core/business-development/prospects?*",
    (route) =>
      json(route, {
        prospects,
        counts: {
          visible: 205,
          total: 205,
          active: 205,
          dismissed: 0,
          byStage: { identified: 205 },
        },
      }),
  );
  await page.goto("/portfolio?type=PROSPECT");
  await expect(
    page.getByRole("heading", { name: "Portfolio —" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Prospects 205" }),
  ).toBeVisible();
  await expect(
    page.getByText(/Showing the latest 6 of 205 active BD prospects/),
  ).toBeVisible();
  expect(unexpected).toEqual([]);
});

test("Pipeline opens above the Portfolio Prospects tab and closes in place", async ({
  page,
}) => {
  const unexpected = await homeFixtures(page);
  await page.goto("/portfolio");
  await page.getByRole("link", { name: "Pipeline", exact: true }).click();
  await expect(page).toHaveURL("/portfolio?type=PROSPECT&pipeline=1");
  await expect(page.getByRole("dialog", { name: "Pipeline" })).toBeVisible();
  await expect(
    page
      .locator('nav[aria-label="Profile type"] button[aria-pressed="true"]')
      .filter({ hasText: "Prospects" }),
  ).toContainText("Prospects");
  await expect(
    page.getByRole("region", { name: "Pipeline stages" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL("/portfolio?type=PROSPECT");
  await expect(page.getByRole("dialog", { name: "Pipeline" })).toHaveCount(0);
  expect(unexpected).toEqual([]);
});

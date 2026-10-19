import { expect } from "@playwright/test";
import { test } from "./runtime-observed-test";
import { setup } from "./next-modules-fixtures";
import {
  client,
  clientId,
  objective,
  installFixtures,
  json,
} from "../../tests/browser/fixtures";
import wire from "../../tests/objective-operational-contract-fixtures.json" with { type: "json" };
import {
  operationalReadSchema,
  type OperationalRead,
} from "../../src/shared/capiro/operations/objective-operational";

const record = {
  ...objective,
  status: "ready",
  version: 3,
  ownerUserId: "00000004-1111-4111-8111-111111111111",
};
function read(name = "explicit-manual-and-current-owned-resources") {
  const value = operationalReadSchema.parse(
    structuredClone(wire.examples.find((entry) => entry.name === name)!.value),
  );
  value.scope.clientId = clientId;
  value.scope.objectiveId = record.id;
  return value;
}
async function prepare(
  page: Parameters<typeof setup>[0],
  value: OperationalRead,
) {
  await setup(page, { "clients.list": [client] });
  const unexpected = await installFixtures(page);
  await page.route(
    `**/api/backend/core/clients/${clientId}/objectives`,
    (route) => json(route, [record]),
  );
  await page.route("**/api/capiro/objectives.operational.read*", (route) => {
    expect(route.request().method()).toBe("GET");
    const input = JSON.parse(
      new URL(route.request().url()).searchParams.get("input")!,
    );
    expect(input.params).toEqual({ clientId });
    expect(input.query).toMatchObject({
      schemaVersion: 1,
      objectiveId: record.id,
      limit: 25,
    });
    return json(route, value);
  });
  return unexpected;
}
const href = `/portfolio/${clientId}/objectives?operational=${record.id}`;

test("Desktop Objective operations renders current linked facts, owner actions and existing edit drawer", async ({
  page,
  browser,
}, info) => {
  await info.attach("runtime-identity", {
    body: JSON.stringify({
      platform: process.platform,
      node: process.versions.node,
      browser: browser.version(),
    }),
    contentType: "application/json",
  });
  const value = read();
  const unexpected = await prepare(page, value);
  await page.goto(href);
  const view = page.getByRole("region", {
    name: "Objective operations",
    exact: true,
  });
  await expect(
    view.getByRole("heading", { name: record.outcome, exact: true }),
  ).toBeVisible();
  await expect(
    view.getByRole("region", { name: "Strategies across cycles", exact: true }),
  ).toContainText(value.sections.strategies.items[0]!.resource.title!);
  await expect(
    view.getByRole("region", { name: "Planner projects", exact: true }),
  ).toContainText(value.sections.projects.items[0]!.resource.title!);
  await expect(
    view.getByRole("link", { name: "Open in Planner", exact: true }),
  ).toHaveAttribute(
    "href",
    new RegExp(
      `project=${value.sections.projects.items[0]!.resource.selection.id}`,
    ),
  );
  await expect(
    view.getByRole("link", { name: "Review in Planner" }),
  ).toHaveAttribute(
    "href",
    new RegExp(
      `task=${value.sections.decisions.items[0]!.kind === "planner_approval" ? value.sections.decisions.items[0]!.task.selection.id : "invalid"}`,
    ),
  );
  await expect(
    view.getByRole("region", {
      name: "Open intelligence questions",
      exact: true,
    }),
  ).toContainText("unavailable");
  await expect(view.getByText("Ready · Current Objective v3")).toBeVisible();
  await expect(view.getByText("Active", { exact: true })).toHaveCount(0);
  await expect(
    view.getByText(
      /Requested, Strategy-applied and Planner-applied versions are unavailable/,
    ),
  ).toBeVisible();
  await expect(
    page.locator('img[src="/figma/objective-operational/arrow-left.svg"]'),
  ).toHaveJSProperty("naturalWidth", 15);
  const arrow = await page
    .locator('img[src="/figma/objective-operational/arrow-left.svg"]')
    .boundingBox();
  expect(arrow?.width).toBe(15);
  expect(arrow?.height).toBe(15);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("objective-operations-desktop.png"),
    fullPage: true,
  });
  await view
    .getByRole("button", { name: "Edit objective", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Edit objective", exact: true }),
  ).toBeVisible();
  expect(unexpected).toEqual([]);
});

test("Desktop Objective partial resources stay readable while withheld totals and questions remain unknown", async ({
  page,
}) => {
  const value = read("hidden-strategy-visible-project-partial");
  const unexpected = await prepare(page, value);
  await page.goto(href);
  const projects = page.getByRole("region", {
    name: "Planner projects",
    exact: true,
  });
  await expect(projects).toContainText(
    value.sections.projects.items[0]!.resource.title!,
  );
  await expect(projects).toContainText("Totals are unavailable");
  const strategies = page.getByRole("region", {
    name: "Strategies across cycles",
    exact: true,
  });
  await expect(strategies).toContainText("Totals are unavailable");
  await expect(strategies.getByRole("heading", { level: 3 })).toHaveCount(0);
  await expect(
    page.getByRole("region", {
      name: "Open intelligence questions",
      exact: true,
    }),
  ).toContainText("not connected");
  expect(unexpected).toEqual([]);
});

test("Desktop Objective verified empty links are distinct from unavailable information", async ({
  page,
}) => {
  const unexpected = await prepare(
    page,
    read("verified-empty-memberships-do-not-deny-manual-unlinked-outputs"),
  );
  await page.goto(href);
  await expect(
    page.getByRole("region", { name: "Strategies across cycles", exact: true }),
  ).toContainText("No readable Strategies are linked");
  await expect(
    page.getByRole("region", { name: "Planner projects", exact: true }),
  ).toContainText("No readable Planner projects are linked");
  await expect(page.getByText("None linked", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("region", {
      name: "Open intelligence questions",
      exact: true,
    }),
  ).not.toContainText("0");
  expect(unexpected).toEqual([]);
});

for (const mismatch of ["client", "version"] as const) {
  test(`Desktop Objective refuses ${mismatch}-mismatched operational content before actions render`, async ({
    page,
  }) => {
    const value = read();
    value.sections.projects.items[0]!.resource.title =
      "Private unrelated project";
    if (mismatch === "client")
      value.scope.clientId = "10000000-0000-4000-8000-000000000099";
    else value.scope.objectiveVersion = 4;
    const unexpected = await prepare(page, value);
    await page.goto(href);
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.getByText("Private unrelated project")).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "Open in Planner" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Edit objective", exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Reload current objective" }),
    ).toBeVisible();
    expect(unexpected).toEqual([]);
  });
}

test("Desktop Objective loading and failed reads never manufacture zero metrics or a successful action", async ({
  page,
}) => {
  const value = read();
  const unexpected = await prepare(page, value);
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(
    "**/api/capiro/objectives.operational.read*",
    async (route) => {
      await held;
      return json(route, { message: "Synthetic owner unavailable" }, 503);
    },
  );
  try {
    await page.goto(href, { waitUntil: "domcontentloaded" });
    await expect(
      page
        .getByRole("region", { name: "Objective operations", exact: true })
        .getByRole("status")
        .filter({ hasText: /^Loading\u2026$/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Edit objective", exact: true }),
    ).toBeDisabled();
  } finally {
    release();
  }
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByRole("link", { name: "Open in Planner" })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("button", { name: "Reload current objective" }),
  ).toBeVisible();
  expect(unexpected).toEqual([]);
});

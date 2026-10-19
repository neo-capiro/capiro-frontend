import { test, expect, type Page } from "@playwright/test";
import { client, clientId, installFixtures, json } from "./fixtures";
import { layoutActor } from "./portfolio-layout-fixtures";

const secondId = "10000000-0000-4000-8000-000000000002";
const hiddenId = "10000000-0000-4000-8000-000000000003";
const archivedId = "10000000-0000-4000-8000-000000000004";
const endpoint = "**/api/backend/core/me/portfolio-layout";
const positions = (page: Page) =>
  page
    .locator("[data-client-id]")
    .evaluateAll((items) =>
      items.map((item) => item.getAttribute("data-client-id")),
    );
async function fixtures(page: Page) {
  const unexpected = await installFixtures(page);
  await page.route("**/core/me", (route) =>
    json(route, {
      user: { id: layoutActor.userId, email: "layout@example.test" },
      tenant: { id: layoutActor.tenantId, name: "Synthetic tenant" },
      role: "standard_user",
    }),
  );
  // These are roster metadata, not a browser-side wall or grant decision.
  await page.route("**/core/clients", (route) =>
    json(route, [
      client,
      { ...client, id: secondId, name: "Granted Wall", memoryWall: true },
      { ...client, id: hiddenId, name: "Ungrant Wall", memoryWall: true },
      {
        ...client,
        id: archivedId,
        name: "Archived Profile",
        status: "archived",
      },
    ]),
  );
  return unexpected;
}
const receipt = (version: number, ids: string[]) => ({
  ...layoutActor,
  contractVersion: 1,
  version,
  updatedAt: "2026-10-14T00:00:00.000Z",
  order: ids.map((id) => `client:${id}`),
});

test("Customize saves the complete authorized catalog without appending ungranted or archived roster metadata", async ({
  page,
}) => {
  const unexpected = await fixtures(page);
  const writes: unknown[] = [];
  let ids = [secondId, clientId],
    version = 1;
  await page.route(endpoint, (route) => {
    if (route.request().method() === "PUT") {
      const body = route.request().postDataJSON();
      writes.push(body);
      ids = body.order.map((id: string) => id.slice(7));
      version++;
    }
    return json(route, receipt(version, ids));
  });
  await page.goto("/portfolio?view=list&q=No+matching+profile");
  await page.getByRole("button", { name: "Customize", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Move Granted Wall later", exact: true }),
  ).toBeEnabled();
  await expect.poll(() => positions(page)).toEqual([secondId, clientId]);
  await expect(
    page.getByRole("status").filter({ hasText: "Customizing all 2 profiles" }),
  ).toBeVisible();
  await expect(page.getByText("Ungrant Wall", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Archived Profile", { exact: true })).toHaveCount(
    0,
  );
  await page
    .getByRole("button", { name: "Move Granted Wall later", exact: true })
    .click();
  await page.getByRole("button", { name: "Save order", exact: true }).click();
  expect(writes).toEqual([
    {
      contractVersion: 1,
      expectedVersion: 1,
      order: [clientId, secondId].map((id) => `client:${id}`),
    },
  ]);
  await page.reload();
  await page.getByRole("button", { name: "Customize", exact: true }).click();
  await expect.poll(() => positions(page)).toEqual([clientId, secondId]);
  expect(writes).toHaveLength(1);
  expect(unexpected).toEqual([]);
});

test("lost save recovery admits the changed authorized catalog without confirming or replaying the old order", async ({
  page,
}) => {
  const unexpected = await fixtures(page);
  let ids = [clientId, secondId],
    version = 1,
    writes = 0;
  await page.route(endpoint, (route) => {
    if (route.request().method() === "PUT") {
      writes++;
      ids = [secondId];
      version = 3;
      return route.abort("failed");
    }
    return json(route, receipt(version, ids));
  });
  await page.goto("/portfolio");
  await page.getByRole("button", { name: "Customize", exact: true }).click();
  await page
    .getByRole("button", { name: "Move Test Aerospace later", exact: true })
    .click();
  await page.getByRole("button", { name: "Save order", exact: true }).click();
  await page
    .getByRole("button", { name: "Check saved order", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Use latest saved order", exact: true }),
  ).toBeEnabled();
  await expect.poll(() => positions(page)).toEqual([secondId]);
  await expect(
    page
      .getByRole("list", { name: "Latest saved profile order" })
      .getByRole("listitem"),
  ).toHaveText(["Granted Wall"]);
  await expect(
    page.getByText("Saved order confirmed.", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /Move Test Aerospace/ }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Use latest saved order", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Save order", exact: true }),
  ).toHaveCount(0);
  expect(writes).toBe(1);
  expect(unexpected).toEqual([]);
});

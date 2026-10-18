import { expect, test, type Page } from "@playwright/test";
import { client, clientId } from "./fixtures";

const secondId = "10000000-0000-4000-8000-000000000002";
const deniedId = "10000000-0000-4000-8000-000000000003";
const roster = [
  { ...client, name: "Aster Aerospace" },
  { ...client, id: secondId, name: "Beacon Energy", sectorTag: "ENERGY" },
];

async function previewCoreFixtures(page: Page) {
  const requests: string[] = [];
  const unexpected: string[] = [];
  await page.route("**/*", (route) =>
    new URL(route.request().url()).hostname === "127.0.0.1"
      ? route.continue()
      : route.abort("blockedbyclient"),
  );
  await page.route("**/api/backend/**", (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    requests.push(`${request.method()} ${path}`);
    if (request.method() !== "GET") {
      unexpected.push(`${request.method()} ${path}`);
      return route.fulfill({
        status: 500,
        json: { message: "Unexpected write" },
      });
    }
    if (path === `/api/backend/core/clients/${clientId}`)
      return route.fulfill({ json: roster[0] });
    if (path === `/api/backend/core/clients/${secondId}`)
      return route.fulfill({ json: roster[1] });
    if (path === `/api/backend/core/clients/${deniedId}`)
      return route.fulfill({ status: 404, json: { message: "Not found" } });
    if (path === "/api/backend/core/me")
      return route.fulfill({
        json: {
          user: { id: "test-user", email: "test@example.test" },
          tenant: { id: "test-tenant", name: "Synthetic test tenant" },
          role: "user_admin",
        },
      });
    unexpected.push(`GET ${path}`);
    return route.fulfill({
      status: 500,
      json: { message: "Unqualified read" },
    });
  });
  await page.route("**/api/capiro/*", (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    requests.push(`${request.method()} ${path}`);
    if (request.method() === "GET" && path === "/api/capiro/clients.list")
      return route.fulfill({ json: roster });
    unexpected.push(`${request.method()} ${path}`);
    return route.fulfill({
      status: 500,
      json: { message: "Unqualified operation" },
    });
  });
  return { requests, unexpected };
}

test("Core preview catalog exposes only the available client roster", async ({
  page,
}, info) => {
  const { requests, unexpected } = await previewCoreFixtures(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/__test/preview-clients");

  const table = page.getByRole("table", { name: "Available clients" });
  await expect(table.getByRole("row")).toHaveCount(3);
  await expect(page.getByRole("heading", { name: "Clients 2" })).toBeVisible();
  await expect(table).toContainText("Aster Aerospace");
  await expect(table).toContainText("Beacon Energy");
  await expect(page.getByRole("note")).toContainText(
    "Client selection, account owners, saved layouts, alerts, profile details, and editing are unavailable here.",
  );
  await expect(table.getByRole("link")).toHaveCount(0);
  await expect(
    page.getByRole("navigation", { name: "Portfolio" }).getByRole("link"),
  ).toHaveCount(1);
  await expect(
    page.getByRole("link", { name: "Portfolio Clients" }),
  ).toHaveAttribute("href", "/portfolio");
  await expect(page.getByRole("link", { name: "Meri" })).toHaveCount(1);
  await expect(page.getByRole("link", { name: "Master calendar" })).toHaveCount(
    0,
  );
  await page.screenshot({
    path: info.outputPath("preview-clients-desktop-light.png"),
    fullPage: true,
    animations: "disabled",
  });

  await page
    .getByRole("textbox", { name: "Search available clients" })
    .fill("Beacon");
  await expect(table.getByRole("row")).toHaveCount(2);
  await expect(table).not.toContainText("Aster Aerospace");
  await expect(
    page.getByRole("status").filter({ hasText: "1 of 2" }),
  ).toContainText("1 of 2 available clients");
  await page
    .getByRole("textbox", { name: "Search available clients" })
    .fill("No match");
  await expect(
    page.getByRole("status").filter({ hasText: "No clients match" }),
  ).toContainText("No clients match this search.");

  expect(requests).toEqual(
    expect.arrayContaining(["GET /api/capiro/clients.list"]),
  );
  expect(unexpected).toEqual([]);
});

test("Core preview Modules exposes the roster without offering unqualified selection", async ({
  page,
}) => {
  const { requests, unexpected } = await previewCoreFixtures(page);
  await page.goto("/__test/preview-modules");

  await expect(
    page.getByRole("heading", { name: "Modules client scope" }),
  ).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Client profile scope" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("navigation", { name: "Modules" }).getByRole("link"),
  ).toHaveCount(1);
  const profiles = page.getByRole("list", {
    name: "Available client profiles",
  });
  await expect(profiles.getByRole("listitem")).toContainText([
    "Aster Aerospace",
    "Beacon Energy",
  ]);
  await expect(
    page.getByRole("region", { name: "Preview availability" }),
  ).toContainText(
    "Client selection, module records, and actions are unavailable in this preview.",
  );
  expect(requests).toContain("GET /api/capiro/clients.list");
  expect(requests).not.toContain(`GET /api/backend/core/clients/${secondId}`);
  expect(unexpected).toEqual([]);
});

test("a denied URL client never mounts the Modules selector", async ({
  page,
}) => {
  const { requests, unexpected } = await previewCoreFixtures(page);
  await page.goto(`/__test/preview-modules?clientId=${deniedId}`);

  await expect(
    page.getByRole("heading", { name: "Selected client unavailable" }),
  ).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Client profile scope" }),
  ).toHaveCount(0);
  expect(requests).toContain(`GET /api/backend/core/clients/${deniedId}`);
  expect(unexpected).toEqual([]);
});

import { test, expect } from "@playwright/test";
import {
  installFixtures,
  client,
  clientId,
} from "../../tests/browser/fixtures";
import { operationFixtures, onlyLocalRequests } from "./fixtures";

const otherId = "10000000-0000-4000-8000-000000000002";
async function setup(page: import("@playwright/test").Page) {
  await onlyLocalRequests(page);
  await page.addInitScript(() =>
    sessionStorage.setItem("integration-probe", "true"),
  );
  await installFixtures(page);
  await operationFixtures(page, {
    "clients.list": [
      { ...client, name: "First permitted client" },
      { ...client, id: otherId, name: "Second permitted client" },
    ],
  });
  await page.route("**/api/backend/core/clients/*", (route) => {
    const id = new URL(route.request().url()).pathname.split("/").at(-1);
    return route.fulfill({
      json: {
        ...client,
        id,
        name:
          id === clientId
            ? "First permitted client"
            : "Second permitted client",
      },
    });
  });
}

test("shared product navigation and history preserve verified client hints and scoped styles", async ({
  page,
}) => {
  await setup(page);
  await page.goto("/modules");
  await expect(page.getByTestId("client-state")).toHaveText("no-selection");
  await page.getByLabel("Client profile scope").selectOption(clientId);
  await expect(page.getByTestId("client-state")).toHaveText(
    "authorized-client: First permitted client",
  );
  await page
    .getByRole("navigation", { name: "Modules", exact: true })
    .getByRole("link", { name: "Engagement", exact: true })
    .focus();
  await expect(
    page
      .getByRole("navigation", { name: "Modules", exact: true })
      .getByRole("link", { name: "Engagement", exact: true }),
  ).toBeFocused();
  await expect(
    page
      .getByRole("navigation", { name: "Modules", exact: true })
      .getByRole("link", { name: "Engagement", exact: true }),
  ).toHaveAttribute("href", `/modules/engagement?clientId=${clientId}`);
  await page.getByLabel("Scope draft").fill("Kept within current client");
  await page
    .getByRole("navigation", { name: "Product modes" })
    .getByRole("link", { name: "Meri", exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`/meri\\?clientId=${clientId}`));
  await expect(page.getByLabel("Scope draft")).toHaveValue(
    "Kept within current client",
  );
  await expect(page.locator("[data-portfolio-root]")).toHaveCount(0);
  await page.screenshot({ path: "test-results/integration-meri-desktop.png" });
  await page
    .getByRole("navigation", { name: "Product modes" })
    .getByRole("link", { name: "Portfolio", exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`/portfolio/${clientId}$`));
  await expect(page.locator("[data-portfolio-root]")).toHaveCount(1);
  await page.goBack();
  await expect(
    page.getByRole("heading", { name: "Meri", exact: true }),
  ).toBeVisible();
  await page.goForward();
  await expect(page.locator("[data-portfolio-root]")).toHaveCount(1);
  await page
    .getByRole("navigation", { name: "Workspace", exact: true })
    .getByRole("link", { name: "Modules", exact: true })
    .click();
  await expect(page.getByLabel("Client profile scope")).toHaveValue(clientId);
  await page.getByLabel("Client profile scope").selectOption(otherId);
  await expect(page.getByTestId("client-state")).toHaveText(
    "authorized-client: Second permitted client",
  );
  await expect(page.getByLabel("Scope draft")).toHaveValue("");
  await page.setViewportSize({ width: 390, height: 844 });
  const modes = page.getByRole("navigation", { name: "Product modes" });
  const brand = page.getByRole("link", { name: "Capiro Home" });
  const modeBounds = await modes.boundingBox();
  const brandBounds = await brand.boundingBox();
  expect(modeBounds!.y).toBeGreaterThan(brandBounds!.y + brandBounds!.height);
  await expect(
    page.getByRole("link", { name: "Search intelligence" }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/integration-modules-mobile-collapsed.png",
  });
  await page.getByRole("button", { name: "Modules menu" }).click();
  await expect(
    page.getByRole("navigation", { name: "Modules", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/integration-modules-mobile.png",
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("client replacement interrupts a write and organization replacement clears drafts and revalidates", async ({
  page,
}) => {
  await setup(page);
  let release!: () => void;
  let started!: () => void;
  const dispatched = new Promise<void>((resolve) => {
    started = resolve;
  });
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let writes = 0;
  await page.route("**/api/capiro/me.update", async (route) => {
    writes++;
    started();
    await held;
    await route.fulfill({ json: {} }).catch(() => {});
  });
  await page.goto(`/modules?clientId=${clientId}`);
  await expect(page.getByTestId("client-state")).toContainText(
    "authorized-client",
  );
  await page.getByLabel("Scope draft").fill("Prior client edit");
  await page.getByRole("button", { name: "Hold synthetic write" }).click();
  await dispatched;
  await page.getByLabel("Client profile scope").selectOption(otherId);
  await expect(page.getByLabel("Scope draft")).toHaveValue("");
  release();
  await expect(page.getByText("Saved test write")).toHaveCount(0);
  expect(writes).toBe(1);
  await page.getByLabel("Scope draft").fill("Prior tenant edit");
  await page.route(`**/api/backend/core/clients/${otherId}`, (route) =>
    route.fulfill({ status: 404, json: { message: "No permitted client" } }),
  );
  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent("test:session", {
        detail: { orgId: "replacement-org", sessionId: "replacement-session" },
      }),
    ),
  );
  await expect(page.getByTestId("client-state")).toHaveText("unavailable");
  await expect(
    page.getByRole("heading", { name: "Selected client unavailable" }),
  ).toBeVisible();
  await expect(page.getByLabel("Scope draft")).toHaveValue("");
});

test("Core expiry clears the application, does not replay and cannot be escaped by changing client", async ({
  page,
}) => {
  await setup(page);
  let calls = 0;
  await page.route("**/api/backend/core/me", (route) => {
    calls++;
    return route.fulfill({ status: 401, json: { message: "Expired" } });
  });
  await page.goto("/modules");
  await page
    .getByRole("button", { name: "Check synthetic Core session" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your session expired" }),
  ).toBeVisible();
  await page.evaluate((id) => {
    history.pushState({}, "", `/modules?clientId=${id}`);
    dispatchEvent(new PopStateEvent("popstate"));
  }, otherId);
  await expect(
    page.getByRole("heading", { name: "Your session expired" }),
  ).toBeVisible();
  await expect(page.getByLabel("Scope draft")).toHaveCount(0);
  expect(calls).toBe(1);
});

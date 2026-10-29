import { expect, test } from "@playwright/test";
import { client, clientId, installFixtures, json } from "./fixtures";

const logo = "https://assets.invalid.test/client-logo.png";
const clientPath = `/api/backend/core/clients/${clientId}`;
const png =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

/** Serve the client read with a logo, letting every other call fall through. */
async function withLogo(page: import("@playwright/test").Page) {
  await page.route("**/api/backend/core/clients**", (route) => {
    if (new URL(route.request().url()).pathname !== clientPath)
      return route.fallback();
    return json(route, { ...client, logoUrl: logo });
  });
}

/**
 * A client can carry a `logoUrl` whose object no longer resolves. The identity
 * card must fall back to the same initials the no-logo case already uses rather
 * than leaving a broken-image box behind.
 *
 * The image request is aborted rather than pointed at a 404 host so the failure
 * is deterministic and never leaves the runner waiting on DNS.
 */
test("client identity falls back to initials when the logo cannot load", async ({
  page,
}) => {
  const unexpected = await installFixtures(page);
  await withLogo(page);
  await page.route(logo, (route) => route.abort());
  await page.goto(`/portfolio/${clientId}`);
  const card = page.getByRole("region", { name: "Client identity" });
  await expect(card).toBeVisible();
  await expect(card.locator(".monogram img")).toHaveCount(0);
  await expect(card.locator(".monogram")).toHaveText("TA");
  expect(unexpected).toEqual([]);
});

test("client identity renders the logo when it does load", async ({ page }) => {
  const unexpected = await installFixtures(page);
  await withLogo(page);
  await page.route(logo, (route) =>
    route.fulfill({
      status: 200,
      contentType: "image/png",
      body: Buffer.from(png, "base64"),
    }),
  );
  await page.goto(`/portfolio/${clientId}`);
  const card = page.getByRole("region", { name: "Client identity" });
  await expect(card).toBeVisible();
  await expect(card.locator(".monogram img")).toHaveCount(1);
  expect(unexpected).toEqual([]);
});

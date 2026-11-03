import { expect, test, type Page } from "@playwright/test";

const page_url = "/session-expiry-diagnostic.html";
/** The existing expired alert element, identified by its diagnostic attribute. */
const alert = (page: Page) => page.locator("[data-auth-class]");

async function open(page: Page, query: string) {
  await page.goto(`${page_url}${query}`);
}

test("a mounted 401 replaces the page with the honest verification wording and the class", async ({
  page,
}) => {
  await open(page, "?class=no-session");
  // Mounted first: the real providers were mounted before the 401 resolved, and the
  // replacement is a state update on that mounted tree, not a fresh render.
  await expect(page.locator("[data-harness=mounted]")).toBeVisible();
  await expect(alert(page)).toBeVisible();
  await expect(alert(page)).toHaveAttribute("role", "alert");
  await expect(alert(page)).toHaveAttribute("data-auth-class", "no-session");
  await expect(page.getByRole("heading", { level: 2 })).toHaveText(
    "We couldn't verify your session",
  );
  await expect(page.getByRole("link", { name: "Sign in" })).toHaveAttribute(
    "href",
    "/sign-in",
  );
  // The message explains the next action and claims no cause.
  const copy = (await alert(page).innerText()).replace(/\s*\n\s*/g, "\n");
  expect(copy).toBe(
    "We couldn't verify your session\nSign in again to continue.\nSign in",
  );
  expect(copy).not.toMatch(/expired|token|cookie|invalid|unauthorized/i);
  // No private content and no identity survives the replacement.
  await expect(page.getByText("Synthetic client page")).toHaveCount(0);
  expect(copy).not.toMatch(/10000000|test-user|test-tenant|portfolio/i);
});

test("each producer class reaches the existing alert unchanged", async ({
  page,
}) => {
  for (const failure of [
    "credential-unverified",
    "upstream-rejected",
    "unknown",
  ]) {
    await open(page, `?class=${failure}`);
    await expect(alert(page)).toHaveAttribute("data-auth-class", failure);
  }
});

test("an absent, unrecognized or duplicated class falls back to unknown", async ({
  page,
}) => {
  for (const query of [
    "",
    "?class=expired",
    "?class=No-Session",
    "?class=no-session&class=synthetic",
  ]) {
    await open(page, query);
    await expect(alert(page)).toHaveAttribute("data-auth-class", "unknown");
  }
});

test("an unreadable 401 body does not change the class or the wording", async ({
  page,
}) => {
  await open(page, "?class=upstream-rejected&body=html");
  await expect(alert(page)).toHaveAttribute(
    "data-auth-class",
    "upstream-rejected",
  );
  await expect(page.getByRole("heading", { level: 2 })).toHaveText(
    "We couldn't verify your session",
  );
});

test("a non-401 response never raises the screen", async ({ page }) => {
  await open(page, "?class=no-session&status=500");
  await expect(page.locator("[data-harness=mounted]")).toBeVisible();
  // The existing view-specific error handling keeps the page; nothing expires.
  await expect(page.getByText("Synthetic refusal")).toBeVisible();
  await expect(alert(page)).toHaveCount(0);
  await expect(page.locator("[data-auth-class]")).toHaveCount(0);
});

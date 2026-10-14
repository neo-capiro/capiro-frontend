import { expect, test, type Route } from "@playwright/test";
import { proxyRequest } from "../../src/shared/portfolio/api/proxy";
import { readConfig } from "../../src/shared/portfolio/config/config";
import { clientId, installFixtures } from "./fixtures";
import { installProfileCurrentState } from "./profile-current-state-fixtures";

const message =
  "The requested action or record is unavailable from the current service.";
async function unavailable(route: Route) {
  const url = new URL(route.request().url());
  const [service, ...path] = url.pathname
    .slice("/api/backend/".length)
    .split("/");
  const response = await proxyRequest(
    new Request(url),
    service!,
    path,
    readConfig({
      CORE_API_BASE_URL: "https://backend.synthetic.invalid/api",
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_live_c3ludGhldGljJA==",
      CLERK_SECRET_KEY: "sk_live_synthetic",
    }),
    async () => "synthetic-session-token",
    async () =>
      Response.json({ message: `Cannot GET ${url.pathname}` }, { status: 404 }),
  );
  await route.fulfill({
    status: response.status,
    body: await response.text(),
    contentType: "application/json",
  });
}

test("missing objective collection is unavailable, never an empty collection or a writable editor", async ({
  page,
}) => {
  const unexpected = await installFixtures(page);
  await page.route(`**/clients/${clientId}/objectives**`, unavailable);
  await page.goto(`/portfolio/${clientId}/objectives?new=1`);
  await expect(page.getByRole("alert")).toContainText(message);
  await expect(
    page.getByRole("button", { name: "New objective", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText("No current objectives", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "New objective", exact: true }),
  ).toHaveCount(0);
  expect(unexpected).toEqual([]);
});

test("missing owner source never renders an empty owner assignment", async ({
  page,
}) => {
  const { state, unexpected } = await installProfileCurrentState(page);
  state.ownersStatus = 404;
  await page.goto("/profile-current-state.html?mode=team");
  await page.getByRole("button", { name: "Manage owners" }).click();
  const dialog = page.getByRole("dialog", { name: "Owners", exact: true });
  await expect(dialog.getByRole("alert")).toContainText("Owners unavailable");
  await expect(
    dialog.getByRole("list", { name: "Ordered account owners" }),
  ).toHaveCount(0);
  await expect(
    dialog.getByRole("combobox", { name: "Primary owner", exact: true }),
  ).toHaveCount(0);
  await expect(
    dialog.getByRole("button", { name: "Save owners", exact: true }),
  ).toBeDisabled();
  await dialog.getByRole("button", { name: "Read current owners" }).click();
  await expect.poll(() => state.reads.owners).toBe(2);
  await expect(
    dialog.getByRole("list", { name: "Ordered account owners" }),
  ).toHaveCount(0);
  expect(state.writes).toEqual([]);
  expect(unexpected).toEqual([]);
});

test("missing effective-date feed leaves its failure visible and other calendar sources usable", async ({
  page,
}) => {
  const unexpected = await installFixtures(page);
  await page.route(
    "**/core/federal-register/effective-date-calendar?*",
    unavailable,
  );
  await page.goto("/calendar?view=agenda&date=2026-10-08");
  await expect(page.getByRole("alert")).toContainText(message);
  await expect(
    page.getByText("No events match this view", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Master Calendar", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "New meeting", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("combobox", { name: "Calendar view", exact: true })
    .selectOption("month");
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect(unexpected).toEqual([]);
});

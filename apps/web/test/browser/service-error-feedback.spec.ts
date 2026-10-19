import { test, expect, type Page } from "@playwright/test";
import { operationFixtures, onlyLocalRequests, testIdentity } from "./fixtures";
import { moduleRouteFixtures } from "./module-route-fixtures";
import {
  installFixtures,
  client,
  clientId,
  objective,
  json,
} from "../../tests/browser/fixtures";
const failures = new WeakMap<Page, { errors: string[]; writes: string[] }>();
test.beforeEach(({ page }) => {
  const observed = { errors: [] as string[], writes: [] as string[] };
  failures.set(page, observed);
  page.on("pageerror", (error) => observed.errors.push(error.message));
  page.on("request", (request) => {
    const path = new URL(request.url()).pathname;
    if (path.startsWith("/api/") && request.method() !== "GET")
      observed.writes.push(`${request.method()} ${path}`);
  });
});
test.afterEach(({ page }) => {
  expect(failures.get(page)).toEqual({ errors: [], writes: [] });
});
const unavailable =
  "The requested action or record is unavailable from the current service.";
const serviceUnavailable = "The service is unavailable. Please retry.";

test("saved layout404 reports unavailable while retaining actual ordinary profiles and refusing reorder writes", async ({
  page,
}) => {
  const unexpected = await installFixtures(page);
  await page.route("**/api/backend/core/me", (r) => json(r, testIdentity));
  const calls: string[] = [];
  await page.route("**/api/backend/core/me/portfolio-layout", (r) => {
    calls.push(r.request().method());
    return json(r, { message: unavailable }, 404);
  });
  await page.goto("/portfolio");
  await expect(
    page.getByText(/Saved profile ordering is unavailable/),
  ).toBeVisible();
  await expect(
    page.getByText(client.name, { exact: true }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Customize", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /Move .* (earlier|later)/ }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Save order", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Retry saved order", exact: true })
    .click();
  await expect.poll(() => calls).toEqual(["GET", "GET"]);
  expect(unexpected).toEqual([]);
});

test("Objectives404 shows the explicit error and never opens stale records or a new-objective editor", async ({
  page,
}) => {
  const unexpected = await installFixtures(page);
  const calls: string[] = [];
  await page.route(
    `**/api/backend/core/clients/${clientId}/objectives`,
    (r) => {
      calls.push(r.request().method());
      return json(r, { message: unavailable }, 404);
    },
  );
  await page.goto(
    `/portfolio/${clientId}/objectives?objective=${objective.id}`,
  );
  await expect(page.getByRole("alert")).toContainText(unavailable);
  await expect(
    page.getByRole("button", { name: "New objective", exact: true }),
  ).toBeDisabled();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText(objective.outcome, { exact: true })).toHaveCount(
    0,
  );
  await page
    .getByRole("alert")
    .getByRole("button", { name: "Retry", exact: true })
    .click();
  await expect.poll(() => calls).toEqual(["GET", "GET"]);
  expect(unexpected).toEqual([]);
});

for (const failed of ["strategies.proposals", "strategies.list"] as const)
  test(`${failed} failure does not invent counts; proposals failure retries only the existing read`, async ({
    page,
  }) => {
    await onlyLocalRequests(page);
    await operationFixtures(page, moduleRouteFixtures);
    const calls: string[] = [];
    let retrySucceeds = false;
    await page.route(`**/api/capiro/${failed}?*`, (r) => {
      calls.push(r.request().method());
      return r.fulfill({
        status: retrySucceeds
          ? 200
          : failed === "strategies.proposals"
            ? 502
            : 404,
        json: retrySucceeds
          ? []
          : {
              message:
                failed === "strategies.proposals"
                  ? serviceUnavailable
                  : unavailable,
            },
      });
    });
    await page.goto("/modules/strategies");
    const card = page.getByRole("button", { name: /Watcher proposals/ });
    await expect(card).toContainText("—");
    if (failed === "strategies.proposals") {
      const error = page
        .getByRole("alert")
        .filter({ hasText: "Watcher proposals unavailable." });
      await expect(error).toContainText(serviceUnavailable);
      expect(calls).toEqual(["GET"]);
      retrySucceeds = true;
      await error
        .getByRole("button", { name: "Try again", exact: true })
        .click();
      await expect(card).toContainText("0");
      await expect(error).toHaveCount(0);
      expect(calls).toEqual(["GET", "GET"]);
    } else {
      await expect(page.getByRole("alert")).toContainText(unavailable);
      await expect(page.getByText("0 strategies", { exact: true })).toHaveCount(
        0,
      );
      await expect(
        page.getByText("— strategies", { exact: true }),
      ).toBeVisible();
    }
    await expect(page.locator("body")).not.toContainText("Anduril");
  });

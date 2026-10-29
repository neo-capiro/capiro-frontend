import { test, expect, type Page } from "@playwright/test";
import {
  contextPage,
  contextIds,
  contextItemId,
} from "../../../tests/target-context-fixtures";
import type { TargetContextRequest } from "../../../src/shared/capiro/operations/target-context";
const endpoint = "**/api/capiro/directory.targetContext?*";
const input = (url: string) =>
  JSON.parse(new URL(url).searchParams.get("input")!) as TargetContextRequest;
async function open(page: Page) {
  page.on("pageerror", (error) => {
    throw error;
  });
  await page.goto("/target-context/index.html");
}
test("opens current work and dates with exact receiving links, using reads only", async ({
  page,
}) => {
  const methods: string[] = [];
  await page.route(endpoint, (route) => {
    methods.push(route.request().method());
    const request = input(route.request().url());
    return route.fulfill({ json: contextPage(request.query.section) });
  });
  await open(page);
  await expect(
    page.getByText("Saved minimum win", { exact: false }),
  ).toBeVisible();
  await expect(page.getByText("2026-10-29 · Ongoing")).toBeVisible();
  await expect(
    page.getByRole("link", { name: `Saved step ${contextItemId(1)}` }),
  ).toHaveAttribute(
    "href",
    `/modules/strategies?clientId=${contextIds.clientId}&strategy=${contextIds.strategyId}&step=${contextItemId(1)}`,
  );
  await expect(
    page.getByRole("link", { name: `Saved outcome ${contextItemId(1)}` }),
  ).toHaveAttribute(
    "href",
    `/portfolio/${contextIds.clientId}/objectives?operational=${contextItemId(1)}`,
  );
  expect(methods.length).toBeGreaterThanOrEqual(2);
  expect(methods.every((method) => method === "GET")).toBe(true);
});
test("each section paginates independently and reloads previous pages", async ({
  page,
}) => {
  const seen: TargetContextRequest[] = [];
  await page.route(endpoint, (route) => {
    const request = input(route.request().url());
    seen.push(request);
    return route.fulfill({
      json: contextPage(
        request.query.section,
        request.query.section === "steps" && !request.query.after ? 25 : 1,
        request.query.after ? 26 : 1,
      ),
    });
  });
  await open(page);
  const steps = page.getByRole("region", {
    name: "Strategy steps and actions",
  });
  await steps.getByRole("button", { name: "Next page" }).click();
  await expect(
    steps.getByText("Page 2 · 1 items · End of current results"),
  ).toBeVisible();
  await expect(
    steps.getByRole("link", {
      name: `Saved step ${contextItemId(1)}`,
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: `Saved outcome ${contextItemId(1)}` }),
  ).toBeVisible();
  expect(seen.at(-1)?.query).toEqual({
    section: "steps",
    after: contextItemId(25),
  });
  await steps.getByRole("button", { name: "Previous page" }).click();
  await expect(
    steps.getByText("Page 1 · 25 items · More available"),
  ).toBeVisible();
});
test("a failed refresh withholds stale links without inventing an empty result", async ({
  page,
}) => {
  let fail = false;
  await page.route(endpoint, (route) => {
    const request = input(route.request().url());
    return fail && request.query.section === "steps"
      ? route.fulfill({
          status: 403,
          json: { message: "Current target access is unavailable" },
        })
      : route.fulfill({ json: contextPage(request.query.section) });
  });
  await open(page);
  const steps = page.getByRole("region", {
    name: "Strategy steps and actions",
  });
  await expect(steps.getByRole("link")).toBeVisible();
  fail = true;
  await steps.getByRole("button", { name: "Refresh" }).click();
  await expect(steps.getByRole("alert")).toContainText(
    "Current target access is unavailable",
  );
  await expect(steps.getByRole("link")).toHaveCount(0);
  await expect(
    steps.getByText("No current Strategy steps for this target."),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: `Saved outcome ${contextItemId(1)}` }),
  ).toBeVisible();
  fail = false;
  await steps.getByRole("button", { name: "Retry" }).click();
  await expect(steps.getByRole("link")).toBeVisible();
});
test("a changed target cannot receive a delayed old response or a mismatched new one", async ({
  page,
}) => {
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(endpoint, async (route) => {
    const request = input(route.request().url());
    if (request.params.targetId === contextIds.targetId) await held;
    await route
      .fulfill({ json: contextPage(request.query.section) })
      .catch(() => {});
  });
  await open(page);
  await page.getByRole("button", { name: "Change target" }).click();
  await expect(page.getByRole("alert")).toHaveCount(2);
  release();
  await expect(page.getByRole("link")).toHaveCount(0);
  await expect(
    page.getByText("did not match this selection", { exact: false }),
  ).toHaveCount(2);
});
test("an expired session removes the entire target context", async ({
  page,
}) => {
  await page.route(endpoint, (route) =>
    route.fulfill({ status: 401, json: { message: "Expired" } }),
  );
  await open(page);
  await expect(page.getByRole("alert")).toHaveText("Session expired");
  await expect(
    page.getByRole("region", { name: "Target context", exact: true }),
  ).toHaveCount(0);
});

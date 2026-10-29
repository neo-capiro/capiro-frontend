import { test, expect, type Page } from "@playwright/test";
import {
  layoutFixtures,
  layoutReceipt,
  cardIds,
} from "./portfolio-layout-fixtures";
const endpoint = "**/api/backend/core/me/portfolio-layout";
const positions = (page: Page) =>
  page
    .locator("[data-client-id]")
    .evaluateAll((items) =>
      items.map((item) => item.getAttribute("data-client-id")),
    );
test("a newer authorized GET cannot be overwritten by a late held PUT receipt", async ({
  page,
}) => {
  await layoutFixtures(page);
  let release!: () => void,
    held = false,
    refreshed = false,
    writes = 0;
  const waiting = new Promise<void>((resolve) => (release = resolve));
  await page.route(endpoint, async (route) => {
    if (route.request().method() === "PUT") {
      writes++;
      held = true;
      const input = route.request().postDataJSON();
      await waiting;
      return route.fulfill({
        json: { ...layoutReceipt(1), order: input.order },
      });
    }
    return route.fulfill({
      json: refreshed ? layoutReceipt(3, cardIds.slice(1)) : layoutReceipt(),
    });
  });
  await page.goto("/__test/portfolio-layout");
  await page
    .getByRole("button", { name: "Move Aerospace One later", exact: true })
    .click();
  await page.getByRole("button", { name: "Save order", exact: true }).click();
  await expect.poll(() => held).toBe(true);
  refreshed = true;
  await page.evaluate(() => window.dispatchEvent(new Event("layout-refresh")));
  await expect.poll(() => positions(page)).toEqual(cardIds.slice(1));
  release();
  await expect(
    page.getByRole("button", { name: "Check saved order", exact: true }),
  ).toBeVisible();
  await expect.poll(() => positions(page)).toEqual(cardIds.slice(1));
  await expect(
    page.getByRole("button", { name: /Move Aerospace One/ }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Check saved order", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Use latest saved order", exact: true }),
  ).toBeEnabled();
  expect(writes).toBe(1);
});
test("a failed GET keeps the accessible roster and its unsaved order while refusing writes", async ({
  page,
}) => {
  await layoutFixtures(page);
  let failed = false,
    writes = 0;
  await page.route(endpoint, (route) => {
    if (route.request().method() === "PUT") writes++;
    return failed
      ? route.fulfill({ status: 503, json: { message: "Unavailable" } })
      : route.fulfill({ json: layoutReceipt() });
  });
  await page.goto("/__test/portfolio-layout");
  await page
    .getByRole("button", { name: "Move Aerospace One later", exact: true })
    .click();
  await expect
    .poll(() => positions(page))
    .toEqual([cardIds[1], cardIds[0], cardIds[2]]);
  failed = true;
  await page.evaluate(() => window.dispatchEvent(new Event("layout-refresh")));
  await expect(
    page.getByRole("button", { name: "Retry saved order", exact: true }),
  ).toBeVisible();
  // A failed read leaves the catalog unknown: the accessible roster and the
  // local draft stay visible, but no move or save is offered.
  await expect
    .poll(() => positions(page))
    .toEqual([cardIds[1], cardIds[0], cardIds[2]]);
  await expect(
    page.getByRole("button", { name: "Save order", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Move Civic Two later", exact: true }),
  ).toBeDisabled();
  failed = false;
  await page
    .getByRole("button", { name: "Retry saved order", exact: true })
    .click();
  await expect
    .poll(() => positions(page))
    .toEqual([cardIds[1], cardIds[0], cardIds[2]]);
  await expect(
    page.getByRole("button", { name: "Move Civic Two later", exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "Save order", exact: true }),
  ).toBeEnabled();
  expect(writes).toBe(0);
});
test("an authoritative empty order is never refilled from roster metadata", async ({
  page,
}) => {
  await layoutFixtures(page);
  await page.route(endpoint, (route) =>
    route.fulfill({ json: layoutReceipt(1, []) }),
  );
  await page.goto("/__test/portfolio-layout");
  await expect(page.locator("[data-client-id]")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Move / })).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Save order", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Saved profile ordering is unavailable", { exact: false }),
  ).toHaveCount(0);
});

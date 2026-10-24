import { expect, test } from "@playwright/test";
import { clientId, json } from "./fixtures";
import {
  fit,
  holdResponse,
  installCapabilityBoundary,
  transition,
} from "./capability-boundary-fixtures";

for (const change of ["actor", "client", "role", "invalidate"])
  test(`late fit computation does not publish after ${change} changes`, async ({
    page,
  }) => {
    const unexpected = await installCapabilityBoundary(page);
    const held = await holdResponse(
      page,
      `**/core/clients/${clientId}/capability-fit/refresh`,
      "POST",
      { ...fit, computedAt: "2026-11-01T12:00:00Z" },
    );
    await page.goto("/capability-boundary.html");
    await page.getByRole("button", { name: "Refresh", exact: true }).click();
    await held.started;
    await transition(page, change);
    held.release();
    await held.settled;
    await expect(
      page.getByLabel("Synthetic pending capability writes"),
    ).toHaveText("0");
    await expect(page.getByLabel("Synthetic original fit cache")).toContainText(
      "2026-10-11",
    );
    await expect(
      page.getByLabel("Synthetic original fit cache"),
    ).not.toContainText("2026-11-01");
    expect(held.calls()).toBe(1);
    expect(unexpected).toEqual([]);
  });

test("late fit computation cannot overwrite a newer successful read", async ({
  page,
}) => {
  const unexpected = await installCapabilityBoundary(page);
  const held = await holdResponse(
    page,
    `**/core/clients/${clientId}/capability-fit/refresh`,
    "POST",
    { ...fit, computedAt: "2026-11-01T12:00:00Z" },
  );
  await page.goto("/capability-boundary.html");
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await held.started;
  await page.route(`**/core/clients/${clientId}/capability-fit`, (route) =>
    json(route, { ...fit, computedAt: "2026-11-02T12:00:00Z" }),
  );
  await transition(page, "refetch-fit");
  await expect(page.getByLabel("Synthetic original fit cache")).toContainText(
    "2026-11-02",
  );
  held.release();
  await held.settled;
  await expect(
    page.getByLabel("Synthetic pending capability writes"),
  ).toHaveText("0");
  await expect(page.getByLabel("Synthetic original fit cache")).toContainText(
    "2026-11-02",
  );
  await expect(page.getByRole("alert")).toContainText(
    "Capability fit changed while refreshing",
  );
  await expect(page.getByRole("link", { name: "Open target" })).toBeVisible();
  expect(unexpected).toEqual([]);
});

test("compute failure keeps an independently successful fit read available", async ({
  page,
}) => {
  const unexpected = await installCapabilityBoundary(page);
  await page.route(
    `**/core/clients/${clientId}/capability-fit/refresh`,
    (route) =>
      json(route, { message: "Synthetic computation unavailable" }, 503),
  );
  await page.goto("/capability-boundary.html");
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Synthetic computation unavailable",
  );
  await expect(
    page
      .getByRole("region", { name: "Capability fit", exact: true })
      .locator("summary")
      .filter({ hasText: /^1 fit match available$/ }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Open target" })).toBeVisible();
  expect(unexpected).toEqual([]);
});

test("successful fit computation publishes the validated receipt", async ({
  page,
}) => {
  const unexpected = await installCapabilityBoundary(page);
  await page.route(
    `**/core/clients/${clientId}/capability-fit/refresh`,
    (route) => json(route, { ...fit, computedAt: "2026-11-03T12:00:00Z" }),
  );
  await page.goto("/capability-boundary.html");
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await expect(page.getByLabel("Synthetic original fit cache")).toContainText(
    "2026-11-03",
  );
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Open target" })).toHaveAttribute(
    "href",
    "http://127.0.0.1:5191/existing/program-elements/0604134A",
  );
  expect(unexpected).toEqual([]);
});

import { test, expect } from "@playwright/test";
import { capability, capabilityId, clientId, json } from "./fixtures";
import {
  fit,
  holdResponse,
  installCapabilityBoundary,
  transition,
} from "./capability-boundary-fixtures";

test("capability refresh failure removes cached cards, counts and the open editor", async ({
  page,
}) => {
  const unexpected = await installCapabilityBoundary(page);
  await page.goto(`/capability-boundary.html?capability=${capabilityId}`);
  await expect(
    page.getByRole("dialog", { name: "Capability: Test sensor" }),
  ).toBeVisible();
  await page.getByRole("dialog").getByText("Details", { exact: true }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Name", { exact: true })
    .fill("Stale local draft");
  await page.route(`**/core/clients/${clientId}/capabilities`, (route) =>
    json(route, { message: "Synthetic list denied" }, 403),
  );
  await transition(page, "refetch");
  await expect(page.locator('[role="alert"]')).toHaveCount(1);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByRole("button", { name: /Test sensor/ })).toHaveCount(
    0,
  );
  await expect(page.getByText("1 areas · 1 fielded")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Open target" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Add capability", exact: true }),
  ).toBeDisabled();
  await page.unroute(`**/core/clients/${clientId}/capabilities`);
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(
    page.getByRole("dialog").getByLabel("Name", { exact: true }),
  ).toHaveValue("Test sensor");
  expect(unexpected).toEqual([]);
});

test("fit read failure removes cached targets and computed count", async ({
  page,
}) => {
  const unexpected = await installCapabilityBoundary(page);
  await page.goto("/capability-boundary.html");
  await expect(page.getByRole("link", { name: "Open target" })).toBeVisible();
  await page.route(`**/core/clients/${clientId}/capability-fit`, (route) =>
    json(route, { message: "Synthetic fit denied" }, 403),
  );
  await transition(page, "refetch-fit");
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByRole("link", { name: "Open target" })).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "1 fit matches" }),
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Test sensor/ })).toBeVisible();
  await page.unroute(`**/core/clients/${clientId}/capability-fit`);
  await page.route(`**/core/clients/${clientId}/capability-fit`, (route) =>
    json(route, fit),
  );
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByRole("link", { name: "Open target" })).toBeVisible();
  expect(unexpected).toEqual([]);
});

test("editing rejects a receipt for another capability without closing the draft", async ({
  page,
}) => {
  const unexpected = await installCapabilityBoundary(page);
  await page.route(
    `**/core/clients/${clientId}/capabilities/${capabilityId}`,
    (route) =>
      json(route, {
        ...capability,
        id: "40000000-0000-4000-8000-000000000002",
      }),
  );
  await page.goto(`/capability-boundary.html?capability=${capabilityId}`);
  const dialog = page.getByRole("dialog", { name: "Capability: Test sensor" });
  await dialog.getByText("Details", { exact: true }).click();
  await dialog
    .getByLabel("Name", { exact: true })
    .fill("Retained synthetic draft");
  await dialog
    .getByRole("button", { name: "Save capability", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toBeVisible();
  await expect(dialog.getByLabel("Name", { exact: true })).toHaveValue(
    "Retained synthetic draft",
  );
  expect(unexpected).toEqual([]);
});

test("late fit refresh cannot update the cache after the view unmounts", async ({
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
  await expect(page.getByRole("link", { name: "Open target" })).toBeVisible();
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await held.started;
  await transition(page, "unmount");
  await expect(page.getByText("Capability view unmounted")).toBeVisible();
  held.release();
  await held.settled;
  await expect(
    page.getByLabel("Synthetic pending capability writes"),
  ).toHaveText("0");
  await expect(
    page.getByLabel("Synthetic original fit cache"),
  ).not.toContainText("2026-11-01");
  await expect(page.getByLabel("Synthetic original fit cache")).toContainText(
    "2026-10-11",
  );
  expect(unexpected).toEqual([]);
});

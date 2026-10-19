import { expect, test } from "@playwright/test";
import { clientId, json } from "./fixtures";
import { holdResponse, transition } from "./capability-boundary-fixtures";
import {
  installRegistrationBoundary,
  openRegistrations,
  registrationClient,
} from "./capability-registration-fixtures";

test("registration client refresh failure removes the retained editor and values", async ({
  page,
}) => {
  const unexpected = await installRegistrationBoundary(page);
  const dialog = await openRegistrations(page, true);
  await expect(dialog.getByLabel("UEI", { exact: true })).toHaveValue(
    registrationClient.uei,
  );
  await page.route(`**/core/clients/${clientId}`, (route) =>
    json(route, { message: "Synthetic client denied" }, 403),
  );
  await transition(page, "refetch-client");
  await expect(dialog.getByRole("alert")).toBeVisible();
  await expect(dialog.locator("form")).toHaveCount(0);
  await expect(
    dialog.getByText(registrationClient.uei, { exact: true }),
  ).toHaveCount(0);
  await expect(
    dialog.getByRole("button", { name: "Edit registrations", exact: true }),
  ).toHaveCount(0);
  expect(unexpected).toEqual([]);
});

test("registration identity invalidation disables the cached administrator editor", async ({
  page,
}) => {
  const unexpected = await installRegistrationBoundary(page);
  const dialog = await openRegistrations(page, true);
  await transition(page, "invalidate");
  await expect(
    dialog.getByRole("button", { name: "Save registrations", exact: true }),
  ).toBeDisabled();
  expect(unexpected).toEqual([]);
});

test("registration save rejects a receipt for another client and retains the draft", async ({
  page,
}) => {
  const unexpected = await installRegistrationBoundary(page);
  await page.route(`**/core/clients/${clientId}`, (route) =>
    route.request().method() === "PUT"
      ? json(route, {
          ...registrationClient,
          id: "10000000-0000-4000-8000-000000000099",
        })
      : route.fallback(),
  );
  const dialog = await openRegistrations(page, true);
  await dialog.getByLabel("UEI", { exact: true }).fill("EEEEFFFF9012");
  await dialog
    .getByRole("button", { name: "Save registrations", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toBeVisible();
  await expect(dialog.getByLabel("UEI", { exact: true })).toHaveValue(
    "EEEEFFFF9012",
  );
  expect(unexpected).toEqual([]);
});

test("late registration save cannot invalidate its original cache after unmount", async ({
  page,
}) => {
  const unexpected = await installRegistrationBoundary(page);
  const held = await holdResponse(
    page,
    `**/core/clients/${clientId}`,
    "PUT",
    registrationClient,
  );
  const dialog = await openRegistrations(page, true);
  await dialog
    .getByRole("button", { name: "Save registrations", exact: true })
    .click();
  await held.started;
  await transition(page, "unmount");
  held.release();
  await held.settled;
  await expect(
    page.getByLabel("Synthetic pending capability writes"),
  ).toHaveText("0");
  await expect(
    page.getByLabel("Synthetic original client cache"),
  ).toContainText('"isInvalidated":false');
  expect(unexpected).toEqual([]);
});

import { expect, test } from "@playwright/test";
import { clientId, json } from "./fixtures";
import { transition } from "./capability-boundary-fixtures";
import {
  installRegistrationBoundary,
  openRegistrations,
  registrationClient,
} from "./capability-registration-fixtures";

for (const editing of [false, true])
  for (const status of [403, 503])
    test(`registration ${editing ? "editor" : "read view"} recovers from a cached HTTP ${status} failure`, async ({
      page,
    }) => {
      const unexpected = await installRegistrationBoundary(page);
      const dialog = await openRegistrations(page, editing);
      if (editing)
        await dialog.getByLabel("UEI", { exact: true }).fill("EEEEFFFF9012");
      else
        await expect(
          dialog.getByText(registrationClient.uei, { exact: true }),
        ).toBeVisible();
      await page.route(`**/core/clients/${clientId}`, (route) =>
        json(route, { message: "Synthetic current client failure" }, status),
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
      await page.route(`**/core/clients/${clientId}`, (route) =>
        json(route, { ...registrationClient, uei: "MMMMNNNN7890" }),
      );
      await dialog.getByRole("button", { name: "Retry", exact: true }).click();
      await expect(dialog.getByRole("alert")).toHaveCount(0);
      if (editing)
        await expect(dialog.getByLabel("UEI", { exact: true })).toHaveValue(
          "MMMMNNNN7890",
        );
      else
        await expect(
          dialog.getByText("MMMMNNNN7890", { exact: true }),
        ).toBeVisible();
      expect(unexpected).toEqual([]);
    });

test("registration read rejects a successful response for another native client", async ({
  page,
}) => {
  const unexpected = await installRegistrationBoundary(page);
  await page.route(`**/core/clients/${clientId}`, (route) =>
    json(route, {
      ...registrationClient,
      id: "10000000-0000-4000-8000-000000000099",
    }),
  );
  const dialog = await openRegistrations(page);
  await expect(dialog.getByRole("alert")).toContainText("another client");
  await expect(
    dialog.getByText(registrationClient.uei, { exact: true }),
  ).toHaveCount(0);
  await expect(
    dialog.getByRole("button", { name: "Edit registrations", exact: true }),
  ).toHaveCount(0);
  expect(unexpected).toEqual([]);
});

test("a changed registration snapshot replaces stale inputs while unrelated notes preserve the local draft", async ({
  page,
}) => {
  const unexpected = await installRegistrationBoundary(page);
  const dialog = await openRegistrations(page, true);
  await dialog.getByLabel("UEI", { exact: true }).fill("EEEEFFFF9012");
  await page.route(`**/core/clients/${clientId}`, (route) =>
    json(route, {
      ...registrationClient,
      intakeData: {
        ...registrationClient.intakeData,
        profileNotes: "New independent notes",
      },
    }),
  );
  await transition(page, "refetch-client");
  await expect(
    page.getByLabel("Synthetic original client cache"),
  ).toContainText("New independent notes");
  await expect(dialog.getByLabel("UEI", { exact: true })).toHaveValue(
    "EEEEFFFF9012",
  );
  await page.route(`**/core/clients/${clientId}`, (route) =>
    json(route, { ...registrationClient, uei: "MMMMNNNN7890" }),
  );
  await transition(page, "refetch-client");
  await expect(dialog.getByLabel("UEI", { exact: true })).toHaveValue(
    "MMMMNNNN7890",
  );
  expect(unexpected).toEqual([]);
});

test("closing registrations discards its edit lifetime and reopens from the current client", async ({
  page,
}) => {
  const unexpected = await installRegistrationBoundary(page);
  const dialog = await openRegistrations(page, true);
  await dialog.getByLabel("UEI", { exact: true }).fill("EEEEFFFF9012");
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await page
    .getByRole("button", { name: "Registrations & codes", exact: true })
    .click();
  await expect(dialog.locator("form")).toHaveCount(0);
  await expect(
    dialog.getByText(registrationClient.uei, { exact: true }),
  ).toBeVisible();
  await dialog
    .getByRole("button", { name: "Edit registrations", exact: true })
    .click();
  await expect(dialog.getByLabel("UEI", { exact: true })).toHaveValue(
    registrationClient.uei,
  );
  expect(unexpected).toEqual([]);
});

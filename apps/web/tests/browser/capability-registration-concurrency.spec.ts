import { expect, test } from "@playwright/test";
import { clientId, json } from "./fixtures";
import { holdResponse, transition } from "./capability-boundary-fixtures";
import {
  installRegistrationBoundary,
  openRegistrations,
  registrationClient,
} from "./capability-registration-fixtures";

for (const change of ["denied", "replaced", "pending"])
  test(`registration receipt cannot publish after a ${change} client read during its PUT`, async ({
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
    const newClient = { ...registrationClient, uei: "MMMMNNNN7890" };
    const reading =
      change === "pending"
        ? await holdResponse(
            page,
            `**/core/clients/${clientId}`,
            "GET",
            newClient,
          )
        : undefined;
    if (!reading)
      await page.route(`**/core/clients/${clientId}`, (route) => {
        if (route.request().method() !== "GET") return route.fallback();
        return change === "denied"
          ? json(route, { message: "Synthetic denied client" }, 403)
          : json(route, newClient);
      });
    await transition(page, "refetch-client");
    if (reading) await reading.started;
    else if (change === "denied")
      await expect(dialog.getByRole("alert")).toBeVisible();
    else
      await expect(dialog.getByLabel("UEI", { exact: true })).toHaveValue(
        newClient.uei,
      );
    const cached = page.getByLabel("Synthetic original client cache");
    if (change === "denied")
      await expect(cached).toContainText('"status":"error"');
    if (change === "replaced")
      await expect(cached).toContainText(newClient.uei);
    const beforeReceipt = await cached.textContent();
    held.release();
    await held.settled;
    await expect(
      page.getByLabel("Synthetic pending capability writes"),
    ).toHaveText("0");
    if (reading) {
      reading.release();
      await reading.settled;
      await expect(dialog.getByLabel("UEI", { exact: true })).toHaveValue(
        newClient.uei,
      );
    }
    // Query 5.104.1 marks background errors invalidated itself. Compare the
    // entire failed/replaced state to prove this receipt caused no effects.
    if (reading) await expect(cached).toContainText('"isInvalidated":false');
    else await expect(cached).toHaveText(beforeReceipt!);
    await expect(dialog.getByRole("alert")).toBeVisible();
    if (change === "denied")
      await expect(dialog.locator("form")).toHaveCount(0);
    else
      await expect(dialog.getByRole("alert")).toContainText(
        "changed while saving",
      );
    expect(held.calls()).toBe(1);
    expect(unexpected).toEqual([]);
  });

test("registration save does not dismiss a failed confirmation read as successful current data", async ({
  page,
}) => {
  const unexpected = await installRegistrationBoundary(page);
  let acknowledged = false;
  await page.route(`**/core/clients/${clientId}`, (route) => {
    if (route.request().method() === "PUT") {
      acknowledged = true;
      return json(route, registrationClient);
    }
    return acknowledged
      ? json(route, { message: "Synthetic confirmation read denied" }, 403)
      : json(route, registrationClient);
  });
  const dialog = await openRegistrations(page, true);
  await dialog
    .getByRole("button", { name: "Save registrations", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toBeVisible();
  await expect(dialog.locator("form")).toHaveCount(0);
  await expect(
    dialog.getByText(registrationClient.uei, { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByLabel("Synthetic pending capability writes"),
  ).toHaveText("0");
  expect(acknowledged).toBe(true);
  expect(unexpected).toEqual([]);
});

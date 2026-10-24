import { expect, test } from "@playwright/test";
import { clientId, json } from "./fixtures";
import { holdResponse, transition } from "./capability-boundary-fixtures";
import {
  installRegistrationBoundary,
  openRegistrations,
  registrationClient,
} from "./capability-registration-fixtures";

for (const change of [
  "standard-role",
  "role",
  "invalidate",
  "refetch-identity",
])
  test(`registration write rechecks the native administrator gate after ${change}`, async ({
    page,
  }) => {
    const unexpected = await installRegistrationBoundary(page);
    let writes = 0;
    await page.route(`**/core/clients/${clientId}`, (route) => {
      if (route.request().method() !== "PUT") return route.fallback();
      writes += 1;
      return json(route, registrationClient);
    });
    const dialog = await openRegistrations(page, true);
    if (change === "refetch-identity")
      await page.route("**/core/me", (route) =>
        json(route, { message: "Synthetic identity denied" }, 403),
      );
    await transition(page, change);
    await expect(
      dialog.getByRole("button", { name: "Save registrations", exact: true }),
    ).toBeDisabled();
    await expect(dialog.getByLabel("UEI", { exact: true })).toBeDisabled();
    await dialog
      .locator("form")
      .evaluate((form: HTMLFormElement) => form.requestSubmit());
    await expect(
      page.getByLabel("Synthetic pending capability writes"),
    ).toHaveText("0");
    await expect(dialog.getByRole("alert").first()).toBeVisible();
    expect(writes).toBe(0);
    expect(unexpected).toEqual([]);
  });

for (const change of ["actor", "standard-role", "invalidate", "client"])
  test(`late registration receipt has no old-view effects after ${change}`, async ({
    page,
  }) => {
    const unexpected = await installRegistrationBoundary(page);
    let reads = 0;
    let completedReads = 0;
    page.on("response", (response) => {
      if (
        response.request().method() === "GET" &&
        response.url().endsWith(`/core/clients/${clientId}`) &&
        response.status() === 200
      )
        completedReads += 1;
    });
    await page.route(`**/core/clients/${clientId}`, (route) => {
      if (route.request().method() !== "GET") return route.fallback();
      reads += 1;
      return json(route, registrationClient);
    });
    const held = await holdResponse(
      page,
      `**/core/clients/${clientId}`,
      "PUT",
      registrationClient,
    );
    const dialog = await openRegistrations(page, true);
    await dialog.getByLabel("UEI", { exact: true }).fill("EEEEFFFF9012");
    await dialog
      .getByRole("button", { name: "Save registrations", exact: true })
      .click();
    await held.started;
    await transition(page, change);
    if (change === "client") {
      await expect(
        dialog.getByText("CCCCDDDD5678", { exact: true }),
      ).toBeVisible();
      await expect(dialog.locator("form")).toHaveCount(0);
    }
    // The saved-submissions panel also owns a current-client read. Actor/role
    // replacement legitimately revalidates that separate projection. The held
    // registration write must already be aborted before its receipt is released.
    await expect(
      page.getByLabel("Synthetic pending capability writes"),
    ).toHaveText("0");
    const expectedReads = ["actor", "standard-role"].includes(change) ? 3 : 2;
    // Actor replacement may abort a mounting saved-history read and start its
    // replacement. Count completed reads, then freeze all dispatched requests
    // so that a late write cannot cause any additional refresh.
    await expect.poll(() => completedReads).toBe(expectedReads);
    const dispatchedBeforeReceipt = reads;
    held.release();
    await held.settled;
    await expect(
      page.getByLabel("Synthetic pending capability writes"),
    ).toHaveText("0");
    await expect(
      page.getByLabel("Synthetic original client cache"),
    ).toContainText('"isInvalidated":false');
    if (change !== "client")
      await expect(dialog.getByLabel("UEI", { exact: true })).toHaveValue(
        "EEEEFFFF9012",
      );
    expect(completedReads).toBe(expectedReads);
    expect(reads).toBe(dispatchedBeforeReceipt);
    expect(held.calls()).toBe(1);
    expect(unexpected).toEqual([]);
  });

test("registration save freezes one draft, preserves legacy codes and refreshes exact current values", async ({
  page,
}) => {
  const unexpected = await installRegistrationBoundary(page);
  let current = registrationClient;
  let payload: Record<string, unknown> | undefined;
  await page.route(`**/core/clients/${clientId}`, (route) =>
    route.request().method() === "GET"
      ? json(route, current)
      : route.fallback(),
  );
  page.on("request", (request) => {
    if (
      request.method() === "PUT" &&
      request.url().endsWith(`/core/clients/${clientId}`)
    )
      payload = request.postDataJSON();
  });
  const held = await holdResponse(page, `**/core/clients/${clientId}`, "PUT", {
    ...registrationClient,
    uei: "EEEEFFFF9012",
  });
  const dialog = await openRegistrations(page, true);
  await dialog.getByLabel("UEI", { exact: true }).fill("EEEEFFFF9012");
  await dialog
    .getByLabel("NAICS codes (comma separated)", { exact: true })
    .fill("541330, 541715, 541330");
  await dialog
    .getByRole("button", { name: "Save registrations", exact: true })
    .click();
  await held.started;
  await expect(dialog.getByLabel("UEI", { exact: true })).toBeDisabled();
  await expect(
    dialog.getByRole("button", { name: "Save registrations", exact: true }),
  ).toBeDisabled();
  await expect(
    dialog.getByRole("button", { name: "Cancel", exact: true }),
  ).toBeDisabled();
  await dialog
    .locator("form")
    .evaluate((form: HTMLFormElement) => form.requestSubmit());
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  expect(payload).toEqual({
    uei: "EEEEFFFF9012",
    cageCode: registrationClient.cageCode,
    naicsCodes: ["541330", "541715"],
    pscCodes: registrationClient.pscCodes,
    setAsideCertifications: registrationClient.setAsideCertifications,
  });
  current = { ...registrationClient, ...payload } as typeof registrationClient;
  held.release();
  await held.settled;
  await expect(dialog.locator("form")).toHaveCount(0);
  await expect(dialog.getByText("EEEEFFFF9012", { exact: true })).toBeVisible();
  await expect(
    page.getByLabel("Synthetic original client cache"),
  ).toContainText("Separate concurrent profile notes");
  expect(held.calls()).toBe(1);
  expect(unexpected).toEqual([]);
});

for (const status of [403, 503])
  test(`registration HTTP ${status} write failure preserves the draft and never retries itself`, async ({
    page,
  }) => {
    const unexpected = await installRegistrationBoundary(page);
    let writes = 0;
    await page.route(`**/core/clients/${clientId}`, (route) => {
      if (route.request().method() !== "PUT") return route.fallback();
      writes += 1;
      return json(
        route,
        { message: "Synthetic registration write failure" },
        status,
      );
    });
    const dialog = await openRegistrations(page, true);
    await dialog.getByLabel("UEI", { exact: true }).fill("EEEEFFFF9012");
    await dialog
      .getByRole("button", { name: "Save registrations", exact: true })
      .click();
    await expect(dialog.getByRole("alert")).toBeVisible();
    await expect(dialog.getByLabel("UEI", { exact: true })).toHaveValue(
      "EEEEFFFF9012",
    );
    await expect(
      dialog.getByRole("button", { name: "Save registrations", exact: true }),
    ).toBeEnabled();
    await expect(
      page.getByLabel("Synthetic original client cache"),
    ).toContainText('"isInvalidated":false');
    expect(writes).toBe(1);
    expect(unexpected).toEqual([]);
  });

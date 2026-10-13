import type { Page } from "@playwright/test";
import { client, clientId, json } from "./fixtures";
import {
  installCapabilityBoundary,
  secondClientId,
} from "./capability-boundary-fixtures";

export const registrationClient = {
  ...client,
  status: "active",
  uei: "AAAABBBB1234",
  cageCode: "1ABCD",
  naicsCodes: ["541330"],
  pscCodes: ["R425"],
  setAsideCertifications: ["LEGACY_CODE", "8A"],
  intakeData: {
    profileNotes: "Separate concurrent profile notes",
    ein: "123456789",
    primaryNaics: "541330",
  },
};

export async function installRegistrationBoundary(page: Page) {
  const unexpected = await installCapabilityBoundary(page);
  await page.route(`**/core/clients/${clientId}`, (route) =>
    route.request().method() === "GET"
      ? json(route, registrationClient)
      : route.fallback(),
  );
  await page.route(`**/core/clients/${secondClientId}`, (route) =>
    route.request().method() === "GET"
      ? json(route, {
          ...registrationClient,
          id: secondClientId,
          name: "Second synthetic client",
          uei: "CCCCDDDD5678",
        })
      : route.fallback(),
  );
  return unexpected;
}

export async function openRegistrations(page: Page, edit = false) {
  await page.goto("/capability-boundary.html");
  await page
    .getByRole("button", { name: "Registrations & codes", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Registrations & codes",
    exact: true,
  });
  if (edit)
    await dialog
      .getByRole("button", { name: "Edit registrations", exact: true })
      .click();
  return dialog;
}

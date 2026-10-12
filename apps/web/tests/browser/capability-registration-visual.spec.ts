import { expect, test } from "@playwright/test";
import { clientId, json } from "./fixtures";
import { transition } from "./capability-boundary-fixtures";
import {
  installRegistrationBoundary,
  openRegistrations,
  registrationClient,
} from "./capability-registration-fixtures";

for (const screen of [
  {
    name: "desktop-light",
    width: 1440,
    height: 1040,
    colorScheme: "light" as const,
  },
  { name: "phone-dark", width: 390, height: 844, colorScheme: "dark" as const },
])
  test(`registration current-read and edit states render at ${screen.name}`, async ({
    page,
  }, info) => {
    const unexpected = await installRegistrationBoundary(page);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.text().includes("Cannot update a component"))
        errors.push(message.text());
    });
    await page.setViewportSize({ width: screen.width, height: screen.height });
    await page.emulateMedia({ colorScheme: screen.colorScheme });
    const dialog = await openRegistrations(page);
    await expect(
      dialog.getByText(registrationClient.uei, { exact: true }),
    ).toBeVisible();
    expect(
      await dialog.evaluate(
        (element) => element.scrollWidth <= element.clientWidth + 1,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`registration-read-${screen.name}.png`),
      fullPage: true,
    });
    await dialog
      .getByRole("button", { name: "Edit registrations", exact: true })
      .click();
    await expect(dialog.getByLabel("UEI", { exact: true })).toBeEnabled();
    await page.route(`**/core/clients/${clientId}`, (route) =>
      route.request().method() === "PUT"
        ? json(route, {
            ...registrationClient,
            id: "10000000-0000-4000-8000-000000000099",
          })
        : route.fallback(),
    );
    await dialog
      .getByRole("button", { name: "Save registrations", exact: true })
      .click();
    await expect(dialog.getByRole("alert")).toBeVisible();
    await dialog
      .getByRole("button", { name: "Save registrations", exact: true })
      .scrollIntoViewIfNeeded();
    expect(
      await dialog.evaluate(
        (element) => element.scrollWidth <= element.clientWidth + 1,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`registration-edit-error-${screen.name}.png`),
      fullPage: true,
    });
    await page.route(`**/core/clients/${clientId}`, (route) =>
      json(route, { message: "Synthetic registration read denied" }, 403),
    );
    await transition(page, "refetch-client");
    await expect(dialog.locator("form")).toHaveCount(0);
    await expect(dialog.getByRole("alert")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`registration-read-error-${screen.name}.png`),
      fullPage: true,
    });
    expect(errors).toEqual([]);
    expect(unexpected).toEqual([]);
  });

import { expect, test, type Route } from "@playwright/test";
import { hqOperations } from "@/shared/capiro/operations/settings-admin/hq";

// Schema-valid but wrong slug: exercise the real semantic receipt guard.
const receipt = hqOperations["settings.hq.tenants.create"].response.parse({
  tenant: {
    id: "synthetic-tenant-id",
    slug: "wrong",
    name: "Synthetic tenant",
    status: "active",
    createdAt: "2026-10-22T00:00:00.000Z",
  },
  invitation: {
    id: "synthetic-invitation-id",
    email: "synthetic@example.test",
    status: "pending",
    createdAt: "2026-10-22T00:00:00.000Z",
    expiresAt: null,
  },
  clerkOrgId: "synthetic-org",
});

// O209: same two scenarios and eight assertion outcomes as security-form.test.tsx.
// The original Vitest source stays byte-for-byte unchanged.
test("all dismiss paths are ignored while a security dialog is busy", async ({
  page,
}) => {
  await page.goto("/settings-security-form.html?busy-dialog");
  const dialog = page.getByRole("dialog", { name: "Delete", exact: true });
  await dialog.waitFor();
  const close = dialog.getByRole("button", {
    name: "Close dialog",
    exact: true,
  });
  // Native disabled-button .click() matches the original test's DOM operation.
  await close.evaluate((button: HTMLButtonElement) => button.click());
  await page.keyboard.press("Escape");
  await page
    .locator('[data-slot="dialog-overlay"]')
    .click({ position: { x: 4, y: 4 } });
  expect(await page.evaluate(() => window.__settingsForm.closeCalls)).toBe(0); // 1
  expect(
    await close.evaluate((button: HTMLButtonElement) => button.disabled),
  ).toBe(true); // 2
});

test("tenant creation freezes fields and close controls until the exact receipt is accepted", async ({
  page,
}) => {
  let requests = 0;
  let capture!: (route: Route) => void;
  const pending = new Promise<Route>((resolve) => {
    capture = resolve;
  });
  await page.route("**/api/**", async (route) => {
    if (
      new URL(route.request().url()).pathname !==
        "/api/capiro/settings.hq.tenants.create" ||
      route.request().method() !== "POST"
    ) {
      await route.abort();
      throw new Error(
        "Unexpected API request in isolated Settings form harness",
      );
    }
    requests += 1;
    capture(route);
  });
  await page.goto("/settings-security-form.html");
  const dialog = page.getByRole("dialog", {
    name: "Create tenant + invite admin",
    exact: true,
  });
  // Real transport validates inputs; the original's mocked API allowed empty fields.
  await dialog
    .getByLabel("Tenant slug", { exact: true })
    .fill("synthetic-tenant");
  await dialog
    .getByLabel("Display name", { exact: true })
    .fill("Synthetic tenant");
  await dialog
    .getByLabel("Admin email", { exact: true })
    .fill("synthetic@example.test");
  await dialog
    .getByRole("button", { name: "Create + send invite", exact: true })
    .click();
  await expect.poll(() => requests).toBe(1); // 3
  const route = await pending;
  expect(
    await dialog
      .locator("input")
      .evaluateAll((inputs: HTMLInputElement[]) =>
        inputs.every((input) => input.disabled),
      ),
  ).toBe(true); // 4
  await page.keyboard.press("Escape");
  expect(await page.evaluate(() => window.__settingsForm.closeCalls)).toBe(0); // 5

  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(receipt),
  });
  // Await completed refusal before observing callbacks; pending zeros are not proof.
  await dialog
    .getByText("The result is not confirmed.", { exact: false })
    .waitFor();
  expect(await page.evaluate(() => window.__settingsForm.closeCalls)).toBe(0); // 6
  expect(await page.evaluate(() => window.__settingsForm.refreshCalls)).toBe(0); // 7
  expect(await page.locator("body").textContent()).toContain("not confirmed"); // 8
});

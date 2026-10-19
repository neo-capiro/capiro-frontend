import { expect, test, type Locator, type Page } from "@playwright/test";
import { settingsFixture } from "./settings-mutation-fixtures";

async function holdResponse(page: Page, operation: string) {
  let finish!: (response: { status: number; json: object }) => void;
  const response = new Promise<{ status: number; json: object }>((resolve) => {
    finish = resolve;
  });
  const requests: unknown[] = [];
  await page.route(`**/api/capiro/${operation}`, async (route) => {
    requests.push(route.request().postDataJSON());
    await route.fulfill(await response);
  });
  return { requests, finish };
}

async function assertPendingDialog(page: Page, dialog: Locator) {
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Close dialog" }).click();
  await expect(dialog).toBeVisible();
  await page.mouse.click(4, 4);
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Cancel" })).toBeDisabled();
  await dialog.locator("form").evaluate((form: HTMLFormElement) => {
    form.requestSubmit();
    form.requestSubmit();
  });
}

for (const outcome of ["success", "refusal"] as const) {
  test(`Team invitation preserves the submitted draft through pending ${outcome}`, async ({
    page,
  }, testInfo) => {
    await settingsFixture(page);
    const pending = await holdResponse(page, "settings.team.invite");
    await page.goto("/settings/team");
    await page.getByRole("button", { name: "+ Add team member" }).click();
    const dialog = page.getByRole("dialog", { name: "Add team member" });
    await dialog.getByLabel("First name").fill("Synthetic");
    await dialog.getByLabel("Last name").fill("Colleague");
    await dialog
      .getByLabel("Email", { exact: true })
      .fill("colleague@example.test");
    await dialog.getByRole("combobox").selectOption("user_admin");
    await dialog.getByRole("button", { name: "Send invitation" }).click();
    await expect.poll(() => pending.requests.length).toBe(1);
    await assertPendingDialog(page, dialog);
    for (const label of ["First name", "Last name", "Email"])
      await expect(dialog.getByLabel(label, { exact: true })).toBeDisabled();
    await expect(dialog.getByRole("combobox")).toBeDisabled();
    expect(pending.requests).toEqual([
      {
        body: {
          email: "colleague@example.test",
          firstName: "Synthetic",
          lastName: "Colleague",
          role: "user_admin",
        },
      },
    ]);
    await page.screenshot({
      path: testInfo.outputPath("invitation-pending.png"),
    });
    pending.finish(
      outcome === "success"
        ? {
            status: 200,
            json: {
              status: "invited",
              invitation: {
                id: "synthetic-invitation",
                email: "colleague@example.test",
                role: "user_admin",
                createdAt: "2026-10-19T12:00:00.000Z",
                expiresAt: null,
              },
            },
          }
        : { status: 409, json: { message: "Synthetic invitation refusal" } },
    );
    if (outcome === "success") {
      await expect(dialog).toHaveCount(0);
      await page.getByRole("button", { name: "+ Add team member" }).click();
      for (const label of ["First name", "Last name", "Email"])
        await expect(dialog.getByLabel(label, { exact: true })).toHaveValue("");
    } else {
      await expect(dialog.getByRole("alert")).toContainText(
        "Synthetic invitation refusal",
      );
      await expect(dialog.getByLabel("Email", { exact: true })).toHaveValue(
        "colleague@example.test",
      );
      await expect(dialog.getByLabel("First name")).toHaveValue("Synthetic");
      await expect(dialog.getByLabel("Last name")).toHaveValue("Colleague");
      await expect(dialog.getByRole("combobox")).toHaveValue("user_admin");
      for (const label of ["First name", "Last name", "Email"])
        await expect(dialog.getByLabel(label, { exact: true })).toBeEnabled();
      await expect(dialog.getByRole("combobox")).toBeEnabled();
    }
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    expect(pending.requests).toHaveLength(1);
  });

  test(`Integration registration preserves the submitted account through pending ${outcome}`, async ({
    page,
  }, testInfo) => {
    await settingsFixture(page);
    const pending = await holdResponse(page, "settings.integrations.create");
    await page.goto("/settings/integrations");
    const card = page.locator("section").filter({
      has: page.getByRole("heading", { name: "Microsoft 365", exact: true }),
    });
    await card.getByRole("button", { name: "+ Register account" }).click();
    const dialog = page.getByRole("dialog", {
      name: "Register account",
      exact: true,
    });
    await dialog.getByLabel("Account email").fill("account@example.test");
    await dialog.getByLabel("Display name").fill("Synthetic account");
    await dialog
      .getByRole("button", { name: "Register account", exact: true })
      .click();
    await expect.poll(() => pending.requests.length).toBe(1);
    await assertPendingDialog(page, dialog);
    for (const label of ["Account email", "Display name"])
      await expect(dialog.getByLabel(label)).toBeDisabled();
    await expect(dialog.getByLabel("Provider")).toHaveValue("Microsoft 365");
    expect(pending.requests).toEqual([
      {
        body: {
          provider: "microsoft_365",
          accountEmail: "account@example.test",
          displayName: "Synthetic account",
        },
      },
    ]);
    await page.screenshot({
      path: testInfo.outputPath("registration-pending.png"),
    });
    pending.finish(
      outcome === "success"
        ? {
            status: 200,
            json: {
              id: "40000000-0000-4000-8000-000000000001",
              provider: "microsoft_365",
              accountEmail: "account@example.test",
              displayName: "Synthetic account",
              status: "needs_configuration",
              scopes: [],
              lastSyncAt: null,
              lastError: null,
            },
          }
        : { status: 409, json: { message: "Synthetic registration refusal" } },
    );
    if (outcome === "success") {
      await expect(dialog).toHaveCount(0);
      await card.getByRole("button", { name: "+ Register account" }).click();
      for (const label of ["Account email", "Display name"])
        await expect(dialog.getByLabel(label)).toHaveValue("");
    } else {
      await expect(dialog.getByRole("alert")).toContainText(
        "Synthetic registration refusal",
      );
      await expect(dialog.getByLabel("Account email")).toHaveValue(
        "account@example.test",
      );
      await expect(dialog.getByLabel("Display name")).toHaveValue(
        "Synthetic account",
      );
      for (const label of ["Account email", "Display name"])
        await expect(dialog.getByLabel(label)).toBeEnabled();
    }
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toHaveCount(0);
    expect(pending.requests).toHaveLength(1);
  });
}

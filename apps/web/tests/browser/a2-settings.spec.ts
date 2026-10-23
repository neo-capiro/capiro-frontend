import { expect, test, type Page } from "@playwright/test";
import { settingsFixture } from "./a2-settings-fixtures";

const failures = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => {
  const errors: string[] = [];
  failures.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      /same key|Invalid hook|Maximum update depth|React has detected/.test(
        message.text(),
      )
    )
      errors.push(message.text());
  });
});
test.afterEach(({ page }) => expect(failures.get(page)).toEqual([]));

test("Team keeps a definitive rejection after current authority refresh and revokes the screen on permission loss", async ({
  page,
}) => {
  const f = await settingsFixture(page);
  let revoke = false;
  f.handlers.set("settings.team.setBillingAdmin", async (route) => {
    if (revoke) f.data.identity.role = "standard_user";
    await route.fulfill({
      status: 403,
      json: { message: "Synthetic billing grant refused" },
    });
  });
  await f.open();
  const toggle = page.getByRole("switch", {
    name: "Billing admin for target@example.test",
  });
  await toggle.click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Synthetic billing grant refused" }),
  ).toBeVisible();
  await expect(toggle).toBeEnabled();
  expect(
    f.requests.filter((r) => r.operation === "me.read").length,
  ).toBeGreaterThan(1);
  revoke = true;
  await toggle.click();
  await expect(
    page.getByText("Administrator access required", { exact: true }),
  ).toBeVisible();
  await expect(toggle).toHaveCount(0);
  expect(f.writes()).toHaveLength(2);
  expect(f.unexpected).toEqual([]);
});

test("a lost Team response stays fenced after reload even when another write produced equal state", async ({
  page,
}) => {
  const f = await settingsFixture(page);
  f.handlers.set("settings.team.setBillingAdmin", async (route) => {
    f.data.members[0]!.billingAdmin = true;
    await route.abort("failed");
  });
  await f.open();
  await page
    .getByRole("switch", { name: "Billing admin for target@example.test" })
    .click();
  await expect(
    page.getByText("Check the last change", { exact: true }),
  ).toBeVisible();
  await page.reload();
  const toggle = page.getByRole("switch", {
    name: "Billing admin for target@example.test",
  });
  await expect(toggle).toBeChecked();
  await expect(toggle).toBeDisabled();
  await page.getByRole("button", { name: "Check current result" }).click();
  await expect(
    page.getByText("The result is not confirmed.", { exact: false }).first(),
  ).toBeVisible();
  await expect(toggle).toBeDisabled();
  expect(f.writes()).toHaveLength(1);
  expect(f.unexpected).toEqual([]);
});

test("member removal blocks dismiss and duplicate submission, then uses delivered receipt plus delayed current read", async ({
  page,
}) => {
  const f = await settingsFixture(page);
  let release!: () => void;
  const response = new Promise<void>((resolve) => {
    release = resolve;
  });
  f.handlers.set("settings.team.remove", async (route) => {
    await response;
    await route.fulfill({ json: { jobId: "synthetic-job" } });
  });
  await f.open();
  await page.getByRole("button", { name: "Remove", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Remove team member" });
  const submit = dialog.getByRole("button", {
    name: "Remove member",
    exact: true,
  });
  await submit.dblclick();
  await expect.poll(() => f.writes().length).toBe(1);
  await expect(
    dialog.getByRole("button", { name: "Removing…" }),
  ).toBeDisabled();
  await page.keyboard.press("Escape");
  await page
    .locator('[data-slot="dialog-overlay"]')
    .click({ position: { x: 4, y: 4 } });
  await expect(dialog).toBeVisible();
  release();
  await expect(
    page.getByText("Check the last change", { exact: true }).first(),
  ).toBeVisible();
  f.data.members = [];
  await page
    .getByRole("button", { name: "Check current result" })
    .first()
    .click();
  await expect(
    page.getByText("The recorded target now has the requested state.", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "+ Add team member" }),
  ).toBeEnabled();
  expect(f.writes()).toHaveLength(1);
  expect(f.unexpected).toEqual([]);
});

test("invitation resend requires the exact replacement ID before a delayed read can unlock it", async ({
  page,
}) => {
  const f = await settingsFixture(page);
  f.handlers.set("settings.team.resend", async (route) => {
    await route.fulfill({ json: { invitationId: "synthetic-replacement" } });
  });
  await f.open();
  await page.getByRole("tab", { name: "Pending invitations (1)" }).click();
  await page.getByRole("button", { name: "Resend invitation" }).click();
  await expect(
    page.getByText("Check the last change", { exact: true }).first(),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Check current result" })
    .first()
    .click();
  await expect(
    page.getByText("Check the last change", { exact: true }).first(),
  ).toBeVisible();
  f.data.invitations[0]!.id = "synthetic-replacement";
  await page
    .getByRole("button", { name: "Check current result" })
    .first()
    .click();
  await expect(
    page.getByText("The recorded target now has the requested state.", {
      exact: false,
    }),
  ).toBeVisible();
  expect(f.writes()).toHaveLength(1);
  expect(f.writes()[0]?.input).toEqual({
    params: { invitationId: "synthetic-invitation" },
  });
  expect(f.unexpected).toEqual([]);
});

test("role change accepts only the selected member receipt and retains an uncertain wrong-member result", async ({
  page,
}) => {
  const f = await settingsFixture(page);
  let wrongMember = false;
  f.handlers.set("settings.team.setRole", async (route) => {
    const input = route.request().postDataJSON();
    f.data.members[0]!.role = input.body.role;
    await route.fulfill({
      json: {
        role: input.body.role,
        member: {
          clerkUserId: "synthetic-clerk",
          localUserId: wrongMember
            ? "00000073-1111-4111-8111-111111111111"
            : "00000072-1111-4111-8111-111111111111",
          membershipId: "synthetic-member",
          userCreated: false,
          membershipCreated: false,
          membershipRoleUpdated: true,
        },
      },
    });
  });
  await f.open();
  const role = page.getByRole("combobox", {
    name: "Role for target@example.test",
  });
  await role.click();
  await page
    .getByRole("option", { name: "Standard user", exact: true })
    .click();
  await expect(role).toContainText("Standard user");
  await expect(role).toBeEnabled();
  wrongMember = true;
  await role.click();
  await page.getByRole("option", { name: "User admin", exact: true }).click();
  await expect(
    page.getByText("Check the last change", { exact: true }),
  ).toBeVisible();
  await expect(role).toBeDisabled();
  expect(f.writes()).toHaveLength(2);
  expect(f.unexpected).toEqual([]);
});

test("billing refresh refuses a changed flow before creating any hosted session", async ({
  page,
}) => {
  const f = await settingsFixture(page);
  await f.open("billing");
  const add = page.getByRole("button", { name: "Add profiles", exact: true });
  await expect(add).toBeEnabled();
  f.data.summary.hasSubscription = false;
  f.data.summary.status = "none";
  f.data.state.status = "none";
  await add.click();
  await expect(
    page.getByText("Billing details changed or this action is unavailable.", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Start subscription" }),
  ).toBeEnabled();
  expect(f.writes()).toHaveLength(0);
  expect(f.unexpected).toEqual([]);
});

test("checkout holds controls during dispatch and rejects an unrelated hosted destination without replay", async ({
  page,
}) => {
  const f = await settingsFixture(page);
  f.data.summary.hasSubscription = false;
  f.data.summary.status = "none";
  f.data.state.status = "none";
  let release!: () => void;
  const response = new Promise<void>((resolve) => {
    release = resolve;
  });
  f.handlers.set("settings.billing.checkout", async (route) => {
    await response;
    await route.fulfill({
      json: { url: "https://billing.stripe.com/synthetic-wrong-flow" },
    });
  });
  await f.open("billing");
  await page
    .getByRole("button", { name: "Start subscription", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Start subscription",
    exact: true,
  });
  await dialog.getByLabel("Total profiles").fill("17");
  await dialog
    .getByLabel("Access or promotion code (optional)")
    .fill("SYNTHETIC");
  await dialog.getByRole("button", { name: "Review checkout" }).dblclick();
  await expect.poll(() => f.writes().length).toBe(1);
  await expect(dialog.getByLabel("Total profiles")).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  release();
  await expect(
    page.getByText("Check the last change", { exact: true }),
  ).toBeVisible();
  await expect(page).toHaveURL(/a2-settings.html/);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Start subscription", exact: true }),
  ).toBeDisabled();
  expect(f.writes()).toHaveLength(1);
  expect(f.writes()[0]?.input).toEqual({
    body: { quantity: 17, promoCode: "SYNTHETIC" },
  });
  expect(f.unexpected).toEqual([]);
});

test("cancellation is explicit hosted navigation and never claims the subscription was cancelled", async ({
  page,
}) => {
  const f = await settingsFixture(page);
  let providerNavigations = 0;
  await page.route("https://billing.stripe.com/**", async (route) => {
    providerNavigations += 1;
    await route.fulfill({
      contentType: "text/html",
      body: "<h1>Synthetic hosted billing</h1>",
    });
  });
  f.handlers.set("settings.billing.portal", async (route) => {
    await route.fulfill({
      json: { url: "https://billing.stripe.com/synthetic-session" },
    });
  });
  await f.open("billing");
  await page.getByRole("button", { name: "Cancel plan", exact: true }).click();
  const dialog = page.getByRole("dialog", {
    name: "Cancel Capiro?",
    exact: true,
  });
  await expect(
    dialog.getByText("Your plan changes only after", { exact: false }),
  ).toBeVisible();
  expect(f.writes()).toHaveLength(0);
  await dialog.getByRole("button", { name: "Open billing portal" }).click();
  await expect(
    page.getByRole("heading", { name: "Synthetic hosted billing" }),
  ).toBeVisible();
  expect(providerNavigations).toBe(1);
  expect(f.writes().map((entry) => entry.operation)).toEqual([
    "settings.billing.portal",
  ]);
  expect(f.unexpected).toEqual([]);
});

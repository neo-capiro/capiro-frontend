import { test, expect } from "@playwright/test";
import { onlyLocalRequests, operationFixtures, testIdentity } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await onlyLocalRequests(page);
});

test("Personal saves the title only after a validated response and keeps signature uploads separate", async ({
  page,
}) => {
  let identity = testIdentity;
  const writes: unknown[] = [];
  await operationFixtures(page, {
    "me.read": () => identity,
    "me.update": (input) => {
      writes.push(input);
      identity = {
        ...identity,
        user: {
          ...identity.user,
          title: (input as { body: { title: string } }).body.title,
        },
      };
      return identity;
    },
    "me.emailSignature.read": { html: null, enabled: false },
  });
  await page.goto("/settings/personal");
  await expect(
    page.getByRole("heading", { name: "Personal", exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Title", { exact: true })
    .fill("Policy technology lead");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue(
    "Policy technology lead",
  );
  expect(writes).toEqual([{ body: { title: "Policy technology lead" } }]);
  await expect(
    page.getByRole("button", { name: "Save signature", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Explicit local test fixture")).toBeVisible();
});

test("Team does not fetch private records for a standard user", async ({
  page,
}) => {
  const forbidden: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("settings.team")) forbidden.push(request.url());
  });
  await operationFixtures(page, {
    "me.read": { ...testIdentity, role: "standard_user", billingAdmin: false },
  });
  await page.goto("/settings/team");
  await expect(page.getByText("Administrator access required")).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Add team member/ }),
  ).toHaveCount(0);
  expect(forbidden).toEqual([]);
});

test("Team prevents self-removal and failed invitations remain editable without success feedback", async ({
  page,
}) => {
  await operationFixtures(page, {
    "me.read": testIdentity,
    "settings.team.list": [
      {
        membershipId: "membership-test",
        userId: testIdentity.user.id,
        email: testIdentity.user.email,
        firstName: "Test",
        lastName: "User",
        role: "user_admin",
        status: "active",
        billingAdmin: true,
        joinedAt: "2026-10-01T12:00:00.000Z",
        lastSeenAt: null,
      },
    ],
    "settings.team.invitations": [],
  });
  await page.route("**/api/capiro/settings.team.invite", (route) =>
    route.fulfill({
      status: 500,
      json: { message: "Test invitation failure" },
    }),
  );
  await page.goto("/settings/team");
  await expect(
    page.getByRole("cell", {
      name: "Test User test@example.test",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Remove", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: /Add team member/ }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Email", { exact: true })
    .fill("recipient@example.test");
  await page
    .getByRole("button", { name: "Send invitation", exact: true })
    .click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "Test invitation failure",
  );
  await expect(
    page.getByRole("dialog").getByLabel("Email", { exact: true }),
  ).toHaveValue("recipient@example.test");
  await expect(page.getByText("Invitation was sent.")).toHaveCount(0);
});

test("Mobile Personal fits the viewport and Settings sections remain keyboard accessible", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await operationFixtures(page, {
    "me.read": testIdentity,
    "me.emailSignature.read": { html: null, enabled: false },
    "settings.contact.read": {},
  });
  await page.goto("/settings/personal");
  await expect(
    page.getByRole("heading", { name: "Personal", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Settings section").selectOption("contact-info");
  await expect(page).toHaveURL(/\/settings\/contact-info$/);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

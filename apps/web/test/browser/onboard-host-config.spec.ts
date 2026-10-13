import { test, expect } from "@playwright/test";
import {
  hostFixture,
  hostConfig,
  nativeSession,
  replaceSession,
  expectRegistration,
  expectPlan,
  expectHostIsolated,
} from "./onboard-host-fixtures";

test("actual OnboardHost hides feature controls until current config is received", async ({
  page,
}) => {
  const fixture = await hostFixture(page, null);
  const held = fixture.hold("public-onboard.config", { json: hostConfig });
  await page.goto("/register");
  await held.entered;
  await expect(page.getByRole("status")).toHaveText(
    "Loading onboarding configuration…",
  );
  await expect(page.getByLabel("First name", { exact: true })).toHaveCount(0);
  expect(fixture.calls("onboard.funnel.session")).toHaveLength(0);
  expect(fixture.writes()).toEqual([]);
  await held.release();
  await expectRegistration(page);
  expect(fixture.calls("public-onboard.config")).toHaveLength(1);
  expect(fixture.calls("onboard.funnel.session")).toHaveLength(1);
  expect(fixture.writes()).toEqual([]);
  expectHostIsolated(fixture);
});

for (const status of [401, 503]) {
  test(`actual OnboardHost config ${status} is retryable and does not expire the signed-in application`, async ({
    page,
  }) => {
    const fixture = await hostFixture(page);
    fixture.reply("public-onboard.config", {
      status,
      json: { message: "Synthetic config denied" },
    });
    await page.goto("/plan");
    await expect(page.getByRole("alert")).toContainText(
      "Onboarding unavailable",
    );
    await expect(
      page.getByRole("button", { name: /Subscribe Now/ }),
    ).toHaveCount(0);
    expect(fixture.calls("public-onboard.config")).toHaveLength(1);
    expect(fixture.calls("onboard.funnel.session")).toHaveLength(0);
    expect(fixture.writes()).toEqual([]);
    const retry = fixture.hold("public-onboard.config", { json: hostConfig });
    await page.getByRole("button", { name: "Try again", exact: true }).click();
    await retry.entered;
    await expect(
      page.getByRole("button", { name: "Continue", exact: true }),
    ).toHaveCount(0);
    expect(fixture.writes()).toEqual([]);
    await retry.release();
    await expectPlan(page);
    await expect(
      page.getByRole("heading", { name: "Your session expired" }),
    ).toHaveCount(0);
    expect(fixture.calls("public-onboard.config")).toHaveLength(2);
    expect(fixture.calls("onboard.funnel.session")).toHaveLength(1);
    expect(fixture.writes()).toEqual([]);
    expectHostIsolated(fixture);
  });
}

test("actual OnboardHost refuses a different Clerk application before authenticated funnel reads", async ({
  page,
}) => {
  const fixture = await hostFixture(page);
  fixture.reply("public-onboard.config", {
    json: {
      ...hostConfig,
      clerkPublishableKey: "pk_test_c3ludGhldGljLWRpZmZlcmVudCQ=",
    },
  });
  await page.goto("/plan");
  await expect(page.getByRole("alert")).toContainText(
    "Onboarding sign-in unavailable",
  );
  await expect(
    page.getByRole("heading", { name: "Choose how to start" }),
  ).toHaveCount(0);
  expect(fixture.calls("onboard.funnel.session")).toHaveLength(0);
  expect(fixture.writes()).toEqual([]);
  expectHostIsolated(fixture);
});

test("disabled self-service config exposes no registration form or funnel effects", async ({
  page,
}) => {
  const fixture = await hostFixture(page);
  fixture.reply("public-onboard.config", {
    json: { ...hostConfig, funnelEnabled: false },
  });
  await page.goto("/register");
  await expect(
    page.getByRole("heading", {
      name: "Self-service onboarding is almost here",
    }),
  ).toBeVisible();
  await expect(page.getByLabel("First name", { exact: true })).toHaveCount(0);
  expect(fixture.calls("onboard.funnel.session")).toHaveLength(0);
  expect(fixture.writes()).toEqual([]);
  expectHostIsolated(fixture);
});

test("missing service configuration stays unavailable without any onboarding reads or writes", async ({
  page,
}) => {
  const fixture = await hostFixture(page);
  await page.goto("/register?service-unconfigured=1");
  await expect(page.getByRole("status")).toContainText(
    "Onboarding setup required",
  );
  await expect(page.getByLabel("First name", { exact: true })).toHaveCount(0);
  expect(
    fixture.requests.filter((request) => request.key.includes("onboard")),
  ).toEqual([]);
  expect(fixture.writes()).toEqual([]);
  expectHostIsolated(fixture);
});

test("registration discards an unsigned draft on sign-in and refuses a different account's saved artifact", async ({
  page,
}) => {
  const fixture = await hostFixture(page, null);
  await page.goto("/register");
  await expectRegistration(page);
  await replaceSession(page, { userId: null, sessionId: null, orgId: null });
  await expect(
    page.getByRole("button", { name: "Create Account", exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("First name", { exact: true })
    .fill("Former local draft");
  await page
    .getByLabel("Work email", { exact: true })
    .fill("former-person@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("Synthetic-password-only");
  await page.evaluate(() =>
    localStorage.setItem(
      "capiro-funnel-registration.v1",
      JSON.stringify({
        v: 1,
        savedAt: Date.now(),
        firstName: "Former saved draft",
        lastName: "Synthetic",
        orgName: "Former synthetic firm",
        email: "former-person@example.test",
      }),
    ),
  );
  await replaceSession(page, {
    userId: "synthetic-current-user",
    sessionId: "synthetic-current-session",
    orgId: "synthetic-current-org",
  });
  await expect(
    page.getByRole("button", { name: "Register this firm", exact: true }),
  ).toBeDisabled();
  await expect(page.getByLabel("First name", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Work email", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Password", { exact: true })).toHaveValue("");
  await page
    .getByRole("button", { name: "Restore this account’s saved draft" })
    .click();
  await expect(
    page.getByText("No saved draft matches this account.", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("First name", { exact: true })).toHaveValue("");
  expect(fixture.writes()).toEqual([]);
  expectHostIsolated(fixture);
});

test("matching registration draft requires explicit restore and one explicit firm registration", async ({
  page,
}) => {
  const fixture = await hostFixture(page, null);
  await page.goto("/register");
  await expectRegistration(page);
  await replaceSession(page, { email: "synthetic-registration@example.test" });
  await page.evaluate(() =>
    localStorage.setItem(
      "capiro-funnel-registration.v1",
      JSON.stringify({
        v: 1,
        savedAt: Date.now(),
        firstName: "Synthetic",
        lastName: "Purchaser",
        orgName: "Synthetic Firm",
        email: "synthetic-registration@example.test",
      }),
    ),
  );
  await expect(page.getByLabel("First name", { exact: true })).toHaveValue("");
  expect(fixture.writes()).toEqual([]);
  await page
    .getByRole("button", { name: "Restore this account’s saved draft" })
    .click();
  await expect(page.getByLabel("First name", { exact: true })).toHaveValue(
    "Synthetic",
  );
  await expect(
    page.getByLabel("Organization name", { exact: true }),
  ).toHaveValue("Synthetic Firm");
  expect(fixture.writes()).toEqual([]);
  const held = fixture.hold("onboard.funnel.register", {
    json: nativeSession("synthetic-registered-session", {
      email: "synthetic-registration@example.test",
    }),
  });
  await page
    .getByRole("button", { name: "Register this firm", exact: true })
    .click();
  await held.entered;
  await expect(page.getByRole("status")).toContainText(
    "Waiting for confirmation",
  );
  await expect(page.getByLabel("First name", { exact: true })).toBeDisabled();
  expect(fixture.calls("onboard.funnel.register")[0]!.input).toEqual({
    body: {
      firstName: "Synthetic",
      lastName: "Purchaser",
      orgName: "Synthetic Firm",
    },
  });
  await held.release();
  await expectPlan(page);
  await expect(page).toHaveURL(/\/plan$/);
  expect(
    await page.evaluate(() =>
      localStorage.getItem("capiro-funnel-registration.v1"),
    ),
  ).toBeNull();
  expect(fixture.writes()).toHaveLength(1);
  expectHostIsolated(fixture);
});

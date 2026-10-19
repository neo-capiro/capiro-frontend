import { test, expect } from "@playwright/test";
import {
  hostFixture,
  nativeSession,
  navigateHost,
  trialName,
  expectPlan,
  expectHostIsolated,
  expectHorizontalFit,
} from "./onboard-host-fixtures";

test("native funnel session B revokes a held A write without replacing Clerk or advancing B", async ({
  page,
}) => {
  const fixture = await hostFixture(
    page,
    nativeSession("synthetic-native-A", { state: "roles_designated" }),
  );
  await page.goto("/plan");
  await expectPlan(page);
  const oldWrite = fixture.hold("onboard.funnel.plan", { json: { ok: true } });
  await page.getByRole("button", { name: /Subscribe Now/ }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await oldWrite.entered;
  await expect(page.getByRole("status")).toContainText(
    "Waiting for confirmation",
  );
  expect(fixture.calls("onboard.funnel.plan")[0]!.input).toEqual({
    body: { plan: "paid" },
  });
  // Both pages are allowed for A. This is ordinary same-authority route navigation.
  await navigateHost(page, "/clients");
  await expect(
    page.getByRole("heading", {
      name: "How would you like to bring in your clients?",
    }),
  ).toBeVisible();
  const replacement = fixture.hold("onboard.funnel.session", {
    json: nativeSession("synthetic-native-B", {
      state: "roles_designated",
      plan: "trial",
      importMode: "self",
    }),
  });
  await page
    .getByRole("button", { name: /Self-service Import your clients/ })
    .click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await replacement.entered;
  expect(fixture.calls("onboard.funnel.importPref")[0]!.input).toEqual({
    body: { importMode: "self" },
  });
  await replacement.release();
  await expect(page.getByRole("status")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Continue", exact: true }),
  ).toBeEnabled();
  await navigateHost(page, "/plan");
  await expectPlan(page);
  await expect(page.getByRole("button", { name: trialName })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await oldWrite.release();
  await expect(page).toHaveURL(/\/plan$/);
  await expect(
    page.getByRole("button", { name: /Subscribe Now/ }),
  ).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByRole("button", { name: trialName })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByRole("status")).toHaveCount(0);
  expect(fixture.calls("onboard.funnel.session")).toHaveLength(2);
  expect(fixture.calls("onboard.funnel.plan")).toHaveLength(1);
  expect(fixture.writes().map((request) => request.key)).toEqual([
    "onboard.funnel.plan",
    "onboard.funnel.importPref",
  ]);
  expectHostIsolated(fixture);
});

test("current status reads serialize without clearing an unknown write before explicit native B adoption", async ({
  page,
}) => {
  const fixture = await hostFixture(page);
  await page.goto("/plan");
  await expectPlan(page);
  fixture.reply("onboard.funnel.plan", {
    status: 503,
    json: { message: "Synthetic ambiguous dispatch" },
  });
  await page.getByRole("button", { name: /Subscribe Now/ }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "Submission outcome unknown",
  );
  await expect(
    page.getByRole("button", { name: "Continue", exact: true }),
  ).toBeDisabled();
  const oldRead = fixture.hold("onboard.funnel.session", {
    json: nativeSession("synthetic-native-A"),
  });
  await page
    .getByRole("button", { name: "Check current status", exact: true })
    .click();
  await oldRead.entered;
  // Canonical current reads freeze the whole funnel, including reconciliation.
  // A second concurrent click is intentionally unavailable to a browser user.
  await expect(
    page.getByRole("button", { name: "Check current status", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Continue", exact: true }),
  ).toBeDisabled();
  expect(fixture.calls("onboard.funnel.session")).toHaveLength(2);
  expect(fixture.writes()).toHaveLength(1);
  await oldRead.release();
  await expect(page.getByRole("status")).toContainText(
    "Submission outcome unknown",
  );
  await expect(
    page.getByRole("button", { name: "Check current status", exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "Continue", exact: true }),
  ).toBeDisabled();
  expect(fixture.calls("onboard.funnel.session")).toHaveLength(2);
  expect(fixture.writes()).toHaveLength(1);
  fixture.reply("onboard.funnel.session", {
    json: nativeSession("synthetic-native-B", { plan: "trial" }),
  });
  await page
    .getByRole("button", { name: "Check current status", exact: true })
    .click();
  await expect(page.getByRole("button", { name: trialName })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByRole("status")).toHaveCount(0);
  await expect(page).toHaveURL(/\/plan$/);
  await expect(page.getByRole("button", { name: trialName })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(
    page.getByRole("button", { name: /Subscribe Now/ }),
  ).toHaveAttribute("aria-pressed", "false");
  await expect(
    page.getByRole("button", { name: "Continue", exact: true }),
  ).toBeEnabled();
  expect(fixture.calls("onboard.funnel.session")).toHaveLength(3);
  expect(fixture.calls("onboard.funnel.plan")).toHaveLength(1);
  expect(fixture.writes()).toHaveLength(1);
  expectHostIsolated(fixture);
});

for (const width of [1440, 375]) {
  test(`actual plan controls support keyboard selection without overflow at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    const fixture = await hostFixture(page);
    await page.goto("/plan");
    await expectPlan(page);
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    const paid = page.getByRole("button", { name: /Subscribe Now/ });
    const trial = page.getByRole("button", { name: trialName });
    await expect(
      page.getByRole("button", { name: "Continue", exact: true }),
    ).toBeDisabled();
    await paid.focus();
    await expect(paid).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(paid).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.press("Tab");
    await expect(trial).toBeFocused();
    await page.keyboard.press("Space");
    await expect(trial).toHaveAttribute("aria-pressed", "true");
    await expect(paid).toHaveAttribute("aria-pressed", "false");
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("button", { name: "Continue", exact: true }),
    ).toBeFocused();
    await expect(
      page.getByRole("button", { name: "Continue", exact: true }),
    ).toBeEnabled();
    expect(fixture.writes()).toEqual([]);
    await page.screenshot({
      path: testInfo.outputPath(`plan-keyboard-${width}.png`),
      fullPage: true,
    });
    await expectHorizontalFit(page);
    expectHostIsolated(fixture);
  });
}

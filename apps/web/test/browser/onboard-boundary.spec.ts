import { test, expect } from "@playwright/test";
import {
  onboardFixture,
  heldResponse,
  replaceSession,
  navigateProbe,
  expectFreshProbe,
  expectIsolated,
  registerUrl,
  tokenUrl,
  tokenA,
  tokenB,
  invite,
  publicConfig,
} from "./onboard-boundary-fixtures";

for (const status of [200, 401]) {
  test(`Onboard IT token replacement discards local draft and late ${status} without automatic requests`, async ({
    page,
  }) => {
    const fixture = await onboardFixture(page);
    await page.goto(tokenUrl(tokenA));
    await expectFreshProbe(page, "signed-out");
    await page.getByLabel("Onboard scope draft").fill("Private token A draft");
    expect(fixture.requests).toEqual([]);
    expect(fixture.writes).toEqual([]);
    const held = heldResponse();
    fixture.queue("public-onboard.invite", async (route) => {
      await held.wait;
      await route.fulfill({
        status,
        json:
          status === 200
            ? invite("Late private token A")
            : { message: "Old token denied" },
      });
      held.finish();
    });
    await page.getByRole("button", { name: "Read public onboarding" }).click();
    await expect
      .poll(() => fixture.calls("public-onboard.invite").length)
      .toBe(1);
    expect(fixture.calls("public-onboard.invite")[0]!.input).toEqual({
      params: { token: tokenA },
    });
    await expect(page.getByTestId("onboard-pending")).toHaveText("public");
    await navigateProbe(page, tokenUrl(tokenB));
    await expectFreshProbe(page, "signed-out");
    held.release();
    await held.settled;
    await page.getByLabel("Onboard scope draft").fill("Current token B draft");
    await expect(page.getByTestId("onboard-receipt")).toHaveText("");
    await expect(page.getByTestId("onboard-error")).toHaveText("");
    expect(fixture.requests).toHaveLength(1);
    expect(fixture.writes).toEqual([]);
    await page.getByRole("button", { name: "Read public onboarding" }).click();
    await expect(page.getByTestId("onboard-receipt")).toContainText(
      "Current token B",
    );
    await expect(page.getByLabel("Onboard scope draft")).toHaveValue(
      "Current token B draft",
    );
    expect(fixture.calls("public-onboard.invite")).toHaveLength(2);
    expect(fixture.calls("public-onboard.invite")[1]!.input).toEqual({
      params: { token: tokenB },
    });
    expect(fixture.writes).toEqual([]);
    expectIsolated(fixture);
  });
}

const replacements = [
  { name: "user", detail: { userId: "new-synthetic-user" } },
  { name: "session", detail: { sessionId: "new-synthetic-session" } },
  { name: "org", detail: { orgId: "new-synthetic-org" } },
] as const;
for (const replacement of replacements) {
  for (const status of [200, 401]) {
    test(`Onboard ${replacement.name} replacement ignores late plan ${status} and does not repeat the write`, async ({
      page,
    }) => {
      const fixture = await onboardFixture(page);
      await page.goto(registerUrl);
      await expectFreshProbe(page, "signed-in");
      await page
        .getByLabel("Onboard scope draft")
        .fill("Former signed-in draft");
      expect(fixture.requests).toEqual([]);
      expect(fixture.writes).toEqual([]);
      const held = heldResponse();
      fixture.queue("onboard.funnel.plan", async (route) => {
        await held.wait;
        await route.fulfill({
          status,
          json:
            status === 200 ? { ok: true } : { message: "Old session denied" },
        });
        held.finish();
      });
      await page
        .getByRole("button", { name: "Write explicit trial plan" })
        .click();
      await expect
        .poll(() => fixture.calls("onboard.funnel.plan").length)
        .toBe(1);
      expect(fixture.calls("onboard.funnel.plan")[0]).toMatchObject({
        method: "POST",
        input: { body: { plan: "trial" } },
      });
      await expect(page.getByTestId("onboard-pending")).toHaveText("plan");
      await replaceSession(page, replacement.detail);
      await expectFreshProbe(page, "signed-in");
      held.release();
      await held.settled;
      await page
        .getByLabel("Onboard scope draft")
        .fill("Current signed-in draft");
      await expect(page.getByTestId("onboard-receipt")).toHaveText("");
      await expect(page.getByTestId("onboard-error")).toHaveText("");
      expect(fixture.calls("onboard.funnel.plan")).toHaveLength(1);
      expect(fixture.writes).toEqual(["/api/capiro/onboard.funnel.plan"]);
      await page
        .getByRole("button", { name: "Read authenticated legal" })
        .click();
      await expect(page.getByTestId("onboard-receipt")).toContainText(
        "current-legal",
      );
      await expect(page.getByTestId("onboard-session")).toHaveText("signed-in");
      await expect(page.getByLabel("Onboard scope draft")).toHaveValue(
        "Current signed-in draft",
      );
      expect(fixture.calls("onboard.funnel.legal")).toHaveLength(1);
      expect(fixture.writes).toHaveLength(1);
      expectIsolated(fixture);
    });
  }
}

for (const status of [200, 401]) {
  test(`Onboard sign-in disposes signed-out draft and late public ${status}`, async ({
    page,
  }) => {
    const fixture = await onboardFixture(page);
    await page.goto(registerUrl);
    await replaceSession(page, { userId: null, sessionId: null, orgId: null });
    await expectFreshProbe(page, "signed-out");
    await expect(
      page.getByRole("button", { name: "Write explicit trial plan" }),
    ).toBeDisabled();
    await page
      .getByLabel("Onboard scope draft")
      .fill("Private signed-out draft");
    expect(fixture.requests).toEqual([]);
    const held = heldResponse();
    fixture.queue("public-onboard.config", async (route) => {
      await held.wait;
      await route.fulfill({
        status,
        json:
          status === 200
            ? { ...publicConfig, environment: "Late signed-out response" }
            : { message: "Old public request denied" },
      });
      held.finish();
    });
    await page.getByRole("button", { name: "Read public onboarding" }).click();
    await expect
      .poll(() => fixture.calls("public-onboard.config").length)
      .toBe(1);
    await replaceSession(page, {
      userId: "new-user",
      sessionId: "new-session",
      orgId: "new-org",
    });
    await expectFreshProbe(page, "signed-in");
    held.release();
    await held.settled;
    await page.getByLabel("Onboard scope draft").fill("Signed-in local draft");
    await expect(page.getByTestId("onboard-receipt")).toHaveText("");
    await expect(page.getByTestId("onboard-error")).toHaveText("");
    expect(fixture.calls("public-onboard.config")).toHaveLength(1);
    expect(fixture.writes).toEqual([]);
    await page
      .getByRole("button", { name: "Read authenticated legal" })
      .click();
    await expect(page.getByTestId("onboard-receipt")).toContainText(
      "current-legal",
    );
    await expect(page.getByTestId("onboard-session")).toHaveText("signed-in");
    expect(fixture.writes).toEqual([]);
    expectIsolated(fixture);
  });
}

test("current public401 on register preserves signed-in scope and permits authenticated legal read", async ({
  page,
}) => {
  const fixture = await onboardFixture(page);
  await page.goto(registerUrl);
  await expectFreshProbe(page, "signed-in");
  await page
    .getByLabel("Onboard scope draft")
    .fill("Current signed-in private draft");
  fixture.queue("public-onboard.config", (route) =>
    route.fulfill({
      status: 401,
      json: { message: "Public configuration denied" },
    }),
  );
  await page.getByRole("button", { name: "Read public onboarding" }).click();
  await expect(page.getByTestId("onboard-error")).toHaveText(
    "Public configuration denied",
  );
  await expect(page.getByTestId("onboard-session")).toHaveText("signed-in");
  await expect(page.getByLabel("Onboard scope draft")).toHaveValue(
    "Current signed-in private draft",
  );
  await expect(
    page.getByRole("heading", { name: "Your session expired" }),
  ).toHaveCount(0);
  expect(fixture.calls("public-onboard.config")).toHaveLength(1);
  expect(fixture.writes).toEqual([]);
  await page.getByRole("button", { name: "Read authenticated legal" }).click();
  await expect(page.getByTestId("onboard-receipt")).toContainText(
    "current-legal",
  );
  await expect(page.getByTestId("onboard-error")).toHaveText("");
  await expect(page.getByTestId("onboard-session")).toHaveText("signed-in");
  expect(fixture.writes).toEqual([]);
  expectIsolated(fixture);
});

test("Onboard public requests omit the synthetic cookie while authenticated requests retain same-origin credentials", async ({
  page,
  context,
}) => {
  await context.addCookies([
    {
      name: "onboard_boundary_synthetic",
      value: "fixture-only",
      domain: "127.0.0.1",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  const fixture = await onboardFixture(page);
  await page.goto(registerUrl);
  await expectFreshProbe(page, "signed-in");
  expect(fixture.requests).toEqual([]);
  await page.getByRole("button", { name: "Read public onboarding" }).click();
  await expect(page.getByTestId("onboard-receipt")).toContainText(
    "synthetic-current-config",
  );
  expect(
    fixture.calls("public-onboard.config")[0]!.headers.cookie,
  ).toBeUndefined();
  await page.getByRole("button", { name: "Read authenticated legal" }).click();
  await expect(page.getByTestId("onboard-receipt")).toContainText(
    "current-legal",
  );
  expect(fixture.calls("onboard.funnel.legal")[0]!.headers.cookie).toContain(
    "onboard_boundary_synthetic=fixture-only",
  );
  expect(fixture.writes).toEqual([]);
  await page.getByRole("button", { name: "Write explicit trial plan" }).click();
  await expect(page.getByTestId("onboard-receipt")).toHaveText(
    'plan: {"ok":true}',
  );
  expect(fixture.calls("onboard.funnel.plan")[0]!.headers.cookie).toContain(
    "onboard_boundary_synthetic=fixture-only",
  );
  expect(fixture.calls("onboard.funnel.plan")[0]!.input).toEqual({
    body: { plan: "trial" },
  });
  await page
    .getByLabel("Onboard scope draft")
    .fill("No automatic second write");
  expect(fixture.writes).toEqual(["/api/capiro/onboard.funnel.plan"]);
  expectIsolated(fixture);
});

test("current authenticated401 expires the Onboard application without replaying a request", async ({
  page,
}) => {
  const fixture = await onboardFixture(page);
  await page.goto(registerUrl);
  await expectFreshProbe(page, "signed-in");
  await page
    .getByLabel("Onboard scope draft")
    .fill("Removed on current expiry");
  fixture.queue("onboard.funnel.legal", (route) =>
    route.fulfill({ status: 401, json: { message: "Current session denied" } }),
  );
  await page.getByRole("button", { name: "Read authenticated legal" }).click();
  await expect(
    page.getByRole("heading", { name: "Your session expired" }),
  ).toBeVisible();
  await expect(page.getByLabel("Onboard scope draft")).toHaveCount(0);
  await expect(page.getByTestId("onboard-receipt")).toHaveCount(0);
  expect(fixture.calls("onboard.funnel.legal")).toHaveLength(1);
  expect(fixture.writes).toEqual([]);
  expectIsolated(fixture);
});

import { test, expect } from "@playwright/test";
import {
  hostFixture,
  hostInvite,
  navigateHost,
  tokenA,
  tokenB,
  expectHostIsolated,
} from "./onboard-host-fixtures";

for (const status of [200, 401]) {
  test(`actual IT page ignores held token A invite ${status} after token B becomes current`, async ({
    page,
  }) => {
    const fixture = await hostFixture(page);
    const old = fixture.hold("public-onboard.invite", {
      status,
      json:
        status === 200
          ? hostInvite("Late synthetic token A")
          : { message: "Synthetic old token denied" },
    });
    await page.goto(`/it/${tokenA}`);
    await old.entered;
    await expect(
      page.getByRole("button", { name: "Connect with Microsoft" }),
    ).toHaveCount(0);
    expect(fixture.writes()).toEqual([]);
    await navigateHost(page, `/it/${tokenB}`);
    await expect(
      page.getByRole("heading", {
        name: "Connect Synthetic token B's email to Capiro",
      }),
    ).toBeVisible();
    await old.release();
    await expect(
      page.getByRole("heading", {
        name: "Connect Synthetic token B's email to Capiro",
      }),
    ).toBeVisible();
    await expect(
      page.getByText("Late synthetic token A", { exact: false }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Your session expired" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Connect with Microsoft" }),
    ).toBeEnabled();
    expect(
      fixture.calls("public-onboard.invite").map((request) => request.input),
    ).toEqual([{ params: { token: tokenA } }, { params: { token: tokenB } }]);
    expect(fixture.writes()).toEqual([]);
    expectHostIsolated(fixture);
  });
}

for (const status of [200, 401]) {
  test(`IT token replacement fences held consent ${status}, clears local provider step and omits ambient credentials`, async ({
    page,
    context,
  }) => {
    await context.addCookies([
      {
        name: "onboard_host_synthetic",
        value: "fixture-only",
        domain: "127.0.0.1",
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
    const fixture = await hostFixture(page);
    await page.goto(`/it/${tokenA}`);
    await expect(
      page.getByRole("heading", {
        name: "Connect Synthetic token A's email to Capiro",
      }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Connect with Google", exact: true })
      .click();
    await expect(
      page.getByText("synthetic-google-client", { exact: true }),
    ).toBeVisible();
    expect(fixture.writes()).toEqual([]);
    const old = fixture.hold("public-onboard.consent", {
      status,
      json:
        status === 200
          ? {
              url: "https://accounts.google.com/o/oauth2/v2/auth?state=synthetic-old&redirect_uri=http%3A%2F%2F127.0.0.1%2Fonboard-api%2Fit%2Fgoogle%2Fcallback",
            }
          : { message: "Synthetic old consent denied" },
    });
    await page
      .getByRole("button", { name: "Verify with Google", exact: true })
      .click();
    await old.entered;
    await expect(
      page.getByText("Authorizing with your provider…", { exact: true }),
    ).toBeVisible();
    expect(fixture.calls("public-onboard.consent")[0]!.input).toEqual({
      params: { token: tokenA },
      body: { provider: "google" },
    });
    await navigateHost(page, `/it/${tokenB}`);
    await expect(
      page.getByRole("heading", {
        name: "Connect Synthetic token B's email to Capiro",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Connect with Google", exact: true }),
    ).toBeEnabled();
    await expect(
      page.getByRole("button", { name: "Verify with Google", exact: true }),
    ).toHaveCount(0);
    await old.release();
    await expect(page).toHaveURL(new RegExp(`/it/${tokenB}$`));
    await expect(
      page.getByRole("heading", {
        name: "Connect Synthetic token B's email to Capiro",
      }),
    ).toBeVisible();
    await expect(page.getByRole("status")).toHaveCount(0);
    expect(fixture.writes()).toHaveLength(1);
    expect(fixture.calls("public-onboard.consent")).toHaveLength(1);
    const publicRequests = fixture.requests.filter((request) =>
      request.key.startsWith("public-onboard."),
    );
    expect(publicRequests.map((request) => request.key)).toContain(
      "public-onboard.consent",
    );
    for (const request of publicRequests) {
      expect(request.headers.cookie).toBeUndefined();
      expect(request.headers.authorization).toBeUndefined();
    }
    expect(
      fixture.requests.filter((request) => request.key.startsWith("onboard.")),
    ).toEqual([]);
    expectHostIsolated(fixture);
  });
}

for (const status of [403, 404, 503]) {
  test(`current IT invite ${status} conceals provider actions until a deliberate successful retry`, async ({
    page,
  }) => {
    const fixture = await hostFixture(page);
    fixture.reply("public-onboard.invite", {
      status,
      json: { message: "Synthetic invitation denied" },
    });
    await page.goto(`/it/${tokenA}`);
    await expect(
      page.getByText(
        status === 503
          ? "The current invitation could not be loaded. Try again."
          : "Invite unavailable or expired; contact your administrator",
        { exact: false },
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Connect with/ }),
    ).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Verify with/ })).toHaveCount(
      0,
    );
    expect(fixture.calls("public-onboard.invite")).toHaveLength(1);
    expect(fixture.writes()).toEqual([]);
    const retry = fixture.hold("public-onboard.invite", {
      json: {
        ...hostInvite("Recovered synthetic invitation"),
        providers: { microsoft: false, google: false },
      },
    });
    await page
      .getByRole("button", { name: "Retry current invitation", exact: true })
      .click();
    await retry.entered;
    await expect(
      page.getByRole("button", { name: /Connect with/ }),
    ).toHaveCount(0);
    expect(fixture.writes()).toEqual([]);
    await retry.release();
    await expect(
      page.getByRole("heading", {
        name: "Connect Recovered synthetic invitation's email to Capiro",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Connect with Microsoft" }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: /Connect with Google/ }),
    ).toBeDisabled();
    expect(fixture.calls("public-onboard.invite")).toHaveLength(2);
    expect(fixture.writes()).toEqual([]);
    expectHostIsolated(fixture);
  });
}

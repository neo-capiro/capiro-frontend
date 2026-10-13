import { test, expect, type Locator, type Page } from "@playwright/test";
import {
  actionHostFixture,
  actionClient,
  actionUrl,
  expectActionIsolation,
} from "./meri-action-host-fixtures";

const homeUrl = `/meri?clientId=${actionClient.id}`;
type ActionFixture = Awaited<ReturnType<typeof actionHostFixture>>;
type Destination = "home" | "actions";

/** Reach the real control in the sequential keyboard order, without focus(). */
async function tabTo(page: Page, target: Locator) {
  await expect(target).toBeVisible();
  for (let step = 0; step < 32; step += 1) {
    await page.keyboard.press("Tab");
    if (await target.evaluate((element) => element === document.activeElement))
      return;
  }
  await expect(target).toBeFocused();
}

async function expectRoute(
  page: Page,
  fixture: ActionFixture,
  destination: Destination,
) {
  await expect(page).toHaveURL(destination === "home" ? homeUrl : actionUrl());
  if (destination === "home") {
    await expect(
      page.getByLabel("Message draft", { exact: true }),
    ).toBeVisible();
  } else {
    await expect(
      page.getByRole("button", { name: "Connect action service", exact: true }),
    ).toBeEnabled();
  }
  expect(fixture.calls("client").length).toBeGreaterThan(0);
  expect(fixture.actions()).toEqual([]);
  expectActionIsolation(fixture);
}

async function expectMobileRoute(
  page: Page,
  fixture: ActionFixture,
  destination: Destination,
) {
  await expectRoute(page, fixture, destination);
  const home = page.getByRole("link", { name: "Conversations", exact: true });
  const actions = page.getByRole("link", {
    name: "Recommendation actions",
    exact: true,
  });
  await expect(home).toHaveCount(1);
  await expect(actions).toHaveCount(1);
  await expect(home).toBeVisible();
  await expect(actions).toBeVisible();
  await expect(home).toHaveAttribute("href", homeUrl);
  await expect(actions).toHaveAttribute("href", actionUrl());
  await expect(destination === "home" ? home : actions).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(destination === "home" ? actions : home).not.toHaveAttribute(
    "aria-current",
    /.*/,
  );
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(375);
}

test("375px Meri navigation preserves the verified client through keyboard and Back/Forward without action dispatch", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  const fixture = await actionHostFixture(page);
  await page.goto(homeUrl);
  await expectMobileRoute(page, fixture, "home");
  await tabTo(
    page,
    page.getByRole("link", { name: "Recommendation actions", exact: true }),
  );
  await page.keyboard.press("Enter");
  await expectMobileRoute(page, fixture, "actions");
  await tabTo(
    page,
    page.getByRole("link", { name: "Conversations", exact: true }),
  );
  await page.keyboard.press("Enter");
  await expectMobileRoute(page, fixture, "home");
  await page.goBack();
  await expectMobileRoute(page, fixture, "actions");
  await page.goBack();
  await expectMobileRoute(page, fixture, "home");
  await page.goForward();
  await expectMobileRoute(page, fixture, "actions");
  await page.goForward();
  await expectMobileRoute(page, fixture, "home");
});

test("1440px Meri retains one visible sidebar destination per route without duplicate mobile links", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const fixture = await actionHostFixture(page);
  await page.goto(homeUrl);
  await expectRoute(page, fixture, "home");
  const sidebar = page.getByRole("complementary", { name: "Meri navigation" });
  const actions = page.getByRole("link", {
    name: "Recommendation actions",
    exact: true,
  });
  const home = page.getByRole("button", { name: "Conversations", exact: true });
  await expect(sidebar).toBeVisible();
  await expect(actions).toHaveCount(1);
  await expect(actions).toBeVisible();
  await expect(actions).toHaveAttribute("href", actionUrl());
  await expect(home).toHaveCount(1);
  await expect(home).toBeVisible();
  await expect(home).toHaveAttribute("aria-current", "page");
  await expect(actions).not.toHaveAttribute("aria-current", /.*/);
  await expect(
    page.getByRole("link", { name: "Conversations", exact: true }),
  ).toHaveCount(0);
  await tabTo(page, actions);
  await page.keyboard.press("Enter");
  await expectRoute(page, fixture, "actions");
  await expect(actions).toHaveCount(1);
  await expect(actions).toHaveAttribute("aria-current", "page");
  await expect(home).not.toHaveAttribute("aria-current", /.*/);
  await expect(home).toHaveCount(1);
  await expect(
    page.getByRole("link", { name: "Conversations", exact: true }),
  ).toHaveCount(0);
  await tabTo(page, home);
  await page.keyboard.press("Enter");
  await expectRoute(page, fixture, "home");
  await expect(home).toHaveAttribute("aria-current", "page");
  await expect(actions).not.toHaveAttribute("aria-current", /.*/);
});

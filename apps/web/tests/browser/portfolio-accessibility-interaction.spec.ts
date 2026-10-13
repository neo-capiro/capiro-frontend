import { test, expect } from "@playwright/test";
import {
  tabTo,
  expectFocusEvidence,
  clickObservedPoint,
  pointWithLink,
  observeHomeIsolation,
} from "../../test/accessibility-interaction";
import {
  client,
  metadataClients,
  portfolioAccessibilityFixture,
} from "./portfolio-accessibility-fixtures";
import {
  cardIds,
  layoutFixtures,
  layoutReceipt,
} from "./portfolio-layout-fixtures";

for (const width of [1440, 390]) {
  test(`Portfolio positive control: ${width}px sequential keyboard and history preserve the profile route`, async ({
    page,
  }, testInfo) => {
    const assertIsolation = await portfolioAccessibilityFixture(page, testInfo);
    await page.setViewportSize({ width, height: width === 1440 ? 1040 : 844 });
    await page.goto("/portfolio");
    const open = page.getByRole("link", {
      name: "Open Test Aerospace",
      exact: true,
    });
    await tabTo(page, open);
    await page.keyboard.press("Shift+Tab");
    await expect(open).not.toBeFocused();
    await page.keyboard.press("Tab");
    await expectFocusEvidence(open, testInfo);
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(`/portfolio/${client.id}`);
    await page.goBack();
    await expect(page).toHaveURL("/portfolio");
    await expect(open).toBeVisible();
    await page.goForward();
    await expect(page).toHaveURL(`/portfolio/${client.id}`);
    assertIsolation();
  });

  test(`Portfolio positive control: ${width}px logo and sector navigate while bottom owner stays outside the link`, async ({
    page,
  }, testInfo) => {
    const assertIsolation = await portfolioAccessibilityFixture(
      page,
      testInfo,
      metadataClients.slice(0, 2),
    );
    await page.setViewportSize({ width, height: width === 1440 ? 1040 : 844 });
    await page.goto("/portfolio");
    const open = page.getByRole("link", {
      name: "Open Test Aerospace",
      exact: true,
    });
    const card = page.locator("article").filter({ has: open });
    for (const target of [
      card.locator("span").filter({ hasText: /^TA$/ }),
      card.locator("small"),
    ]) {
      await expect(open).toBeVisible();
      await clickObservedPoint(page, target, `/portfolio/${client.id}`);
      await expect(page).toHaveURL(`/portfolio/${client.id}`);
      await page.goBack();
      await expect(page).toHaveURL("/portfolio");
    }
    const neighbor = page.getByRole("link", {
      name: "Open North Coast Energy",
      exact: true,
    });
    await pointWithLink(page, neighbor, `/portfolio/${metadataClients[1]!.id}`);
    await clickObservedPoint(
      page,
      card.getByLabel("Account owner: unavailable", { exact: true }),
      null,
    );
    await expect(page).toHaveURL("/portfolio");
    assertIsolation();
  });
}

for (const colorScheme of ["light", "dark"] as const) {
  test(`Portfolio positive control: 390px long name keeps visible keyboard focus and ${colorScheme} token scope`, async ({
    page,
  }, testInfo) => {
    const name =
      "Test Aerospace International Government Research and Engineering Organization";
    const assertIsolation = await portfolioAccessibilityFixture(
      page,
      testInfo,
      [{ ...client, name }],
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ colorScheme });
    await page.goto("/portfolio");
    const open = page.getByRole("link", { name: `Open ${name}`, exact: true });
    await expect(open).toBeVisible();
    await tabTo(page, open);
    await expectFocusEvidence(open, testInfo);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(390);
    const metadata = page
      .locator("article")
      .filter({ has: open })
      .locator("small");
    await expect(metadata).toHaveText("Aerospace");
    const token = await metadata.evaluate((element) =>
      getComputedStyle(element).getPropertyValue("--muted-foreground").trim(),
    );
    if (colorScheme === "dark") expect(token).toBe("#aaa29c");
    await testInfo.attach("long-name-theme", {
      body: JSON.stringify({ colorScheme, token }),
      contentType: "application/json",
    });
    assertIsolation();
  });
}

// The actual card bottom has static annotations, not a second link. Its existing
// layout wrapper supplies real controls below the card; exercise those as well.
test("Portfolio positive control: 390px card expansion leaves the real reorder control reachable", async ({
  page,
}, testInfo) => {
  await layoutFixtures(page);
  const writes: string[] = [];
  await page.route("**/api/backend/core/me/portfolio-layout", (route) => {
    if (route.request().method() !== "GET")
      writes.push(route.request().method());
    return route.fulfill({ json: layoutReceipt() });
  });
  const assertIsolation = await observeHomeIsolation(page, testInfo);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/__test/portfolio-layout");
  const move = page.getByRole("button", {
    name: "Move Aerospace One later",
    exact: true,
  });
  await expect(move).toBeEnabled();
  await tabTo(page, move);
  await expectFocusEvidence(move, testInfo);
  await page.keyboard.press("Enter");
  const positions = () =>
    page
      .locator("[data-client-id]")
      .evaluateAll((elements) =>
        elements.map((element) => element.getAttribute("data-client-id")),
      );
  await expect.poll(positions).toEqual([cardIds[1], cardIds[0], cardIds[2]]);
  await expect(page).toHaveURL("/__test/portfolio-layout");
  await clickObservedPoint(
    page,
    page.getByRole("button", { name: "Cancel reorder", exact: true }),
    null,
  );
  await expect.poll(positions).toEqual(cardIds);
  await clickObservedPoint(page, move, null);
  await expect.poll(positions).toEqual([cardIds[1], cardIds[0], cardIds[2]]);
  expect(writes).toEqual([]);
  assertIsolation();
});

import { test, expect, type Locator } from "@playwright/test";
import { expectAccessibleHome } from "../accessibility";
import { expectGradientIncompletes } from "../rendered-contrast";
import { tabTo, expectFocusEvidence } from "../accessibility-interaction";
import {
  filesFixture,
  filesUrl,
  actionClient,
  expectFilesIsolation,
} from "./meri-files-fixtures";

async function style(locator: Locator) {
  return locator.evaluate((node) => {
    const css = getComputedStyle(node);
    return {
      color: css.color,
      background: css.backgroundColor,
      image: css.backgroundImage,
      foreground: css.getPropertyValue("--foreground").trim(),
      card: css.getPropertyValue("--card").trim(),
      muted: css.getPropertyValue("--muted-foreground").trim(),
      scheme: css.colorScheme,
    };
  });
}

for (const width of [1440, 390]) {
  test(`Meri authored dark workspace keeps the shared header light at ${width}px`, async ({
    page,
  }, info) => {
    const fixture = await filesFixture(page);
    await page.setViewportSize({ width, height: width === 1440 ? 1040 : 844 });
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto(`/meri?clientId=${actionClient.id}`);
    const main = page.getByRole("main");
    await expect(
      page.getByLabel("Message draft", { exact: true }),
    ).toBeVisible();
    const dark = await style(main);
    // Authored Meri collection448:90059 and dark frame448:89992.
    expect(dark.foreground).toBe("#f5f5f4");
    expect(dark.card).toBe("#0a0a0a");
    expect(dark.muted).toBe("#afa6a0");
    expect(dark.scheme).toBe("dark");
    expect(dark.image).toContain("linear-gradient");
    const header = await style(page.getByRole("banner"));
    expect(header.background).toBe("rgb(255, 255, 255)");
    expect(header.foreground).toBe("#0a0a0a");
    const send = page.getByRole("button", {
      name: "Send unavailable: disconnected fixture",
      exact: true,
    });
    expect((await style(send)).color).toBe("rgb(10, 10, 10)");
    expect((await style(send)).background).toBe("rgb(245, 245, 244)");
    const start = page.getByRole("button", {
      name: "Start research draft",
      exact: true,
    });
    await tabTo(page, start);
    await expectFocusEvidence(start, info);
    await page.keyboard.press("Enter");
    await expect(page.getByLabel("Message draft", { exact: true })).toHaveValue(
      "Help me research a question about ",
    );
    await info.attach("authored-dark-computed", {
      body: JSON.stringify({ dark, header }, null, 2),
      contentType: "application/json",
    });
    await page.screenshot({
      path: info.outputPath(`meri-dark-${width}.png`),
      fullPage: true,
    });
    const audit = await expectAccessibleHome(page, info);
    await expectGradientIncompletes(page, info, audit.incomplete);
    expect(fixture.requests).toEqual([]);
    expect(fixture.host.calls("session")).toHaveLength(0);
    expectFilesIsolation(fixture);
  });

  test(`Meri Files theme follows preference through scoped navigation and history at ${width}px`, async ({
    page,
  }, info) => {
    const fixture = await filesFixture(page);
    await page.setViewportSize({ width, height: width === 1440 ? 1040 : 844 });
    await page.emulateMedia({ colorScheme: "dark" });
    const home = `/meri?clientId=${actionClient.id}`;
    await page.goto(home);
    await expect(
      page.getByLabel("Message draft", { exact: true }),
    ).toBeVisible();
    await page
      .getByRole(width === 390 ? "link" : "button", {
        name: "Files",
        exact: true,
      })
      .click();
    await expect(page).toHaveURL(filesUrl());
    await expect(
      page.getByRole("button", {
        name: "Connect document service",
        exact: true,
      }),
    ).toBeVisible();
    expect((await style(page.getByRole("main"))).foreground).toBe("#f5f5f4");
    await page
      .getByRole("navigation", { name: "Product modes" })
      .getByRole("link", { name: "Modules", exact: true })
      .click();
    await expect(
      page.getByRole("heading", {
        name: "Everything in Capiro, across the whole firm",
      }),
    ).toBeVisible();
    expect((await style(page.getByRole("banner"))).foreground).toBe("#0a0a0a");
    await page.goBack();
    await expect(page).toHaveURL(filesUrl());
    expect((await style(page.getByRole("main"))).foreground).toBe("#f5f5f4");
    await page.goBack();
    await expect(page).toHaveURL(home);
    await page.goForward();
    await expect(page).toHaveURL(filesUrl());
    await page.emulateMedia({ colorScheme: "light" });
    expect((await style(page.getByRole("main"))).foreground).toBe("#0a0a0a");
    await page.emulateMedia({ colorScheme: "dark" });
    expect((await style(page.getByRole("main"))).foreground).toBe("#f5f5f4");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    ).toBe(false);
    await page.screenshot({
      path: info.outputPath(`files-dark-${width}.png`),
      fullPage: true,
    });
    const audit = await expectAccessibleHome(page, info);
    await expectGradientIncompletes(page, info, audit.incomplete);
    expect(fixture.requests).toEqual([]);
    expect(fixture.host.calls("session")).toHaveLength(0);
    expectFilesIsolation(fixture);
  });
}

import { test, expect } from "@playwright/test";
import { tabTo, expectFocusEvidence } from "../accessibility-interaction";
import {
  filesFixture,
  filesUrl,
  connectFiles,
  fillDocument,
  expectFilesIsolation,
  actionClient,
  ids,
} from "./meri-files-fixtures";

for (const state of ["unknown", "in-flight"] as const) {
  test(`Files ${state} write remains fenced through cross-mode Back/Forward and reconnect`, async ({
    page,
  }) => {
    const fixture = await filesFixture(page);
    const held =
      state === "in-flight"
        ? fixture.hold("create", { json: fixture.first })
        : null;
    if (!held)
      fixture.reply("create", {
        status: 502,
        json: {
          error: { code: "ARTIFACT_EFFECT_UNKNOWN", outcome: "UNKNOWN" },
        },
      });
    await page.goto(filesUrl());
    await connectFiles(page);
    await fillDocument(page);
    await page
      .getByRole("button", { name: "Create document", exact: true })
      .click();
    if (held) {
      await held.entered;
      await expect(
        page.getByLabel("Document title", { exact: true }),
      ).toBeDisabled();
    } else
      await expect(
        page.getByRole("region", { name: "Unresolved document write" }),
      ).toBeVisible();
    await page
      .getByRole("navigation", { name: "Product modes" })
      .getByRole("link", { name: "Modules", exact: true })
      .click();
    await expect(
      page.getByRole("heading", {
        name: "Work in Capiro, across your modules",
      }),
    ).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(filesUrl());
    await connectFiles(page, "docx", true);
    await expect(
      page.getByRole("region", { name: "Unresolved document write" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Create document", exact: true }),
    ).toBeDisabled();
    if (held) await held.release();
    await expect(
      page.getByRole("heading", { name: "Synthetic.docx", exact: true }),
    ).toHaveCount(0);
    await page
      .getByLabel("Known version ID", { exact: true })
      .fill(ids.version);
    await page
      .getByRole("button", { name: "Inspect version ID", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Synthetic.docx", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Create document", exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", {
        name: "Revise selected version",
        exact: true,
      }),
    ).toBeDisabled();
    await page.goForward();
    await expect(
      page.getByRole("heading", {
        name: "Work in Capiro, across your modules",
      }),
    ).toBeVisible();
    await page.goBack();
    await connectFiles(page, "docx", true);
    await expect(
      page.getByRole("region", { name: "Unresolved document write" }),
    ).toBeVisible();
    expect(fixture.calls("create")).toHaveLength(1);
    expect(fixture.calls("inspect")).toHaveLength(1);
    expect(fixture.calls("revise")).toHaveLength(0);
    expect(fixture.host.calls("session")).toHaveLength(3);
    expectFilesIsolation(fixture);
  });
}

for (const width of [1440, 390]) {
  test(`Files ${width}px is keyboard reachable with scoped history and zero automatic operations`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    const fixture = await filesFixture(page);
    const home = `/meri?clientId=${actionClient.id}`;
    await page.goto(home);
    await expect(
      page.getByRole("heading", {
        name: "Conversations unavailable",
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByLabel("Message draft", { exact: true })).toHaveCount(
      0,
    );
    await expect(page.locator("body")).not.toContainText(
      "Good morning, Jordan",
    );
    await expect(page.locator("body")).not.toContainText("Anduril");
    // At 390px the sections sit behind the Figma "Workspace menu" disclosure.
    const menu = page.getByRole("button", {
      name: "Workspace menu",
      exact: true,
    });
    if (width === 390) {
      await tabTo(page, menu);
      await page.keyboard.press("Enter");
      await expect(menu).toHaveAttribute("aria-expanded", "true");
    }
    const files = page.getByRole(width === 390 ? "link" : "button", {
      name: "Files",
      exact: true,
    });
    await expect(files).toHaveCount(1);
    if (width === 390) await expect(files).toHaveAttribute("href", filesUrl());
    await tabTo(page, files);
    await expectFocusEvidence(files, testInfo);
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(filesUrl());
    if (width === 390) {
      // Navigating closes the menu; reopen it to read the current section.
      await expect(menu).toHaveAttribute("aria-expanded", "false");
      await menu.click();
    }
    await expect(files).toHaveAttribute("aria-current", "page");
    if (width === 390) await page.keyboard.press("Escape");
    const connect = page.getByRole("button", {
      name: "Connect document service",
      exact: true,
    });
    await tabTo(page, connect);
    await expectFocusEvidence(connect, testInfo);
    expect(fixture.host.calls("session")).toHaveLength(0);
    expect(fixture.requests).toEqual([]);
    await page.keyboard.press("Enter");
    await expect(
      page.getByLabel("Document title", { exact: true }),
    ).toBeEditable();
    const title = page.getByLabel("Document title", { exact: true });
    await tabTo(page, title);
    await expect(title).toBeFocused();
    await page.keyboard.type("Unsubmitted keyboard draft");
    expect(fixture.requests).toEqual([]);
    await page.screenshot({
      path: testInfo.outputPath(`files-keyboard-${width}.png`),
      fullPage: true,
    });
    await page.goBack();
    await expect(page).toHaveURL(home);
    await page.goForward();
    await expect(page).toHaveURL(filesUrl());
    await expect(connect).toBeEnabled();
    await expect(title).toHaveCount(0);
    expect(fixture.host.calls("session")).toHaveLength(1);
    expect(fixture.requests).toEqual([]);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    expectFilesIsolation(fixture);
  });
}

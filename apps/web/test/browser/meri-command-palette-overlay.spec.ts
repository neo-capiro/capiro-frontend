import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { expectAccessibleHome } from "../accessibility";
import { observeHomeIsolation } from "../accessibility-interaction";
import { filesFixture, expectFilesIsolation } from "./meri-files-fixtures";
import { fixtureScreenUrl } from "./meri-fixture-screen-helpers";

async function openDialogScreen(page: Page, info: TestInfo, slug: string) {
  const fixture = await filesFixture(page);
  const assertIsolation = await observeHomeIsolation(page, info);
  await page.setViewportSize({ width: 1440, height: 1040 });
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto(fixtureScreenUrl(slug));
  return async () => {
    await expectAccessibleHome(page, info);
    expect(fixture.requests).toEqual([]);
    expect(fixture.host.calls("session")).toHaveLength(0);
    expectFilesIsolation(fixture);
    assertIsolation();
  };
}

test("01.05 palette leaves the workspace undimmed and traps keyboard focus", async ({
  page,
}, info) => {
  const finish = await openDialogScreen(page, info, "command-palette");
  const dialog = page.getByRole("dialog", {
    name: "Search your Meri workspace",
  });
  const overlay = page.locator('[data-slot="dialog-overlay"]');
  const search = dialog.getByRole("combobox", { name: "Search" });
  await expect(dialog).toBeVisible();
  await expect(overlay).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(search).toBeFocused();
  expect(
    await search.evaluate(
      (element) =>
        element.matches(":focus-visible") &&
        parseFloat(getComputedStyle(element).outlineWidth) >= 2,
    ),
  ).toBe(true);

  await page.keyboard.press("Shift+Tab");
  expect(
    await page.evaluate(() =>
      Boolean(document.activeElement?.closest('[role="dialog"]')),
    ),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  const trigger = page.getByRole("button", {
    name: "Search your Meri workspace",
  });
  await expect(trigger).toBeFocused();

  await page.keyboard.press("Control+k");
  await expect(dialog).toBeVisible();
  await expect(search).toBeFocused();
  await expect(overlay).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await finish();
});

test("04.02 file picker retains its modal scrim", async ({ page }, info) => {
  const finish = await openDialogScreen(page, info, "attach-capiro-file");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator('[data-slot="dialog-overlay"]')).not.toHaveCSS(
    "background-color",
    "rgba(0, 0, 0, 0)",
  );
  await finish();
});

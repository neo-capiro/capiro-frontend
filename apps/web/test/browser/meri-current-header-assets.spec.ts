import { test, expect } from "@playwright/test";
import { filesFixture } from "./meri-files-fixtures";

for (const screen of ["home", "cited-answer"] as const) {
  test(`synthetic desktop ${screen} uses the current exact18px header assets without changing destinations`, async ({
    page,
  }, info) => {
    const fixture = await filesFixture(page);
    await page.setViewportSize({ width: 1440, height: 1040 });
    await page.goto(`/meri/fixture/${screen}`);
    const header = page.getByRole("banner");
    for (const [role, name, asset] of [
      ["link", "Quick log", "quick-log"],
      ["link", "Master calendar", "calendar"],
      ["link", "Search", "search"],
      ["button", "Updates", "updates"],
    ] as const) {
      const action = header.getByRole(role, { name, exact: true });
      const icon = action.locator("img");
      await expect(icon).toHaveAttribute(
        "src",
        `/design/header-34-20261016/${asset}.svg`,
      );
      await expect(icon).toBeVisible();
      expect(
        await icon.evaluate((element: HTMLImageElement) => ({
          naturalWidth: element.naturalWidth,
          naturalHeight: element.naturalHeight,
          width: element.getBoundingClientRect().width,
          height: element.getBoundingClientRect().height,
        })),
      ).toEqual({ naturalWidth: 18, naturalHeight: 18, width: 18, height: 18 });
      await expect(action).toHaveCSS("width", "40px");
      await expect(action).toHaveCSS("height", "40px");
      await action.focus();
      await expect(action).toBeFocused();
    }
    await expect(
      header.getByRole("link", { name: "Quick log", exact: true }),
    ).toHaveAttribute("href", "/portfolio?log=1");
    await expect(
      header.getByRole("link", { name: "Master calendar", exact: true }),
    ).toHaveAttribute("href", "/calendar");
    await expect(
      header.getByRole("link", { name: "Search", exact: true }),
    ).toHaveAttribute("href", "/modules/intelligence");
    await expect(
      header.getByRole("link", { name: "Meri", exact: true }),
    ).toHaveAttribute("aria-current", "page");
    await expect(
      header.getByRole("link", { name: "Portfolio", exact: true }),
    ).toHaveAttribute("href", "/portfolio");
    await expect(
      header.getByRole("link", { name: "Modules", exact: true }),
    ).toHaveAttribute("href", "/modules");
    await page.screenshot({
      path: info.outputPath(`${screen}-current-header.png`),
    });
    expect(fixture.requests).toEqual([]);
  });
}

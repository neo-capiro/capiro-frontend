import { test, expect } from "@playwright/test";
import {
  metadataClients,
  suppliedOwner,
  portfolioAccessibilityFixture,
} from "./portfolio-accessibility-fixtures";

for (const width of [1440, 390]) {
  test(`Portfolio semantic correction: ${width}px independent visible descriptions retain location, fallback and owner`, async ({
    page,
  }, testInfo) => {
    const assertIsolation = await portfolioAccessibilityFixture(
      page,
      testInfo,
      metadataClients,
      { [metadataClients[0]!.id]: suppliedOwner },
    );
    await page.setViewportSize({ width, height: width === 1440 ? 1040 : 844 });
    await page.goto("/portfolio");
    const descriptions = [
      "Aerospace · Austin, TX",
      "Energy",
      "Sector not supplied",
    ];
    const ids: string[] = [];
    for (const [index, client] of metadataClients.entries()) {
      const open = page.getByRole("link", {
        name: `Open ${client.name}`,
        exact: true,
      });
      const card = page.locator("article").filter({ has: open });
      await expect(open).toHaveCount(1);
      await expect(
        card.getByRole("heading", { level: 2 }).filter({ has: open }),
      ).toBeVisible();
      await expect(open).toHaveAccessibleDescription(descriptions[index]!);
      const id = await open.getAttribute("aria-describedby");
      expect(id).toBeTruthy();
      ids.push(id!);
      const metadata = page.locator(`[id=${JSON.stringify(id)}]`);
      await metadata.scrollIntoViewIfNeeded();
      await expect(metadata).toBeVisible();
      await expect(metadata).toBeInViewport();
      await expect(metadata).toHaveText(descriptions[index]!);
      expect(
        await metadata.evaluate((element) => ({
          hidden: Boolean(
            element.closest('[aria-hidden="true"], [hidden], [inert]'),
          ),
          insideLink: Boolean(element.closest("a")),
        })),
      ).toEqual({ hidden: false, insideLink: false });
      await expect(
        card.getByRole("note", { name: "Profile status: ACTIVE", exact: true }),
      ).toBeVisible();
      await expect(
        card.getByRole("img", {
          name:
            index === 0
              ? "Account owner: Taylor Owner"
              : "Account owner: unavailable",
          exact: true,
        }),
      ).toBeVisible();
    }
    expect(new Set(ids).size).toBe(metadataClients.length);
    assertIsolation();
  });
}

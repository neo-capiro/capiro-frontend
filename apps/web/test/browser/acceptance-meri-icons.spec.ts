import { test, expect, type Locator } from "@playwright/test";
import { filesFixture, actionClient } from "./meri-files-fixtures";

async function filter(icon: Locator) {
  await expect(icon).toBeVisible();
  return icon.evaluate((element) => getComputedStyle(element).filter);
}

for (const colorScheme of ["light", "dark"] as const) {
  test(`Meri explicit fixture navigation assets retain visible icon treatment in ${colorScheme}`, async ({
    page,
  }) => {
    const fixture = await filesFixture(page);
    await page.emulateMedia({ colorScheme });
    await page.goto(`/meri/fixture/home?clientId=${actionClient.id}`);
    await expect(
      page.getByLabel("Message draft", { exact: true }),
    ).toBeVisible();
    const sidebar = page.getByRole("complementary", {
      name: "Meri navigation",
    });
    // Search conversations opens the fixture command palette, so it is a link.
    for (const [role, name] of [
      ["button", "Files"],
      ["button", "Conversations"],
      ["link", "Search conversations"],
    ] as const) {
      const icon = sidebar
        .getByRole(role, { name, exact: true })
        .locator("img");
      expect(await filter(icon)).toBe(
        colorScheme === "light" ? "none" : "brightness(0) invert(1)",
      );
      await expect(icon).toHaveAttribute("src", /^\/design\/home\/[^/]+\.svg$/);
    }
    expect(
      await filter(
        sidebar
          .getByRole("button", { name: "New conversation" })
          .locator("img"),
      ),
    ).toBe("brightness(0) invert(1)"); // Figma 10.28-10.32: the dark gradient button keeps a light icon.
    expect(
      await filter(
        page
          .getByRole("banner")
          .getByRole("link", { name: "Meri", exact: true })
          .locator("img"),
      ),
    ).toBe("none");
    expect(fixture.requests).toEqual([]);
  });
}

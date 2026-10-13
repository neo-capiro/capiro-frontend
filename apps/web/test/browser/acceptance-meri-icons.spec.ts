import { test, expect, type Locator } from "@playwright/test";
import { filesFixture, actionClient } from "./meri-files-fixtures";

async function filter(icon: Locator) {
  await expect(icon).toBeVisible();
  return icon.evaluate((element) => getComputedStyle(element).filter);
}

for (const colorScheme of ["light", "dark"] as const) {
  test(`Meri exact navigation assets retain visible icon treatment in ${colorScheme}`, async ({
    page,
  }) => {
    const fixture = await filesFixture(page);
    await page.emulateMedia({ colorScheme });
    await page.goto(`/meri?clientId=${actionClient.id}`);
    await expect(
      page.getByLabel("Message draft", { exact: true }),
    ).toBeVisible();
    const sidebar = page.getByRole("complementary", {
      name: "Meri navigation",
    });
    for (const name of ["Files", "Conversations", "Search conversations"]) {
      const icon = sidebar
        .getByRole("button", { name, exact: true })
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
    ).toBe(
      colorScheme === "light" ? "brightness(0) invert(1)" : "brightness(0)",
    );
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

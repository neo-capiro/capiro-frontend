import { expect, test } from "@playwright/test";
import { capabilityId, clientId, json } from "./fixtures";
import { installCapabilityBoundary } from "./capability-boundary-fixtures";

for (const screen of [
  {
    name: "desktop-light",
    width: 1440,
    height: 1040,
    colorScheme: "light" as const,
  },
  { name: "phone-dark", width: 390, height: 844, colorScheme: "dark" as const },
])
  test(`capability and opportunity guarded states render at ${screen.name}`, async ({
    page,
  }, info) => {
    const unexpected = await installCapabilityBoundary(page);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize({ width: screen.width, height: screen.height });
    await page.emulateMedia({ colorScheme: screen.colorScheme });
    await page.goto(
      `/portfolio/${clientId}/capabilities?capability=${capabilityId}`,
    );
    const editor = page.getByRole("dialog", {
      name: "Capability: Test sensor",
    });
    await editor.getByText("Details", { exact: true }).click();
    await expect(editor.getByLabel("Name", { exact: true })).toBeEnabled();
    const type = await editor.getByLabel("Type", { exact: true }).boundingBox();
    const sector = await editor
      .getByLabel("Sector", { exact: true })
      .boundingBox();
    expect(type).not.toBeNull();
    expect(sector).not.toBeNull();
    expect(Math.abs(type!.width - sector!.width)).toBeLessThanOrEqual(1);
    if (screen.width > 680) {
      expect(Math.abs(type!.y - sector!.y)).toBeLessThanOrEqual(1);
      expect(sector!.x - type!.x - type!.width).toBeCloseTo(12, 0);
    } else {
      expect(Math.abs(type!.x - sector!.x)).toBeLessThanOrEqual(1);
      expect(sector!.y).toBeGreaterThan(type!.y + type!.height);
    }
    expect(
      await editor.evaluate(
        (element) => element.scrollWidth <= element.clientWidth + 1,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`capability-editor-${screen.name}.png`),
      fullPage: true,
    });
    await editor
      .getByRole("button", { name: "Save capability", exact: true })
      .scrollIntoViewIfNeeded();
    await page.screenshot({
      path: info.outputPath(`capability-editor-actions-${screen.name}.png`),
      fullPage: true,
    });
    await editor.getByRole("button", { name: "Close", exact: true }).click();
    await page
      .getByRole("button", { name: "Add capability", exact: true })
      .click();
    const create = page.getByRole("dialog", {
      name: "New capability",
      exact: true,
    });
    await expect(create.getByLabel("Name", { exact: true })).toBeEnabled();
    await page.screenshot({
      path: info.outputPath(`capability-create-${screen.name}.png`),
      fullPage: true,
    });
    await create.getByRole("button", { name: "Close", exact: true }).click();
    await page.route(`**/core/clients/${clientId}/capabilities`, (route) =>
      json(route, { message: "Synthetic capability list denied" }, 403),
    );
    await page.reload();
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.getByRole("link", { name: "Open target" })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`capability-read-error-${screen.name}.png`),
      fullPage: true,
    });

    await page.goto(`/portfolio/${clientId}/opportunities`);
    const matched = page.getByRole("region", {
      name: "Available opportunities",
    });
    await expect(
      matched.getByRole("link", { name: "Test opportunity", exact: true }),
    ).toBeVisible();
    await page.route(
      "**/core/intelligence/opportunities/v2/search?*",
      (route) => json(route, { message: "Synthetic matched feed denied" }, 403),
    );
    await page.getByRole("button", { name: "Refresh", exact: true }).click();
    await expect(matched.getByRole("alert")).toBeVisible();
    await expect(matched.getByRole("link")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Open PE →" })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`opportunity-read-error-${screen.name}.png`),
      fullPage: true,
    });
    expect(errors).toEqual([]);
    expect(unexpected).toEqual([]);
  });

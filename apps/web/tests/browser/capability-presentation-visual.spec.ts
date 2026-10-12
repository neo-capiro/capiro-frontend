import { expect, test, type Locator } from "@playwright/test";
import { clientId, capabilityId, json } from "./fixtures";
import {
  expectNoCapabilityOverflow,
  installCapabilityPresentation,
  openCapabilityDetails,
  openPresentedCapability,
} from "./capability-presentation-fixtures";

async function checkTypeSector(editor: Locator, phone: boolean) {
  const type = await editor.getByLabel("Type", { exact: true }).boundingBox();
  const sector = await editor
    .getByLabel("Sector", { exact: true })
    .boundingBox();
  expect(type).not.toBeNull();
  expect(sector).not.toBeNull();
  expect(Math.abs(type!.width - sector!.width)).toBeLessThanOrEqual(1);
  if (phone) {
    expect(Math.abs(type!.x - sector!.x)).toBeLessThanOrEqual(1);
    expect(sector!.y).toBeGreaterThan(type!.y + type!.height);
  } else {
    expect(Math.abs(type!.y - sector!.y)).toBeLessThanOrEqual(1);
    expect(sector!.x - type!.x - type!.width).toBeCloseTo(12, 0);
  }
}

for (const screen of [
  {
    name: "desktop-light",
    width: 1440,
    height: 1040,
    colorScheme: "light" as const,
  },
  {
    name: "phone-light",
    width: 390,
    height: 844,
    colorScheme: "light" as const,
  },
  { name: "phone-dark", width: 390, height: 844, colorScheme: "dark" as const },
])
  test(`Figma capability Profile, Documents and create surfaces at ${screen.name}`, async ({
    page,
  }, info) => {
    // Six full-page captures plus all editor transitions can exceed 30 seconds
    // on a shared CPU. Keep every assertion with a bounded 90-second case budget.
    test.slow();
    const unexpected = await installCapabilityPresentation(page);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize({ width: screen.width, height: screen.height });
    await page.emulateMedia({ colorScheme: screen.colorScheme });
    const phone = screen.width <= 680;
    const editor = await openPresentedCapability(page);
    const bounds = await editor.boundingBox();
    expect(bounds!.width).toBe(phone ? screen.width - 32 : 720);
    expect(bounds!.y).toBe(phone ? 16 : 60);
    await expect(editor.getByLabel("Name", { exact: true })).toBeHidden();
    await expect(editor.getByText("product", { exact: true })).toBeVisible();
    await expect(editor.getByText("Defense", { exact: true })).toBeVisible();
    const levels = editor.getByRole("button", { name: /^TRL [1-9]$/ });
    await expect(levels).toHaveCount(9);
    await expect(
      editor.getByRole("button", { name: "TRL 6", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    const first = await levels.first().boundingBox();
    const last = await levels.last().boundingBox();
    expect(Math.abs(first!.y - last!.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(first!.width - last!.width)).toBeLessThanOrEqual(1);
    if (!phone) {
      expect(first!.width).toBe(40);
      expect(first!.height).toBe(30);
    }
    const tags = editor.getByLabel("Tags", { exact: true });
    const chip = editor.getByRole("button", {
      name: "Remove autonomy from Tags",
      exact: true,
    });
    expect(
      await tags.evaluate((input) =>
        input.parentElement?.contains(input.closest("label")),
      ),
    ).toBe(false);
    expect(
      await chip.evaluate((button) => button.closest("label") === null),
    ).toBe(true);
    await expectNoCapabilityOverflow(page, editor);
    await page.screenshot({
      path: info.outputPath(`capability-profile-${screen.name}.png`),
      fullPage: true,
    });
    await openCapabilityDetails(editor);
    await checkTypeSector(editor, phone);
    await editor
      .getByRole("button", { name: "Save capability", exact: true })
      .scrollIntoViewIfNeeded();
    await expectNoCapabilityOverflow(page, editor);
    await page.screenshot({
      path: info.outputPath(`capability-details-${screen.name}.png`),
      fullPage: true,
    });
    await editor.getByRole("tab", { name: "Documents", exact: true }).click();
    await expect(
      editor.getByRole("button", {
        name: "Synthetic datasheet.pdf",
        exact: true,
      }),
    ).toBeVisible();
    await expectNoCapabilityOverflow(page, editor);
    await page.screenshot({
      path: info.outputPath(`capability-documents-${screen.name}.png`),
      fullPage: true,
    });
    await editor.getByRole("tab", { name: "Profile", exact: true }).click();
    await editor.getByText("Details", { exact: true }).click();
    await page.route(
      `**/core/clients/${clientId}/capabilities/${capabilityId}`,
      (route) =>
        json(
          route,
          { message: "Synthetic capability validation refused" },
          400,
        ),
    );
    await editor
      .getByRole("button", { name: "Save capability", exact: true })
      .click();
    await expect(editor.getByRole("alert")).toContainText(
      "Synthetic capability validation refused",
    );
    await editor.getByRole("alert").scrollIntoViewIfNeeded();
    await page.screenshot({
      path: info.outputPath(`capability-save-error-${screen.name}.png`),
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
    await expect(create.getByLabel("Name", { exact: true })).toBeFocused();
    expect((await create.boundingBox())!.width).toBe(
      phone ? screen.width - 32 : 620,
    );
    await checkTypeSector(create, phone);
    await expectNoCapabilityOverflow(page, create);
    await page.screenshot({
      path: info.outputPath(`capability-create-${screen.name}.png`),
      fullPage: true,
    });
    await create.getByText("Additional details", { exact: true }).click();
    await create.getByLabel("Notes", { exact: true }).scrollIntoViewIfNeeded();
    await expectNoCapabilityOverflow(page, create);
    await page.screenshot({
      path: info.outputPath(`capability-create-details-${screen.name}.png`),
      fullPage: true,
    });
    expect(errors).toEqual([]);
    expect(unexpected).toEqual([]);
  });

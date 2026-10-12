import { test, expect } from "@playwright/test";
import { installProfileCurrentState } from "./profile-current-state-fixtures";

for (const viewport of [
  { width: 1440, height: 1040 },
  { width: 390, height: 844 },
]) {
  test(`current profile dialogs fit ${viewport.width}px and avoid cross-component render updates`, async ({
    page,
  }, info) => {
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    const { state, unexpected } = await installProfileCurrentState(page);
    for (const mode of ["notes", "team", "facilities"]) {
      await page.goto(`/profile-current-state.html?mode=${mode}`);
      if (mode === "facilities")
        await page
          .getByRole("button", { name: "Add facility", exact: true })
          .click();
      else if (mode === "notes")
        await expect(page.getByLabel("Notes", { exact: true })).toHaveValue(
          "Saved profile notes",
        );
      else
        await expect(
          page.getByRole("listitem").filter({ hasText: "Olivia Owner" }),
        ).toBeVisible();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      const bounds = await dialog.boundingBox();
      expect(bounds).not.toBeNull();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width);
      expect(bounds!.height).toBeLessThanOrEqual(viewport.height);
      await page.keyboard.press("Tab");
      expect(
        await dialog.evaluate((element) =>
          element.contains(document.activeElement),
        ),
      ).toBe(true);
      await page.screenshot({
        path: info.outputPath(`${mode}-${viewport.width}.png`),
        fullPage: true,
      });
      await page.keyboard.press("Escape");
      await expect(dialog).not.toBeVisible();
    }
    expect(errors).toEqual([]);
    expect(state.writes).toEqual([]);
    expect(unexpected).toEqual([]);
  });
}

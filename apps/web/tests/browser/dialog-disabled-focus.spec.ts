import { expect, test, type Locator, type Page } from "@playwright/test";
import { clientId, file, installFixtures, json } from "./fixtures";

async function expectContainedFocus(page: Page, dialog: Locator) {
  await expect
    .poll(() =>
      dialog.evaluate((node) => node.contains(document.activeElement)),
    )
    .toBe(true);
  for (const key of ["Tab", "Tab", "Shift+Tab", "Shift+Tab"]) {
    await page.keyboard.press(key);
    await expect
      .poll(() =>
        dialog.evaluate((node) => node.contains(document.activeElement)),
      )
      .toBe(true);
  }
}

for (const width of [360, 1440]) {
  for (const submit of ["button", "field"] as const) {
    test(`disabled ${submit} keeps pending and unknown dialog focus at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 1040 });
      const unexpected = await installFixtures(page);
      let release = () => {};
      const held = new Promise<void>((resolve) => (release = resolve));
      let writes = 0;
      await page.route("**/engagement/attachments?**", (route) =>
        json(route, [{ ...file, metadataRevision: 3 }]),
      );
      await page.route(`**/files/batch-moves`, async (route) => {
        writes++;
        await held;
        return json(route, file);
      });
      await page.goto(`/portfolio/${clientId}/files`);
      await page
        .getByRole("checkbox", { name: `Select ${file.fileName}` })
        .check();
      const trigger = page.getByRole("button", {
        name: "New folder",
        exact: true,
      });
      await trigger.click();
      const dialog = page.getByRole("dialog", {
        name: "New folder",
        exact: true,
      });
      const field = dialog.getByLabel("Folder name");
      await field.fill("Reviewed destination");
      const save = dialog.getByRole("button", {
        name: "Create folder & move file",
      });
      if (submit === "button") await save.click();
      else await field.press("Enter");
      await expect.poll(() => writes).toBe(1);
      await expect(
        dialog.getByRole("button", { name: "Check move outcome" }),
      ).toBeDisabled();
      await expectContainedFocus(page, dialog);
      release();
      await expect(dialog.getByText(/move is unconfirmed/)).toBeVisible();
      await expectContainedFocus(page, dialog);
      await page.keyboard.press("Escape");
      await expect(dialog).toHaveCount(0);
      await expect(trigger).toBeFocused();
      expect(writes).toBe(1);
      expect(unexpected).toEqual([]);
    });
  }
}

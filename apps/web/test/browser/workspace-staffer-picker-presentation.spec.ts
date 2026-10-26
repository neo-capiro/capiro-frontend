import { expect } from "@playwright/test";
import { test } from "./runtime-observed-test";
import {
  auditPresentation,
  capturePresentation,
  contained,
} from "./ordinary-presentation-evidence";
import {
  directoryPage,
  office,
  openStafferDialog,
  staffer,
  stafferFixture,
} from "./workspace-staffer-picker-fixture";

for (const width of [1440, 390]) {
  test(`Directory staffer controls at ${width}px use canonical styles and keyboard selection`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 1040 });
    const name =
      width === 390
        ? "Priya Raman with a long displayed name"
        : staffer.fullName;
    const member =
      width === 390
        ? "Representative Fallon and the congressional district office"
        : office.memberName;
    const state = await stafferFixture(page, {
      read: () => ({
        json: directoryPage(1, [
          {
            ...office,
            memberName: member,
            staff: [{ ...staffer, fullName: name }],
          },
        ]),
      }),
    });
    const dialog = await openStafferDialog(page);
    const search = dialog.getByLabel("Search the Directory", { exact: true });
    await search.fill("Priya");
    const choice = dialog.getByRole("button", {
      name: new RegExp(`${name}, Legislative Director`),
    });
    await expect(choice).toBeVisible();
    await search.focus();
    await page.keyboard.press("Tab");
    await expect(choice).toBeFocused();
    await page.keyboard.press("Space");
    await expect(choice).toHaveAttribute("aria-pressed", "true");
    await expect(
      dialog.getByRole("button", { name: "Confirm", exact: true }),
    ).toBeEnabled();
    expect(state.writes).toEqual([]);
    await contained(page, dialog);
    await contained(page, choice);
    const bounds = await dialog.boundingBox();
    expect(bounds!.width).toBeLessThanOrEqual(width === 390 ? 358 : 760);
    await capturePresentation(page, info, `ws11-directory-${width}`, dialog);
    await auditPresentation(
      page,
      info,
      `ws11-directory-${width}`,
      '[role="dialog"]',
    );
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Resolve", exact: true }).first(),
    ).toBeFocused();
    expect(state.writes).toEqual([]);
  });
}

import { expect, test } from "@playwright/test";
import {
  ordinarySaveFixture,
  ordinaryEditorUrl,
  openOrdinary,
  editOrdinary,
} from "./workspace-ordinary-save-fixture";
import {
  auditPresentation,
  capturePresentation,
  contained,
  presentationFont,
} from "./ordinary-presentation-evidence";

test("a pending submission is not labelled as an unconfirmed outcome", async ({
  page,
}) => {
  const f = await ordinarySaveFixture(page, { holdSave: true });
  await openOrdinary(page);
  await editOrdinary(page);
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect.poll(() => f.saves.length).toBe(1);
  await expect(
    page.getByRole("heading", { name: "Save unconfirmed" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Save draft", exact: true }),
  ).toBeDisabled();
  f.release();
  await expect(
    page.getByText(/immutable version and current saved content are confirmed/),
  ).toBeVisible();
});

for (const width of [1440, 390]) {
  test(`ordinary presentation contains title, export and uncertain readback at ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 1040 });
    const f = await ordinarySaveFixture(page, { loseFirstResponse: true });
    f.changeSaved(
      "Synthetic planning document with a long title that wraps on a narrow screen",
    );
    await presentationFont(page);
    await openOrdinary(page);
    const exports = page.getByRole("region", { name: "Saved document export" });
    await contained(page, exports);
    await expect(exports.getByText(/server-saved content/)).toBeVisible();
    const selection = exports.getByRole("combobox");
    await expect(selection).toHaveAccessibleName("Saved content to export");
    await selection.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("option").first()).toBeVisible();
    await capturePresentation(page, info, `ordinary-export-selection-${width}`);
    await page.keyboard.press("Escape");
    await expect(selection).toBeFocused();
    await capturePresentation(page, info, `ordinary-header-export-${width}`);
    await auditPresentation(
      page,
      info,
      `export-${width}`,
      '[aria-label="Saved document export"]',
    );
    expect(f.saves).toHaveLength(0);
    await editOrdinary(page);
    await page.getByRole("button", { name: "Save draft", exact: true }).click();
    const recovery = page.getByRole("region", {
      name: "Document save recovery",
    });
    await expect(
      recovery.getByRole("heading", { name: "Save unconfirmed" }),
    ).toBeVisible();
    await contained(page, recovery);
    await capturePresentation(
      page,
      info,
      `ordinary-unconfirmed-${width}`,
      recovery,
    );
    await recovery
      .getByRole("button", { name: "Read current saved content" })
      .click();
    await expect(
      recovery.getByText("Retained local body", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByLabel("Document title", { exact: true }),
    ).toHaveValue("Retained local title");
    await expect(
      page.getByRole("button", { name: "Save draft", exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Adopt current saved content" }),
    ).toHaveCount(0);
    expect(f.saves).toHaveLength(1);
    await capturePresentation(
      page,
      info,
      `ordinary-readback-${width}`,
      recovery,
    );
    await auditPresentation(
      page,
      info,
      `recovery-${width}`,
      '[aria-label="Document save recovery"]',
    );
    const original = structuredClone(f.saves[0]);
    await recovery
      .getByRole("button", { name: "Retry exact original save" })
      .click();
    await expect(
      recovery.getByText(
        /immutable version and current saved content are confirmed/,
      ),
    ).toBeVisible();
    expect(f.saves).toEqual([original, original]);
  });

  test(`newsletter reuses contained recovery presentation at ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 1040 });
    const f = await ordinarySaveFixture(page, {
      newsletter: true,
      loseFirstResponse: true,
    });
    await presentationFont(page);
    await page.goto(ordinaryEditorUrl);
    await page
      .getByLabel("Document name", { exact: true })
      .fill("Synthetic newsletter retained name");
    await page
      .getByLabel("Subject", { exact: true })
      .fill("Synthetic retained subject");
    await page.getByRole("button", { name: "Save draft", exact: true }).click();
    const recovery = page.getByRole("region", {
      name: "Document save recovery",
    });
    await expect(
      recovery.getByRole("heading", { name: "Save unconfirmed" }),
    ).toBeVisible();
    await contained(page, recovery);
    await capturePresentation(
      page,
      info,
      `newsletter-unconfirmed-${width}`,
      recovery,
    );
    await recovery
      .getByRole("button", { name: "Read current saved content" })
      .click();
    await expect(
      recovery.getByText("Synthetic retained subject", { exact: true }),
    ).toBeVisible();
    await expect(
      recovery.getByText("Saved newsletter body", { exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel("Subject", { exact: true })).toBeDisabled();
    expect(f.saves).toHaveLength(1);
    await contained(page, recovery);
    await capturePresentation(
      page,
      info,
      `newsletter-readback-${width}`,
      recovery,
    );
    await auditPresentation(
      page,
      info,
      `newsletter-${width}`,
      '[aria-label="Document save recovery"]',
    );
  });
}

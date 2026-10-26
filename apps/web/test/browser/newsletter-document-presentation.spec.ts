import { test, expect } from "@playwright/test";
import {
  documentFixture,
  documentId,
  button,
  enterEditor,
  adoptDocument,
  expectIsolated,
  heldResponse,
} from "./newsletter-document-fixtures";

const savedPreview = {
  documentId,
  revision: 4,
  renderHash: "a".repeat(64),
  hashFormat: "newsletter-render-json-v1",
  html: '<html><body style="padding:32px;font:16px/1.6 Georgia"><p>WEEKLY POLICY BRIEFING</p><h1>The week in policy.</h1><p>The saved briefing brings together this week’s developments and the next steps for our team.</p><h2>Plan for the week ahead.</h2><p>Review priorities before sharing.</p></body></html>',
  plainText:
    "The week in policy.\nSaved briefing. Review priorities before sharing.",
  checks: [
    {
      id: "images",
      severity: "warning",
      label: "Image review",
      detail: "An external image is hidden in this preview.",
    },
  ],
};

test("saved preview is one focused canvas with Figma information and explicit return to unsaved editing", async ({
  page,
}, info) => {
  const fixture = await documentFixture(page);
  await enterEditor(page);
  await page.evaluate(() => document.fonts.ready);
  expect(
    await page.evaluate(() => document.fonts.check("13px TestGeist")),
  ).toBe(true);
  await adoptDocument(page);
  await page
    .getByLabel("Subject", { exact: true })
    .fill("Unsaved local subject");
  await page.screenshot({
    path: info.outputPath("rich-local-editing.png"),
    fullPage: true,
  });
  fixture.queue("preview", (route) => route.fulfill({ json: savedPreview }));
  await button(page, "Preview saved state").click();
  await expect(button(page, "Back to editor")).toBeFocused();
  const view = page.getByRole("region", { name: "Saved newsletter preview" });
  const inspector = page.getByRole("complementary", {
    name: "Saved preview information",
  });
  await expect(
    view.getByRole("heading", { name: "Preview newsletter", exact: true }),
  ).toBeVisible();
  await expect(page.locator("iframe")).toHaveCount(1);
  await expect(page.getByLabel("Newsletter name")).toHaveCount(0);
  await expect(inspector).toContainText("Saved revision 4");
  await expect(inspector).toContainText("excludes unsaved local edits");
  await expect(inspector).toContainText("Image review");
  expect((await inspector.boundingBox())!.width).toBe(354);
  expect(await view.innerText()).not.toMatch(
    /[a-f0-9]{8}-[a-f0-9-]{27,}|\b[a-f0-9]{64}\b|Unsaved local subject/i,
  );
  await expect(
    page
      .frameLocator("iframe")
      .getByRole("heading", { name: "The week in policy." }),
  ).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: info.outputPath("rich-saved-preview-desktop.png"),
    fullPage: true,
  });
  await button(page, "Mobile").click();
  await expect(button(page, "Mobile")).toHaveAttribute("aria-pressed", "true");
  expect(
    (await page.locator("iframe").boundingBox())!.width,
  ).toBeLessThanOrEqual(375);
  await page.screenshot({
    path: info.outputPath("rich-saved-preview-mobile-width.png"),
    fullPage: true,
  });
  await button(page, "Saved plain text").focus();
  await page.keyboard.press("Space");
  await expect(page.getByLabel("Saved newsletter plain text")).toHaveText(
    savedPreview.plainText,
  );
  await expect(page.locator("iframe")).toHaveCount(0);
  await page.screenshot({
    path: info.outputPath("rich-saved-preview-plain-text.png"),
    fullPage: true,
  });
  await button(page, "Saved plain text").click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(inspector).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("rich-saved-preview-narrow.png"),
    fullPage: true,
  });
  const beforeReturn = fixture.requests.length;
  await button(page, "Back to editor").click();
  await expect(button(page, "Preview saved state")).toBeFocused();
  await expect(page.getByLabel("Subject", { exact: true })).toHaveValue(
    "Unsaved local subject",
  );
  await expect(view).toHaveCount(0);
  expect(fixture.requests).toHaveLength(beforeReturn);
  expect(fixture.calls("save")).toEqual([]);
  expect(fixture.calls("stage")).toEqual([]);
  expectIsolated(fixture);
});

test("late saved preview completion cannot reopen a canvas after identity replacement", async ({
  page,
}) => {
  const fixture = await documentFixture(page);
  await enterEditor(page);
  await adoptDocument(page);
  const held = heldResponse();
  fixture.queue("preview", async (route) => {
    await held.wait;
    await route.fulfill({ json: savedPreview }).catch(() => {});
    held.finished();
  });
  await button(page, "Preview saved state").click();
  await expect.poll(() => fixture.calls("preview").length).toBe(1);
  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent("test:session", {
        detail: { orgId: "new-org", sessionId: "new-session" },
      }),
    ),
  );
  held.release();
  await held.settled;
  await expect(
    page.getByRole("region", { name: "Saved newsletter preview" }),
  ).toHaveCount(0);
  await expect(page.getByLabel("Newsletter name")).toHaveValue(
    "Untitled newsletter",
  );
  expect(fixture.calls("stage")).toEqual([]);
  expect(fixture.calls("save")).toEqual([]);
  expectIsolated(fixture);
});

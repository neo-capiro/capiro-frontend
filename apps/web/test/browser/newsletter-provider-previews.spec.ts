import { test, expect } from "@playwright/test";
import { newsletterVideoSource } from "@capiro/shared/newsletter";
import {
  providerFixture,
  selectProviderBlock,
  asset,
  videoUrl,
  htmlReport,
  expectNoProviderSideEffects,
} from "./newsletter-providers-fixture";
import { button, documentId } from "./newsletter-document-fixtures";
import { auditDialog } from "./newsletter-provider-a11y";

test("video thumbnail binds the canonical source and is adopted separately with Undo", async ({
  page,
}, info) => {
  const fixture = await providerFixture(page);
  await selectProviderBlock(page, "Video");
  const originalImage = await page
    .getByLabel("Image URL", { exact: true })
    .inputValue();
  await button(page, "Video URL and thumbnail").click();
  await page
    .getByRole("textbox", { name: "Video URL", exact: true })
    .fill("https://unrelated.example.test/video");
  await expect(button(page, "Create thumbnail")).toBeDisabled();
  await page
    .getByRole("textbox", { name: "Video URL", exact: true })
    .fill(videoUrl);
  expect(fixture.calls("videoThumbnail")).toEqual([]);
  await auditDialog(page, info, "video-form-desktop");
  await page.screenshot({ path: info.outputPath("video-form-desktop.png") });
  await button(page, "Create thumbnail").click();
  await expect(page.getByLabel("Video source", { exact: true })).toHaveText(
    newsletterVideoSource(videoUrl)!.url,
  );
  await expect(
    page.getByRole("img", { name: "Proposed video thumbnail" }),
  ).toBeVisible();
  expect(fixture.calls("videoThumbnail")[0]?.input).toEqual({
    params: { id: documentId },
    body: { url: videoUrl },
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await auditDialog(page, info, "video-proposal-narrow");
  await page.screenshot({ path: info.outputPath("video-proposal-narrow.png") });
  await button(page, "Close").click();
  await expect(page.getByLabel("Image URL", { exact: true })).toHaveValue(
    originalImage,
  );
  await button(page, "Video URL and thumbnail").click();
  await button(page, "Use video thumbnail").click();
  await expect(page.getByLabel("Link URL", { exact: true })).toHaveValue(
    newsletterVideoSource(videoUrl)!.url,
  );
  await expect(page.getByLabel("Image URL", { exact: true })).toHaveValue(
    asset().url,
  );
  await button(page, "Undo").click();
  await expect(page.getByLabel("Image URL", { exact: true })).toHaveValue(
    originalImage,
  );
  await expectNoProviderSideEffects(fixture);
});

test("a different video source is rejected without adopting or replaying its thumbnail", async ({
  page,
}) => {
  const fixture = await providerFixture(page);
  fixture.queue("videoThumbnail", (route) =>
    route.fulfill({
      json: {
        sourceUrl: "https://vimeo.com/123456",
        provider: "vimeo",
        title: "Wrong synthetic source",
        imageUrl: asset().url,
      },
    }),
  );
  await selectProviderBlock(page, "Video");
  await button(page, "Video URL and thumbnail").click();
  await button(page, "Create thumbnail").click();
  await expect(
    page.getByText(/This request could not be confirmed/),
  ).toBeVisible();
  await expect(button(page, "Use video thumbnail")).toHaveCount(0);
  await button(page, "Close").click();
  await button(page, "Video URL and thumbnail").click();
  await expect(button(page, "Create thumbnail")).toBeDisabled();
  expect(fixture.calls("videoThumbnail")).toHaveLength(1);
  await expectNoProviderSideEffects(fixture);
});

test("link preview shows the final redirect and text-only warning while preserving display choices", async ({
  page,
}, info) => {
  const fixture = await providerFixture(page);
  await selectProviderBlock(page, "Apps");
  await page
    .getByLabel("Preview source URL", { exact: true })
    .fill("https://source.example.test/article");
  await page.getByLabel("Preview title", { exact: true }).fill("Manual title");
  await page.getByRole("switch", { name: "Show background" }).uncheck();
  await button(page, "Update link preview").click();
  await expect(page.getByLabel("Source URL", { exact: true })).toHaveValue(
    "https://source.example.test/article",
  );
  expect(fixture.calls("linkPreview")).toEqual([]);
  await button(page, "Load preview").click();
  await expect(page.getByLabel("Final destination")).toHaveText(
    "https://redirected.example.test/final",
  );
  await expect(
    page.getByText(
      "The page image could not be imported. The text preview is available.",
    ),
  ).toBeVisible();
  await auditDialog(page, info, "link-proposal-desktop");
  await page.screenshot({ path: info.outputPath("link-proposal-desktop.png") });
  await page.setViewportSize({ width: 390, height: 844 });
  await auditDialog(page, info, "link-proposal-narrow");
  await page.screenshot({ path: info.outputPath("link-proposal-narrow.png") });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await button(page, "Close").click();
  await expect(page.getByLabel("Preview title", { exact: true })).toHaveValue(
    "Manual title",
  );
  await button(page, "Update link preview").click();
  await button(page, "Use link preview").click();
  await expect(page.getByLabel("Preview title", { exact: true })).toHaveValue(
    "Synthetic linked title",
  );
  await expect(
    page.getByLabel("Preview source URL", { exact: true }),
  ).toHaveValue("https://redirected.example.test/final");
  await expect(
    page.getByRole("switch", { name: "Show background" }),
  ).not.toBeChecked();
  await button(page, "Undo").click();
  await expect(page.getByLabel("Preview title", { exact: true })).toHaveValue(
    "Manual title",
  );
  expect(fixture.calls("linkPreview")).toHaveLength(1);
  await expectNoProviderSideEffects(fixture);
});

test("HTML check explicitly submits the saved revision and qualifies unsaved changes", async ({
  page,
}, info) => {
  const fixture = await providerFixture(page);
  await selectProviderBlock(page);
  await button(page, "HTML compatibility check").click();
  expect(fixture.calls("htmlCheck")).toEqual([]);
  await expect(
    page.getByText(/submits the saved newsletter HTML/),
  ).toBeVisible();
  await button(page, "Run HTML check").click();
  await expect(
    page.getByRole("heading", { name: "Mailtrap HTML report", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Synthetic CSS support finding", { exact: true }),
  ).toBeVisible();
  expect(fixture.calls("htmlCheck")[0]?.input).toEqual({
    params: { id: documentId },
    body: { revision: 4 },
  });
  await auditDialog(page, info, "html-report-desktop");
  await page.screenshot({ path: info.outputPath("html-report-desktop.png") });
  await page.setViewportSize({ width: 390, height: 844 });
  await auditDialog(page, info, "html-report-narrow");
  await page.screenshot({ path: info.outputPath("html-report-narrow.png") });
  await button(page, "Close").click();
  await page.getByLabel("Alternative text").fill("Unsaved synthetic alt");
  await button(page, "HTML compatibility check").click();
  await expect(page.getByText(/Local changes are not included/)).toBeVisible();
  await expect(button(page, "Run check again")).toBeDisabled();
  expect(fixture.calls("htmlCheck")).toHaveLength(1);
  await expectNoProviderSideEffects(fixture);
});

test("HTML reports for another revision remain unconfirmed without automatic resubmission", async ({
  page,
}) => {
  const fixture = await providerFixture(page);
  fixture.queue("htmlCheck", (route) => route.fulfill({ json: htmlReport(5) }));
  await selectProviderBlock(page);
  await button(page, "HTML compatibility check").click();
  await button(page, "Run HTML check").click();
  await expect(
    page.getByText(/This request could not be confirmed/),
  ).toBeVisible();
  await expect(page.getByLabel("Report details")).toHaveCount(0);
  await button(page, "Close").click();
  await button(page, "HTML compatibility check").click();
  await expect(button(page, "Run HTML check")).toBeDisabled();
  expect(fixture.calls("htmlCheck")).toHaveLength(1);
  await expectNoProviderSideEffects(fixture);
});

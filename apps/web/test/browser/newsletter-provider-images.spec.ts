import { test, expect } from "@playwright/test";
import {
  providerFixture,
  selectProviderBlock,
  asset,
  assetDetails,
  variantIds,
  expectNoProviderSideEffects,
} from "./newsletter-providers-fixture";
import {
  button,
  heldResponse,
  documentId,
} from "./newsletter-document-fixtures";
import { auditDialog } from "./newsletter-assets-fixture";

test("alt text validates file selection before an explicit request and changes only alt text", async ({
  page,
}, info) => {
  const fixture = await providerFixture(page);
  await selectProviderBlock(page);
  await button(page, "Generate alt text").click();
  await page.getByLabel("Image file", { exact: true }).setInputFiles({
    name: "synthetic.gif",
    mimeType: "image/gif",
    buffer: Buffer.from("synthetic"),
  });
  await expect(
    page.getByText("Choose one PNG, JPEG or WebP file of up to 10 MiB."),
  ).toBeVisible();
  await expect(button(page, "Generate")).toBeDisabled();
  expect(fixture.calls("altText")).toEqual([]);
  await page.getByLabel("Image file", { exact: true }).setInputFiles({
    name: "synthetic.png",
    mimeType: "image/png",
    buffer: Buffer.from("synthetic"),
  });
  await expect(page.getByText("Selected file: synthetic.png")).toBeVisible();
  expect(fixture.calls("altText")).toEqual([]);
  await button(page, "Clear selected file").click();
  await expect(page.getByLabel("Image file", { exact: true })).toHaveValue("");
  await auditDialog(page, info, "alt-form-desktop");
  await page.screenshot({ path: info.outputPath("alt-form-desktop.png") });
  await button(page, "Generate").click();
  await expect(
    page.getByLabel("Proposed alt text", { exact: true }),
  ).toHaveValue("Synthetic accessible image description");
  expect(fixture.calls("altText")[0]).toMatchObject({
    input: {
      params: { id: documentId },
      body: { sourceToken: "a".repeat(64) },
    },
    files: 0,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await auditDialog(page, info, "alt-proposal-narrow");
  await page.screenshot({ path: info.outputPath("alt-proposal-narrow.png") });
  await button(page, "Use alt text").click();
  await expect(page.getByLabel("Alternative text")).toHaveValue(
    "Synthetic accessible image description",
  );
  await expect(page.getByLabel("Image URL", { exact: true })).toHaveValue(
    asset().url,
  );
  await button(page, "Undo").click();
  await expect(page.getByLabel("Alternative text")).toHaveValue(
    "Preserved manual alt",
  );
  await expectNoProviderSideEffects(fixture);
});

test("late alt proposals cannot replace changed content even after an ABA edit", async ({
  page,
}) => {
  const fixture = await providerFixture(page),
    held = heldResponse();
  fixture.queue("altText", async (route) => {
    await held.wait;
    await route.fulfill({ json: { text: "Late synthetic description" } });
    held.finished();
  });
  await selectProviderBlock(page);
  await button(page, "Generate alt text").click();
  await button(page, "Generate").click();
  await expect(page.getByText(/Request in progress/)).toBeVisible();
  await button(page, "Close").click();
  await page.getByLabel("Alternative text").fill("New manual description");
  await page.getByLabel("Alternative text").fill("Preserved manual alt");
  held.release();
  await held.settled;
  await button(page, "Generate alt text").click();
  await expect(
    page.getByText(/earlier result cannot replace the current content/),
  ).toBeVisible();
  await expect(button(page, "Use alt text")).toHaveCount(0);
  await button(page, "Close").click();
  await expect(page.getByLabel("Alternative text")).toHaveValue(
    "Preserved manual alt",
  );
  expect(fixture.calls("altText")).toHaveLength(1);
  await expectNoProviderSideEffects(fixture);
});

test("four saved refinements require fresh current details before explicit insertion", async ({
  page,
}, info) => {
  const fixture = await providerFixture(page);
  await selectProviderBlock(page);
  await button(page, "Refine with AI").click();
  await page
    .getByLabel("Image editing instructions", { exact: true })
    .fill("Synthetic brighter image");
  await page
    .getByRole("switch", { name: "Generate multiple images (4)" })
    .check();
  expect(fixture.calls("refineImage")).toEqual([]);
  await auditDialog(page, info, "refine-form-desktop");
  await page.screenshot({ path: info.outputPath("refine-form-desktop.png") });
  await button(page, "Generate").click();
  await expect(button(page, "Review variant 4")).toBeVisible();
  expect(fixture.calls("refineImage")[0]).toMatchObject({
    input: {
      params: { id: documentId },
      body: {
        prompt: "Synthetic brighter image",
        count: 4,
        sourceToken: "a".repeat(64),
      },
    },
    files: 0,
  });
  fixture.assets.queue("detail", (route) =>
    route.fulfill({ json: { ...assetDetails(), currentRevision: false } }),
  );
  await button(page, "Review variant 1").click();
  await expect(
    page.getByText(/Historical image; Insert is unavailable/),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: "Preview of Synthetic policy image" }),
  ).toBeVisible();
  await expect(button(page, "Insert current variant")).toBeDisabled();
  await button(page, "Review variant 4").click();
  await expect(button(page, "Insert current variant")).toBeEnabled();
  expect(fixture.assets.calls("detail").at(-1)?.input).toEqual({
    params: { id: variantIds[3] },
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await auditDialog(page, info, "refine-results-narrow");
  await page.screenshot({ path: info.outputPath("refine-results-narrow.png") });
  await button(page, "Insert current variant").click();
  await expect(page.getByLabel("Image URL", { exact: true })).toHaveValue(
    asset(variantIds[3]).url,
  );
  await expect(page.getByLabel("Alternative text")).toHaveValue(
    "Preserved manual alt",
  );
  await button(page, "Undo").click();
  await expect(page.getByLabel("Image URL", { exact: true })).toHaveValue(
    asset().url,
  );
  await expectNoProviderSideEffects(fixture);
});

test("a wrong refinement count is unconfirmed and cannot be inserted or automatically repeated", async ({
  page,
}) => {
  const fixture = await providerFixture(page);
  fixture.queue("refineImage", (route) =>
    route.fulfill({ json: { items: [asset()] } }),
  );
  await selectProviderBlock(page);
  await button(page, "Refine with AI").click();
  await page
    .getByLabel("Image editing instructions", { exact: true })
    .fill("Synthetic refinement");
  await page
    .getByRole("switch", { name: "Generate multiple images (4)" })
    .check();
  await button(page, "Generate").click();
  await expect(
    page.getByText(/This request could not be confirmed/),
  ).toBeVisible();
  await expect(button(page, "Insert current variant")).toHaveCount(0);
  await button(page, "Close").click();
  await button(page, "Refine with AI").click();
  await expect(button(page, "Generate")).toBeDisabled();
  expect(fixture.calls("refineImage")).toHaveLength(1);
  await expectNoProviderSideEffects(fixture);
});

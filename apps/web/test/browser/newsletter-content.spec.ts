import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { findNewsletterBlock } from "@capiro/shared/newsletter";
import {
  button,
  closeAndReopen,
  expectIsolated,
} from "./newsletter-document-fixtures";
import {
  contentFixture,
  inspector,
  structure,
  choose,
  selectBlock,
} from "./newsletter-content-fixture";

const capture = process.env.CAPIRO_CONTENT_CAPTURE_DIR;
async function picture(name: string, region: ReturnType<typeof inspector>) {
  if (capture) {
    mkdirSync(capture, { recursive: true });
    const page = region.page();
    const viewport = page.viewportSize()!;
    const bounds = await region.boundingBox();
    // Capture the complete inspector without the unrelated sticky shell obscuring it.
    await page.setViewportSize({
      width: viewport.width,
      height: Math.max(viewport.height, Math.ceil(bounds!.height) + 350),
    });
    await region.evaluate((element) =>
      element.scrollIntoView({ block: "start" }),
    );
    await page.evaluate(() => window.scrollBy(0, -140));
    await region.screenshot({ path: join(capture, name + ".png") });
    await page.setViewportSize(viewport);
  }
}
test("section operations and nested column edits use one local Undo step and cannot drop occupied content", async ({
  page,
}) => {
  const f = await contentFixture(page);
  const other = structure(page).getByRole("region", {
    name: "Section Other section",
    exact: true,
  });
  await other.getByRole("button", { name: "Duplicate", exact: true }).click();
  await expect(
    structure(page).getByRole("heading", {
      name: "Other section copy",
      exact: true,
    }),
  ).toBeVisible();
  await button(page, "Undo").click();
  await expect(
    structure(page).getByRole("heading", {
      name: "Other section copy",
      exact: true,
    }),
  ).toHaveCount(0);
  await other.getByRole("button", { name: "Edit section" }).click();
  const settings = page.getByRole("region", { name: "Section settings" });
  await settings
    .getByLabel("Section name", { exact: true })
    .fill("Moved section");
  await settings
    .getByLabel("Background color", { exact: true })
    .fill("#f5f5f4");
  await structure(page)
    .getByRole("region", { name: "Section Moved section" })
    .getByRole("button", { name: "Move up", exact: true })
    .click();
  await expect(
    structure(page).getByRole("heading", { level: 3 }).first(),
  ).toHaveText("Moved section");
  await selectBlock(page, "Columns");
  await choose(page, inspector(page), "Number of columns", "1");
  await expect(page.getByRole("alert")).toContainText("Move or remove content");
  await choose(page, inspector(page), "Desktop ratio", "1:2");
  await choose(page, inspector(page), "Mobile orientation", "Horizontal");
  await picture("columns-desktop", inspector(page));
  const column = structure(page)
    .getByLabel("Column 1", { exact: true })
    .first();
  await column.getByText("Add block to column 1", { exact: true }).click();
  await column.getByRole("button", { name: "Logo", exact: true }).click();
  await expect(
    inspector(page).getByRole("heading", { name: "Logo", exact: true }),
  ).toBeVisible();
  await button(page, "Undo").click();
  await expect(
    column.getByRole("button", { name: "Logo", exact: true }),
  ).toHaveCount(1); // palette only
  expect(f.calls("save")).toHaveLength(0);
  await button(page, "Save newsletter").click();
  await expect.poll(() => f.calls("save").length).toBe(1);
  expect(
    findNewsletterBlock(f.submitted().design!, f.blocks[1]!.id),
  ).toMatchObject({
    ratio: "1:2",
    mobileOrientation: "horizontal",
    columns: [
      [{ kind: "image", crop: { x: 1, y: 2, width: 3, height: 4 } }],
      [{ kind: "paragraph" }],
    ],
  });
  expect(f.submitted().design!.sections[0]).toMatchObject({
    name: "Moved section",
    style: { background: "#f5f5f4" },
  });
  expectIsolated(f);
});

test("block moves preserve source provenance, duplicates fresh IDs and independent mobile styles round-trip without unrelated loss", async ({
  page,
}) => {
  const f = await contentFixture(page);
  await selectBlock(page, "Paragraph · Retained paragraph");
  await inspector(page).getByText("Block styles", { exact: true }).click();
  await inspector(page)
    .getByRole("switch", { name: "Link Desktop and Mobile styles" })
    .uncheck();
  await choose(page, inspector(page), "Style device", "Mobile");
  await inspector(page).getByLabel("Font size", { exact: true }).fill("19");
  await picture("mobile-block-styles-desktop", inspector(page));
  await inspector(page).getByText("Block position", { exact: true }).click();
  await choose(page, inspector(page), "Move to container", "Other section");
  await inspector(page)
    .getByRole("button", { name: "Move block", exact: true })
    .click();
  await inspector(page)
    .getByRole("button", { name: "Duplicate block" })
    .click();
  await button(page, "Undo").click();
  await button(page, "Save newsletter").click();
  await expect.poll(() => f.calls("save").length).toBe(1);
  const saved = f.submitted().design!;
  expect(saved.sections[1]!.sourceClientIds).toEqual(f.first.sourceClientIds);
  const paragraph = findNewsletterBlock(saved, f.blocks[0]!.id);
  expect(paragraph).toMatchObject({
    style: { color: "#111111", fontSize: 14 },
    mobileStyle: { color: "#223344", fontSize: 19 },
    linkedStyles: false,
    futureContent: { retained: true },
  });
  expect(
    saved.sections[0]!.blocks.some((block) => block.id === f.blocks[0]!.id),
  ).toBe(false);
  expect(saved).toMatchObject({ futureDesign: { keep: true } });
  expectIsolated(f);
});

test("manual product, video and link-preview edits preserve their source fields and use the existing explicit save only", async ({
  page,
}) => {
  const f = await contentFixture(page);
  await selectBlock(page, "Product");
  await inspector(page).getByLabel("Product name").fill("Member guide");
  await inspector(page).getByLabel("Price", { exact: true }).fill("$30");
  await inspector(page).getByLabel("Button label").fill("View product");
  await picture("product-desktop", inspector(page));
  await selectBlock(page, "Video");
  await inspector(page)
    .getByLabel("Video URL")
    .fill("https://vimeo.com/123456");
  await inspector(page).getByLabel("Alt text").fill("Watch the briefing");
  await expect(inspector(page).getByText(/Custom thumbnail/)).toBeVisible();
  await picture("video-desktop", inspector(page));
  await selectBlock(page, "Apps");
  await inspector(page)
    .getByLabel("Source URL")
    .fill("https://example.com/report");
  await inspector(page).getByLabel("Preview title").fill("Briefing context");
  await inspector(page)
    .getByLabel("Preview description")
    .fill("A manual summary.");
  await choose(page, inspector(page), "Content category", "bill");
  await picture("context-desktop", inspector(page));
  expect(f.calls("save")).toHaveLength(0);
  expect(
    f.operations.some((name) =>
      /thumbnail|linkPreview|prepare|send/.test(name),
    ),
  ).toBe(false);
  await button(page, "Save newsletter").click();
  await expect.poll(() => f.calls("save").length).toBe(1);
  const design = f.submitted().design!;
  expect(findNewsletterBlock(design, f.blocks[4]!.id)).toMatchObject({
    url: "https://vimeo.com/123456",
    video: { thumbnail: "custom", sourceUrl: "https://vimeo.com/123456" },
  });
  expect(findNewsletterBlock(design, f.blocks[5]!.id)).toMatchObject({
    sourceKind: "bill",
    app: {
      title: "Briefing context",
      description: "A manual summary.",
      sourceUrl: "https://example.com/report",
    },
  });
  expect(findNewsletterBlock(design, f.blocks[6]!.id)).toMatchObject({
    text: "View product",
    items: [
      {
        label: "Member guide",
        price: "$30",
        description: "A practical member guide.",
        url: "https://example.com/guide",
      },
    ],
  });
  expect(design.sections[0]!.sourceClientIds).toEqual(f.first.sourceClientIds);
  expectIsolated(f);
});

test("social follow/share edits preserve the inactive list and styles; email styles remain local and cancel leaves saved design untouched", async ({
  page,
}) => {
  const f = await contentFixture(page),
    before = structuredClone(f.control.current.design);
  await selectBlock(page, "Social");
  await inspector(page).getByLabel("Social label").fill("Our updates");
  await inspector(page)
    .getByRole("button", { name: "Move down", exact: true })
    .click();
  await choose(page, inspector(page), "Social type", "Share");
  await inspector(page)
    .getByLabel("Custom URL")
    .fill("https://example.com/report");
  await inspector(page).getByLabel("Share label").fill("Share this report");
  await choose(page, inspector(page), "Social type", "Follow");
  await inspector(page).getByRole("button", { name: "Edit channel 2" }).click();
  await expect(inspector(page).getByLabel("Social label")).toHaveValue(
    "Our updates",
  );
  await picture("social-desktop", inspector(page));
  await button(page, "Email styles").click();
  const styles = page.getByRole("region", {
    name: "Email styles",
    exact: true,
  });
  await styles.getByLabel("Content width").fill("700");
  await picture("email-styles-desktop", styles);
  expect(f.calls("save")).toHaveLength(0);
  await closeAndReopen(page);
  expect(f.control.current.design).toEqual(before);
  expectIsolated(f);
});

test("narrow controls remain keyboard reachable and contained without horizontal clipping", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const f = await contentFixture(page);
  await selectBlock(page, "Product");
  await inspector(page)
    .getByRole("button", { name: "Add product", exact: true })
    .press("Enter");
  await expect(inspector(page).getByLabel("Product name")).toHaveValue(
    "New product",
  );
  await inspector(page).getByLabel("Product name").fill("Narrow product");
  await picture("product-narrow", inspector(page));
  await button(page, "Undo").click();
  await expect(inspector(page).getByLabel("Product name")).toHaveValue(
    "New product",
  );
  const dimensions = await page.evaluate(() => ({
    viewport: innerWidth,
    width: document.documentElement.scrollWidth,
  }));
  expect(dimensions.width).toBeLessThanOrEqual(dimensions.viewport);
  for (const box of await inspector(page)
    .getByRole("button")
    .evaluateAll((buttons) =>
      buttons.map((element) => ({
        width: element.clientWidth,
        scroll: element.scrollWidth,
        left: element.getBoundingClientRect().left,
        right: element.getBoundingClientRect().right,
      })),
    )) {
    expect(box.scroll).toBeLessThanOrEqual(box.width + 1);
    expect(box.left).toBeGreaterThanOrEqual(0);
    expect(box.right).toBeLessThanOrEqual(390);
  }
  expect(f.calls("save")).toHaveLength(0);
  expectIsolated(f);
});

import {
  createNewsletterBlock,
  createNewsletterSection,
  type NewsletterBlockKind,
  type NewsletterSaveRequest,
} from "@capiro/shared/newsletter";
import { expect, type Page, type Locator } from "@playwright/test";
import {
  documentFixture,
  enterEditor,
  adoptDocument,
} from "./newsletter-document-fixtures";

export async function contentFixture(page: Page) {
  const fixture = await documentFixture(page);
  const blocks = (
    [
      "paragraph",
      "columns",
      "social",
      "logo",
      "video",
      "apps",
      "product",
      "product-rec",
    ] satisfies NewsletterBlockKind[]
  ).map((kind) => createNewsletterBlock(kind));
  const first = createNewsletterSection("Introduction", blocks);
  const destination = createNewsletterSection("Other section", [
    createNewsletterBlock("paragraph", { text: "Other content" }),
  ]);
  first.sourceClientIds = ["e5555555-5555-4555-8555-555555555555"];
  const columns = blocks.find((block) => block.kind === "columns")!;
  columns.columns = [
    [
      createNewsletterBlock("image", {
        alt: "Nested image",
        crop: { x: 1, y: 2, width: 3, height: 4 },
      }),
    ],
    [createNewsletterBlock("paragraph", { text: "Nested text" })],
  ];
  const paragraph = blocks.find((block) => block.kind === "paragraph")!;
  paragraph.text = "Retained paragraph";
  paragraph.style = { color: "#111111", fontSize: 14 };
  paragraph.mobileStyle = { color: "#223344", fontSize: 17 };
  Object.assign(paragraph, { futureContent: { retained: true } });
  const video = blocks.find((block) => block.kind === "video")!;
  video.url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
  video.video = { thumbnail: "auto", sourceUrl: video.url };
  blocks.find((block) => block.kind === "product")!.items = [
    {
      label: "Membership guide",
      url: "https://example.com/guide",
      price: "$25",
      description: "A practical member guide.",
    },
  ];
  fixture.control.current.design.sections = [first, destination];
  Object.assign(fixture.control.current.design, {
    futureDesign: { keep: true },
  });
  await enterEditor(page);
  await adoptDocument(page);
  return {
    ...fixture,
    blocks,
    first,
    destination,
    submitted: () =>
      (fixture.calls("save").at(-1)?.input as { body: NewsletterSaveRequest })
        .body,
  };
}
export const inspector = (page: Page) =>
  page.getByRole("region", { name: "Selected block", exact: true });
export const structure = (page: Page) =>
  page.getByRole("navigation", { name: "Newsletter structure" });
export async function choose(
  page: Page,
  parent: Locator,
  label: string,
  option: string,
) {
  await parent.getByLabel(label, { exact: true }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}
export async function selectBlock(page: Page, name: string) {
  await structure(page).getByRole("button", { name, exact: true }).click();
  await expect(inspector(page)).toBeVisible();
}

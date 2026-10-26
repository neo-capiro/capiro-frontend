import { describe, expect, it } from "vitest";
import {
  createNewsletterBlock,
  findNewsletterBlock,
} from "@capiro/shared/newsletter";
import {
  editRichBlock,
  editRichConfig,
  newRichDraft,
  removeRichBlock,
} from "./draft";
import { changeStructure } from "./content/structure";

describe("rich editor local ownership", () => {
  it("edits nested content without losing style, crop, provenance or font references", () => {
    const { design } = newRichDraft();
    const image = createNewsletterBlock("image", {
      imageUrl: "/newsletter/capitol.png",
      crop: { x: 1, y: 2, width: 3, height: 4 },
    });
    design.sections[0]!.blocks.push(
      createNewsletterBlock("columns", { columns: [[image], []] }),
    );
    design.sourceClientIds = ["untrusted-scope-hint"];
    design.sections[0]!.sourceClientIds = ["section-provenance"];
    design.fonts = [
      {
        assetId: "font-id",
        family: "Example",
        name: "Example",
        format: "woff2",
        url: "https://example.test/font",
      },
    ];
    const before = structuredClone(design);
    const edited = editRichBlock(design, image.id, (block) => {
      block.alt = "Capitol";
    });
    expect(design).toEqual(before);
    expect(findNewsletterBlock(edited, image.id)).toEqual({
      ...image,
      alt: "Capitol",
    });
    expect(edited.sourceClientIds).toEqual(before.sourceClientIds);
    expect(edited.sections[0]!.sourceClientIds).toEqual(
      before.sections[0]!.sourceClientIds,
    );
    expect(edited.fonts).toEqual(before.fonts);
  });
  it("removes only the chosen nested block and retains source provenance", () => {
    const { design } = newRichDraft();
    const nested = createNewsletterBlock("image");
    const sibling = createNewsletterBlock("paragraph");
    design.sections[0]!.blocks = [
      createNewsletterBlock("columns", { columns: [[nested, sibling], []] }),
    ];
    design.sections[0]!.sourceClientIds = ["source"];
    const after = removeRichBlock(design, nested.id);
    expect(findNewsletterBlock(after, nested.id)).toBe(null);
    expect(findNewsletterBlock(after, sibling.id)).toEqual(sibling);
    expect(after.sections[0]!.sourceClientIds).toEqual(["source"]);
    expect(findNewsletterBlock(design, nested.id)).toEqual(nested);
  });
  it("adds a factory block without changing other sections or delivery settings", () => {
    const draft = newRichDraft();
    const after = changeStructure(draft.design, {
      type: "addBlock",
      target: { sectionId: draft.design.sections[1]!.id },
      kind: "paragraph",
    });
    expect(after.design.sections[1]!.blocks.at(-1)?.kind).toBe("paragraph");
    expect(after.design.sections[0]).toEqual(draft.design.sections[0]);
    expect(draft.design.sections[1]!.blocks).toHaveLength(2);
    expect(editRichConfig(draft.config, "subject", "Changed")).toEqual({
      ...draft.config,
      subject: "Changed",
    });
  });
});

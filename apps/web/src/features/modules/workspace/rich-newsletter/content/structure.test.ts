import { describe, expect, it } from "vitest";
import {
  createNewsletterBlock,
  createNewsletterSection,
  findNewsletterBlock,
  parseNewsletterCampaign,
  type NewsletterBlock,
  type NewsletterBlockKind,
} from "@capiro/shared/newsletter";
import { newRichDraft } from "../draft";
import { changeStructure } from "./structure";

function fixture() {
  const draft = newRichDraft();
  const image = createNewsletterBlock("image", {
    crop: { x: 2, y: 4, width: 25, height: 30 },
    alt: "Keep image",
  });
  const columns = createNewsletterBlock("columns", { columns: [[image], []] });
  const source = createNewsletterSection("Source", [columns]);
  const target = createNewsletterSection("Destination");
  source.sourceClientIds = ["e5555555-5555-4555-8555-555555555555"];
  source.fonts = [
    {
      assetId: "font-a",
      name: "Example",
      family: "Example",
      format: "woff2",
      url: "https://example.test/font.woff2",
    },
  ];
  Object.assign(image, { futureContent: { retained: [1, "unknown"] } });
  Object.assign(source, { futureSection: true });
  draft.design.sections = [source, target];
  Object.assign(draft.design, { futureDesign: { retained: true } });
  return { draft, image, columns, source, target };
}
describe("local rich structure uses the existing design and history boundary", () => {
  it("duplicates a complete nested section with fresh IDs, retaining unknown fields and provenance without mutating its source", () => {
    const f = fixture(),
      before = structuredClone(f.draft);
    const result = changeStructure(f.draft.design, {
      type: "section",
      id: f.source.id,
      action: "duplicate",
    }).design;
    const copy = result.sections[1]!;
    expect(copy.id).not.toBe(f.source.id);
    expect(copy.blocks[0]!.id).not.toBe(f.columns.id);
    expect(copy.blocks[0]!.columns[0]![0]!.id).not.toBe(f.image.id);
    expect(copy).toMatchObject({
      futureSection: true,
      sourceClientIds: f.source.sourceClientIds,
      fonts: f.source.fonts,
    });
    expect(copy.blocks[0]!.columns[0]![0]).toMatchObject({
      crop: f.image.crop,
      futureContent: { retained: [1, "unknown"] },
    });
    expect(f.draft).toEqual(before);
  });
  it("moving between sections carries current source/font references even after the old section is deleted", () => {
    const f = fixture();
    const moved = changeStructure(f.draft.design, {
      type: "moveBlock",
      id: f.image.id,
      target: { sectionId: f.target.id },
    }).design;
    expect(moved.sections[0]!.blocks[0]!.columns[0]).toEqual([]);
    const deleted = changeStructure(moved, {
      type: "section",
      id: f.source.id,
      action: "delete",
    }).design;
    expect(deleted.sections[0]).toMatchObject({
      sourceClientIds: f.source.sourceClientIds,
      fonts: f.source.fonts,
    });
    expect(findNewsletterBlock(deleted, f.image.id)).toEqual(f.image);
    expect(f.source.blocks[0]!.columns[0]).toEqual([f.image]);
  });
  it("refuses cycles, occupied column loss and stale/cross-section container identities without changing any input", () => {
    const f = fixture(),
      before = structuredClone(f.draft.design);
    expect(() =>
      changeStructure(before, {
        type: "moveBlock",
        id: f.columns.id,
        target: { sectionId: f.source.id, blockId: f.columns.id, column: 0 },
      }),
    ).toThrow("inside itself");
    const occupied = structuredClone(before);
    occupied.sections[0]!.blocks[0]!.columns[1]!.push(
      createNewsletterBlock("paragraph"),
    );
    expect(() =>
      changeStructure(occupied, {
        type: "columns",
        id: f.columns.id,
        count: 1,
      }),
    ).toThrow("Move or remove");
    expect(occupied.sections[0]!.blocks[0]!.columns[1]).toHaveLength(1);
    expect(() =>
      changeStructure(before, {
        type: "addBlock",
        kind: "logo",
        target: { sectionId: f.target.id, blockId: f.columns.id, column: 0 },
      }),
    ).toThrow("no longer available");
    expect(() =>
      changeStructure(before, {
        type: "moveBlock",
        id: "missing",
        target: { sectionId: f.target.id },
      }),
    ).toThrow("no longer available");
    expect(f.draft.design).toEqual(before);
  });
  it("resizes only empty columns and reorders/duplicates inside the chosen nested container", () => {
    const f = fixture();
    const shrunk = changeStructure(f.draft.design, {
      type: "columns",
      id: f.columns.id,
      count: 1,
    }).design;
    expect(findNewsletterBlock(shrunk, f.columns.id)).toMatchObject({
      columns: [[f.image]],
      ratio: "1",
    });
    const duplicated = changeStructure(shrunk, {
      type: "block",
      id: f.image.id,
      action: "duplicate",
    });
    const copy = findNewsletterBlock(
      duplicated.design,
      duplicated.selectedId!,
    )!;
    const reordered = changeStructure(duplicated.design, {
      type: "block",
      id: copy.id,
      action: "up",
    }).design;
    expect(
      reordered.sections[0]!.blocks[0]!.columns[0]!.map((block) => block.id),
    ).toEqual([copy.id, f.image.id]);
    expect(reordered.sections[1]).toEqual(f.target);
    expect(copy.crop).toEqual(f.image.crop);
  });
  it("refuses total, per-container, section and depth overflow at the actual validation boundaries", () => {
    const f = fixture();
    const many = newRichDraft().design;
    many.sections = [200, 200, 100].map((count) =>
      createNewsletterSection(
        "Section",
        Array.from({ length: count }, () => createNewsletterBlock("paragraph")),
      ),
    );
    expect(() =>
      changeStructure(many, {
        type: "addBlock",
        target: { sectionId: many.sections[2]!.id },
        kind: "image",
      }),
    ).toThrow("500 blocks");
    expect(() =>
      changeStructure(many, {
        type: "addBlock",
        target: { sectionId: many.sections[0]!.id },
        kind: "image",
      }),
    ).toThrow("200 blocks");
    f.columns.columns[0] = Array.from({ length: 100 }, () =>
      createNewsletterBlock("paragraph"),
    );
    expect(() =>
      changeStructure(f.draft.design, {
        type: "addBlock",
        target: { sectionId: f.source.id, blockId: f.columns.id, column: 0 },
        kind: "image",
      }),
    ).toThrow("100 blocks");
    many.sections = Array.from({ length: 50 }, () =>
      createNewsletterSection("Section"),
    );
    expect(() => changeStructure(many, { type: "addSection" })).toThrow(
      "50 sections",
    );
    let deepest = f.columns;
    for (let i = 0; i < 6; i++) {
      const child = createNewsletterBlock("columns");
      deepest.columns = [[child]];
      deepest = child;
    }
    expect(() =>
      changeStructure(f.draft.design, {
        type: "addBlock",
        target: { sectionId: f.source.id, blockId: deepest.id, column: 0 },
        kind: "image",
      }),
    ).toThrow("six nested");
  });
  it("does not silently replace conflicting font references while moving sourced content", () => {
    const f = fixture();
    f.target.fonts = [
      { ...f.source.fonts![0]!, url: "https://example.test/other.woff2" },
    ];
    expect(() =>
      changeStructure(f.draft.design, {
        type: "moveBlock",
        id: f.image.id,
        target: { sectionId: f.target.id },
      }),
    ).toThrow("different versions");
    expect(f.target.blocks).toEqual([]);
  });
  it("factory-backed additions round-trip every offered kind through the installed canonical receiver", () => {
    let draft = newRichDraft();
    draft.design.sections = [createNewsletterSection("All content")];
    for (const kind of [
      "heading",
      "paragraph",
      "image",
      "logo",
      "button",
      "divider",
      "spacer",
      "columns",
      "social",
      "video",
      "apps",
      "product",
      "product-rec",
      "code",
    ] satisfies NewsletterBlockKind[]) {
      draft = {
        ...draft,
        design: changeStructure(draft.design, {
          type: "addBlock",
          target: { sectionId: draft.design.sections[0]!.id },
          kind,
        }).design,
      };
    }
    const campaign = {
      ...draft,
      id: "b2222222-2222-7222-8222-222222222222",
      revision: 4,
      status: "draft",
      ownerId: "synthetic",
      updatedAt: "2026-10-26T00:00:00.000Z",
    };
    const received = parseNewsletterCampaign(campaign, {
      documentId: campaign.id,
    });
    expect(received.ok).toBe(true);
    const video = draft.design.sections[0]!.blocks.find(
      (block: NewsletterBlock) => block.kind === "video",
    )!;
    expect(video.video?.thumbnail).toBe("custom");
  });
});

describe("OS builder palette parity", () => {
  it("creates a columns block with the chosen ratio and its column count", () => {
    const draft = newRichDraft();
    const sectionId = draft.design.sections[0]!.id;
    for (const [ratio, count] of [
      ["1", 1],
      ["3", 3],
      ["1:3", 2],
      ["3:1", 2],
    ] as const) {
      const { design } = changeStructure(draft.design, {
        type: "addBlock",
        target: { sectionId },
        kind: "columns",
        ratio,
      });
      const block = design.sections[0]!.blocks.at(-1)!;
      expect(block.kind).toBe("columns");
      expect(block.ratio).toBe(ratio);
      expect(block.columns).toHaveLength(count);
    }
  });

  it("adds the footer block offered by the OS palette", () => {
    const draft = newRichDraft();
    const sectionId = draft.design.sections[0]!.id;
    for (const kind of ["footer"] as NewsletterBlockKind[]) {
      const { design } = changeStructure(draft.design, {
        type: "addBlock",
        target: { sectionId },
        kind,
      });
      expect(design.sections[0]!.blocks.at(-1)!.kind).toBe(kind);
    }
  });
});

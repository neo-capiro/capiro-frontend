import { expect, it } from "vitest";
import {
  createNewsletterBlock,
  createNewsletterSection,
  parseNewsletterCampaign,
  type NewsletterBlock,
} from "@capiro/shared/newsletter";
import { newRichDraft } from "../src/features/modules/workspace/rich-newsletter/draft";
import {
  aiColumnAction,
  AI_COLUMN_PRESETS,
  prebuiltSection,
  SECTION_CATEGORIES,
} from "../src/features/modules/workspace/rich-newsletter/content/presets";
import { changeStructure } from "../src/features/modules/workspace/rich-newsletter/content/structure";

const blockIds = (blocks: NewsletterBlock[]): string[] =>
  blocks.flatMap((block) => [block.id, ...block.columns.flatMap(blockIds)]);

it("inserts all 18 OS prebuilt variants with fresh identities and canonical receiver acceptance", () => {
  expect(SECTION_CATEGORIES).toHaveLength(9);
  const draft = newRichDraft();
  const before = structuredClone(draft);
  for (const category of SECTION_CATEGORIES)
    for (const variant of [0, 1] as const) {
      const section = prebuiltSection(category, variant);
      const sourceIds = blockIds(section.blocks);
      const inserted = changeStructure(draft.design, {
        type: "insertSection",
        section,
      }).design;
      const current = inserted.sections.at(-1)!;
      expect(current.name).toBe(category);
      expect(current.id).not.toBe(section.id);
      expect(
        blockIds(current.blocks).some((id) => sourceIds.includes(id)),
      ).toBe(false);
      expect(new Set(blockIds(current.blocks)).size).toBe(
        blockIds(current.blocks).length,
      );
      const campaign = {
        ...draft,
        design: inserted,
        id: "a1111111-1111-4111-8111-111111111111",
        revision: 1,
        status: "draft",
        ownerId: "synthetic",
        updatedAt: "2026-11-01T00:00:00.000Z",
      };
      expect(
        parseNewsletterCampaign(campaign, { documentId: campaign.id }).ok,
      ).toBe(true);
    }
  expect(draft).toEqual(before);
});

it("preserves section unknown fields and sources and applies existing size/depth limits", () => {
  const draft = newRichDraft();
  const section = prebuiltSection("Hero", 1);
  Object.assign(section, {
    future: { preserve: true },
    sourceClientIds: ["b2222222-2222-4222-8222-222222222222"],
  });
  const inserted = changeStructure(draft.design, {
    type: "insertSection",
    section,
  }).design;
  expect(inserted.sections.at(-1)).toMatchObject({
    future: { preserve: true },
    sourceClientIds: section.sourceClientIds,
  });
  const full = {
    ...draft.design,
    sections: Array.from({ length: 50 }, () => createNewsletterSection("Full")),
  };
  expect(() =>
    changeStructure(full, { type: "insertSection", section }),
  ).toThrow("50 sections");
  const occupied = createNewsletterSection(
    "Occupied",
    Array.from({ length: 200 }, () => createNewsletterBlock("paragraph")),
  );
  expect(() =>
    changeStructure(
      { ...draft.design, sections: [occupied] },
      {
        type: "insertBlock",
        block: createNewsletterBlock("paragraph"),
        target: { sectionId: occupied.id },
      },
    ),
  ).toThrow("200 blocks");
  expect(full.sections).toHaveLength(50);
});

it("uses reviewed plain text to create independent two-column content in Body or the available section", () => {
  expect(AI_COLUMN_PRESETS.map((preset) => preset.label)).toEqual([
    "Article summary",
    "Upcoming event",
    "Legislative update",
    "People update",
  ]);
  const draft = newRichDraft();
  const text = "<script>plain proposal text</script>";
  for (const sections of [
    [],
    [createNewsletterSection("First")],
    [createNewsletterSection("Header"), createNewsletterSection("Body")],
  ]) {
    const original = { ...draft.design, sections };
    const action = aiColumnAction(original, text);
    const result = changeStructure(original, action);
    const section =
      result.design.sections.find((item) => item.name === "Body") ??
      result.design.sections[0]!;
    const columns = section.blocks.at(-1)!;
    expect(columns.kind).toBe("columns");
    expect(columns.ratio).toBe("2");
    expect(columns.columns).toHaveLength(2);
    expect(columns.columns[0]![0]).toMatchObject({
      kind: "paragraph",
      text,
      html: "",
    });
    expect(columns.columns[1]).toEqual([]);
    expect(original.sections).toEqual(sections);
  }
});

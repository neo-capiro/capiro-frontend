import {
  createNewsletterBlock,
  createNewsletterLayout,
  type NewsletterSectionLibraryItem,
} from "@capiro/shared/newsletter";
import { expect, it } from "vitest";
import { newRichDraft } from "../draft";
import { appendSavedSection, filterSavedSections } from "./sections";

it("inserts one deep identity clone while preserving nested content, provenance, fonts and the existing draft", () => {
  const draft = newRichDraft();
  const section = createNewsletterLayout(1).sections[0]!;
  const block = createNewsletterBlock("columns");
  block.columns = [[createNewsletterBlock("paragraph")]];
  block.columns[0]![0]!.text = "Saved nested content";
  section.blocks = [block];
  section.sourceClientIds = ["30000000-0000-4000-8000-000000000001"];
  section.fonts = [
    {
      assetId: "font",
      name: "Saved font",
      family: "Synthetic",
      url: "https://example.invalid/font.woff2",
      format: "woff2",
    },
  ];
  const original = structuredClone(section);
  const next = appendSavedSection(draft, section);
  expect(next.design.sections).toHaveLength(draft.design.sections.length + 1);
  expect(next.design.sections.slice(0, -1)).toEqual(draft.design.sections);
  expect(next.config).toBe(draft.config);
  expect(next.design.styles).toBe(draft.design.styles);
  const clone = next.design.sections.at(-1)!;
  expect(clone.id).not.toBe(section.id);
  expect(clone.blocks[0]!.id).not.toBe(block.id);
  expect(clone.blocks[0]!.columns[0]![0]!.id).not.toBe(
    block.columns[0]![0]!.id,
  );
  expect(clone.blocks[0]!.columns[0]![0]!.text).toBe("Saved nested content");
  expect(clone.sourceClientIds).toEqual(section.sourceClientIds);
  expect(clone.fonts).toEqual(section.fonts);
  clone.fonts![0]!.name = "Local change";
  expect(section).toEqual(original);
});

it("filters and sorts only loaded rows without mutating the received list", () => {
  const section = createNewsletterLayout(1).sections[0]!;
  const rows: NewsletterSectionLibraryItem[] = [
    {
      id: "one",
      name: "Zulu",
      folder: "Updates",
      updatedAt: "2026-10-26T00:00:00.000Z",
      section,
    },
    {
      id: "two",
      name: "Alpha",
      folder: "Briefs",
      updatedAt: "2026-10-25T00:00:00.000Z",
      section,
    },
  ];
  expect(filterSavedSections(rows, " upDATES ", "", "recent")).toEqual([
    rows[0],
  ]);
  expect(filterSavedSections(rows, "", "Briefs", "name")).toEqual([rows[1]]);
  expect(
    filterSavedSections(rows, "", "", "name").map((row) => row.id),
  ).toEqual(["two", "one"]);
  expect(rows.map((row) => row.id)).toEqual(["one", "two"]);
  expect(filterSavedSections(rows, "not loaded", "", "recent")).toEqual([]);
});

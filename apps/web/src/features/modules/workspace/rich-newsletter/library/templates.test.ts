import {
  createNewsletterBlock,
  createNewsletterLayout,
  type NewsletterTemplateLibraryItem,
} from "@capiro/shared/newsletter";
import { expect, it } from "vitest";
import { newRichDraft } from "../draft";
import { applySavedTemplate } from "./templates";
import { filterLibraryItems } from "./sections";

function template(): NewsletterTemplateLibraryItem {
  const design = createNewsletterLayout(1);
  const columns = createNewsletterBlock("columns");
  columns.columns = [[createNewsletterBlock("paragraph")]];
  columns.columns[0]![0]!.text = "Nested saved template content";
  design.sections[0]!.blocks = [columns];
  design.sourceClientIds = ["30000000-0000-4000-8000-000000000001"];
  design.sections[0]!.sourceClientIds = [...design.sourceClientIds];
  design.fonts = [
    {
      assetId: "font",
      name: "Saved font",
      family: "Synthetic",
      url: "https://example.invalid/font.woff2",
      format: "woff2",
    },
  ];
  Object.assign(design, { futureDesign: { preserved: true } });
  return {
    id: "a1111111-1111-4111-8111-111111111111",
    name: "Saved template",
    folder: "Updates",
    updatedAt: "2026-10-26T00:00:00.000Z",
    design,
    config: {
      company: "Saved company",
      mailingAddress: "Saved address",
      permissionReminder: "Saved permission",
    },
  };
}

it("applies one deep clone preserving template content/provenance while retaining document and campaign identity", () => {
  const draft = newRichDraft();
  draft.name = "Current newsletter";
  draft.config.clientId = "40000000-0000-4000-8000-000000000001";
  draft.config.subject = "Unsaved subject";
  const before = structuredClone(draft),
    item = template(),
    original = structuredClone(item);
  const next = applySavedTemplate(draft, item);
  expect(next.name).toBe(before.name);
  expect(next.config).toEqual({ ...before.config, ...item.config });
  expect(next.design).toMatchObject({
    sourceClientIds: item.design.sourceClientIds,
    fonts: item.design.fonts,
    futureDesign: { preserved: true },
  });
  const section = next.design.sections[0]!,
    old = item.design.sections[0]!;
  expect(section.id).not.toBe(old.id);
  expect(section.blocks[0]!.id).not.toBe(old.blocks[0]!.id);
  expect(section.blocks[0]!.columns[0]![0]!.id).not.toBe(
    old.blocks[0]!.columns[0]![0]!.id,
  );
  expect(section.blocks[0]!.columns[0]![0]!.text).toBe(
    "Nested saved template content",
  );
  expect(section.sourceClientIds).toEqual(old.sourceClientIds);
  next.design.fonts![0]!.name = "Local font edit";
  section.blocks[0]!.columns[0]![0]!.text = "Local content edit";
  expect(item).toEqual(original);
  expect(draft).toEqual(before);
});

it("legacy templates without footer config retain the entire current config; loaded filtering never mutates rows", () => {
  const draft = newRichDraft(),
    item = template();
  delete item.config;
  expect(applySavedTemplate(draft, item).config).toBe(draft.config);
  const rows = [
    item,
    { ...item, id: "second", name: "Annual", folder: "Reports" },
  ];
  expect(filterLibraryItems(rows, " upDATES ", "", "name")).toEqual([item]);
  expect(filterLibraryItems(rows, "", "Reports", "recent")).toEqual([rows[1]]);
  expect(
    filterLibraryItems(rows, "", "", "name").map((row) => row.name),
  ).toEqual(["Annual", "Saved template"]);
  expect(rows[0]).toBe(item);
});

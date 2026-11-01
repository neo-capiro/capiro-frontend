import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import {
  createNewsletterBlock,
  createNewsletterSection,
  defaultNewsletterSurveyDefinition,
  NEWSLETTER_COLUMN_RATIOS,
  parseNewsletterCampaign,
} from "@capiro/shared/newsletter";
import { renderNewsletterDesign } from "@capiro/shared/newsletter-render";
import { RichStructure } from "../src/features/modules/workspace/rich-newsletter/RichStructure";
import { newRichDraft } from "../src/features/modules/workspace/rich-newsletter/draft";
import { changeStructure } from "../src/features/modules/workspace/rich-newsletter/content/structure";

const h = vi.hoisted(() => ({
  buttons: [] as { children: ReactNode; onClick: () => void }[],
}));
vi.mock("../src/shared/module-ui", () => ({
  ActionButton: (props: { children: ReactNode; onClick: () => void }) => {
    h.buttons.push(props);
    return createElement("button", null, props.children);
  },
}));

it("offers all column layouts and Footer without offering inert new Survey blocks", () => {
  const draft = newRichDraft();
  const change = vi.fn();
  h.buttons = [];
  const html = renderToStaticMarkup(
    createElement(RichStructure, {
      design: draft.design,
      selectedId: null,
      select: vi.fn(),
      change,
      editSection: vi.fn(),
      browse: vi.fn(),
      saveSection: vi.fn(),
      savedSectionIds: [],
    }),
  );
  expect(html).toContain("new survey insertion");
  expect(h.buttons.some((button) => button.children === "Survey")).toBe(false);
  h.buttons.find((button) => button.children === "Footer")!.onClick();
  expect(change).toHaveBeenLastCalledWith(
    expect.objectContaining({ type: "addBlock", kind: "footer" }),
  );
  for (const ratio of NEWSLETTER_COLUMN_RATIOS) {
    h.buttons
      .find((button) => button.children === `Columns ${ratio}`)!
      .onClick();
    const action = change.mock.lastCall![0];
    const result = changeStructure(draft.design, action);
    const columns = result.design.sections[0]!.blocks.at(-1)!;
    expect(columns.ratio).toBe(ratio);
    expect(columns.columns).toHaveLength(
      ratio.includes(":") ? 2 : Number(ratio),
    );
    if (columns.columns.length > 1)
      expect(columns.columns[0]).not.toBe(columns.columns[1]);
  }
});

it("retains imported saved survey definitions and their canonical rendered destination", () => {
  const draft = newRichDraft();
  const survey = createNewsletterBlock("survey");
  survey.survey!.saved = {
    id: "a1111111-1111-4111-8111-111111111111",
    revision: 4,
    name: "Synthetic saved survey",
    status: "draft",
    updatedAt: "2026-10-26T00:00:00.000Z",
    sourceClientIds: [],
    definition: defaultNewsletterSurveyDefinition(),
  };
  draft.design.sections = [createNewsletterSection("Imported", [survey])];
  const design = changeStructure(draft.design, {
    type: "addBlock",
    kind: "footer",
    target: { sectionId: draft.design.sections[0]!.id },
  }).design;
  expect(design.sections[0]!.blocks[0]).toEqual(survey);
  const campaign = {
    ...draft,
    design,
    id: "b2222222-2222-7222-8222-222222222222",
    revision: 4,
    status: "draft",
    ownerId: "synthetic",
    updatedAt: "2026-10-26T00:00:00.000Z",
  };
  expect(
    parseNewsletterCampaign(campaign, { documentId: campaign.id }).ok,
  ).toBe(true);
  const rendered = renderNewsletterDesign(design, draft.config, {
    savedSurveyUrl: (id) =>
      id === survey.id ? "https://example.test/survey/synthetic" : "",
  });
  expect(rendered).toContain('href="https://example.test/survey/synthetic"');
  expect(survey.survey!.saved.revision).toBe(4);
});

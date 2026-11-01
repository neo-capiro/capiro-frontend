import {
  cloneNewsletterBlocks,
  createNewsletterBlock,
  createNewsletterSection,
  type NewsletterBlock,
  type NewsletterDesign,
  type NewsletterSection,
} from "@capiro/shared/newsletter";
import type { StructureAction } from "./structure";

/** Compositions from the OS editor at 94eb3cd7, using the app's public factories. */
export const SECTION_CATEGORIES = [
  "Header",
  "Hero",
  "Promo",
  "Features",
  "Editorial",
  "Bill updates",
  "Reviews",
  "Image gallery",
  "Footer",
] as const;
export type SectionCategory = (typeof SECTION_CATEGORIES)[number];

export function prebuiltSection(
  category: SectionCategory,
  variant: 0 | 1,
): NewsletterSection {
  const b = createNewsletterBlock;
  const heading = b("heading", {
    text:
      category === "Hero"
        ? "This week in policy"
        : category === "Reviews"
          ? "What our clients are saying"
          : `${category} headline`,
    headingLevel: category === "Hero" ? 1 : 2,
  });
  const paragraph = b("paragraph", {
    text: "Add a sourced update, explain the implications for your client, and identify the next step.",
  });
  const image = b("image", {
    imageUrl: "/newsletter/policy-desk.png",
    alt: "Policy briefing illustration",
  });
  const button = b("button", {
    text: "Learn more",
    url: "https://www.congress.gov/",
  });
  const columns = (left: NewsletterBlock[], right: NewsletterBlock[]) =>
    b("columns", { columns: [left, right], ratio: variant ? "1:2" : "2" });
  const blocks =
    category === "Header"
      ? [
          b("logo", { text: "YOUR FIRM", style: { bold: true, fontSize: 32 } }),
          b("divider"),
        ]
      : category === "Footer"
        ? [
            b("social", {
              items: [{ label: "WEBSITE", url: "https://capiro.ai/" }],
            }),
            b("footer"),
          ]
        : category === "Image gallery"
          ? [columns([image], [cloneNewsletterBlocks([image])[0]!])]
          : category === "Bill updates"
            ? [
                heading,
                columns(
                  [
                    b("heading", { text: "Bill status", headingLevel: 3 }),
                    b("paragraph", {
                      text: "Add the bill number, latest action, and a source link.",
                    }),
                  ],
                  [
                    b("heading", {
                      text: "Client implications",
                      headingLevel: 3,
                    }),
                    b("paragraph", {
                      text: "Explain the impact, upcoming milestones, and next steps.",
                    }),
                  ],
                ),
              ]
            : category === "Features"
              ? [
                  heading,
                  columns(
                    [paragraph],
                    [cloneNewsletterBlocks([paragraph])[0]!],
                  ),
                ]
              : variant
                ? [columns([heading, paragraph, button], [image])]
                : [heading, image, paragraph, button];
  return createNewsletterSection(category, blocks);
}

export const AI_COLUMN_PRESETS = [
  "Article summary",
  "Upcoming event",
  "Legislative update",
  "People update",
].map((label) => ({
  label,
  prompt: `Write a concise ${label.toLowerCase()} for a government affairs client newsletter.`,
}));

export function aiColumnAction(
  design: NewsletterDesign,
  text: string,
): StructureAction {
  const block = createNewsletterBlock("columns", {
    ratio: "2",
    columns: [[createNewsletterBlock("paragraph", { text, html: "" })], []],
  });
  const section =
    design.sections.find((item) => item.name === "Body") ?? design.sections[0];
  return section
    ? { type: "insertBlock", block, target: { sectionId: section.id } }
    : {
        type: "insertSection",
        section: createNewsletterSection("Body", [block]),
      };
}

import {
  createNewsletterLayout,
  defaultNewsletterConfig,
  findNewsletterBlock,
  type NewsletterBlock,
  type NewsletterCampaignConfig,
  type NewsletterDesign,
} from "@capiro/shared/newsletter";

/** Local starter uses public factories; saved drafts enter through the receiving adapter. */
export function newRichDraft() {
  const design = createNewsletterLayout(1);
  // The starter's text-only logo should inherit the readable body color.
  for (const section of design.sections)
    for (const block of section.blocks)
      if (block.kind === "logo") block.style.color = design.styles.text.p.color;
  return {
    name: "Untitled newsletter",
    design,
    config: defaultNewsletterConfig(),
  };
}
export type RichDraft = ReturnType<typeof newRichDraft>;

export function editRichBlock(
  design: NewsletterDesign,
  id: string,
  update: (block: NewsletterBlock) => void,
) {
  const next = structuredClone(design);
  const block = findNewsletterBlock(next, id);
  if (block) update(block);
  return next;
}

/** Recursion preserves every unedited rich field, nested column and source hint. */
export function removeRichBlock(design: NewsletterDesign, id: string) {
  const next = structuredClone(design);
  const remove = (blocks: NewsletterBlock[]): NewsletterBlock[] =>
    blocks
      .filter((block) => block.id !== id)
      .map((block) => ({ ...block, columns: block.columns.map(remove) }));
  next.sections.forEach((section) => {
    section.blocks = remove(section.blocks);
  });
  return next;
}

export function editRichConfig(
  config: NewsletterCampaignConfig,
  key: "subject" | "previewText" | "fromName" | "replyTo",
  value: string,
): NewsletterCampaignConfig {
  return { ...config, [key]: value };
}

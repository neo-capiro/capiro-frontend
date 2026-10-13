import {
  createNewsletterBlock,
  createNewsletterLayout,
  defaultNewsletterConfig,
  findNewsletterBlock,
  type NewsletterBlock,
  type NewsletterBlockKind,
  type NewsletterCampaignConfig,
  type NewsletterDesign,
} from "@capiro/shared/newsletter";

/** Only local drafts constructed by the public factories enter this editor. */
export function newRichDraft() {
  return {
    name: "Untitled newsletter",
    design: createNewsletterLayout(1),
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

export function addRichBlock(
  design: NewsletterDesign,
  sectionId: string,
  kind: NewsletterBlockKind,
) {
  const next = structuredClone(design);
  const section = next.sections.find((section) => section.id === sectionId);
  const block = createNewsletterBlock(kind);
  section?.blocks.push(block);
  return { design: next, selectedId: section ? block.id : null };
}

export function editRichConfig(
  config: NewsletterCampaignConfig,
  key: "subject" | "previewText" | "fromName" | "replyTo",
  value: string,
): NewsletterCampaignConfig {
  return { ...config, [key]: value };
}

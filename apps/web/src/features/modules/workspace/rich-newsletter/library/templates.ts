import {
  cloneNewsletterBlocks,
  newsletterId,
  type NewsletterTemplateLibraryItem,
} from "@capiro/shared/newsletter";
import type { RichDraft } from "../draft";

/** One local history change; preserve content/provenance but never borrow document identity. */
export function applySavedTemplate(
  draft: RichDraft,
  item: NewsletterTemplateLibraryItem,
): RichDraft {
  const design = structuredClone(item.design);
  design.sections = design.sections.map((section) => ({
    ...section,
    id: newsletterId(),
    blocks: cloneNewsletterBlocks(section.blocks),
  }));
  return {
    ...draft,
    design,
    config: item.config
      ? { ...draft.config, ...structuredClone(item.config) }
      : draft.config,
  };
}

import {
  cloneNewsletterBlocks,
  newsletterId,
  type NewsletterSection,
  type NewsletterSectionLibraryItem,
} from "@capiro/shared/newsletter";
import type { RichDraft } from "../draft";

/** Copy the admitted section without stripping nested content, fonts or provenance. */
export function appendSavedSection(
  draft: RichDraft,
  section: NewsletterSection,
): RichDraft {
  return {
    ...draft,
    design: {
      ...draft.design,
      sections: [
        ...draft.design.sections,
        {
          ...structuredClone(section),
          id: newsletterId(),
          blocks: cloneNewsletterBlocks(section.blocks),
        },
      ],
    },
  };
}

export function filterSavedSections(
  items: readonly NewsletterSectionLibraryItem[],
  search: string,
  folder: string,
  sort: "recent" | "name",
) {
  const query = search.trim().toLocaleLowerCase();
  return items
    .filter(
      (item) =>
        (!folder || item.folder === folder) &&
        (!query ||
          `${item.name} ${item.folder ?? ""}`
            .toLocaleLowerCase()
            .includes(query)),
    )
    .sort((left, right) =>
      sort === "name"
        ? left.name.localeCompare(right.name)
        : right.updatedAt.localeCompare(left.updatedAt),
    );
}

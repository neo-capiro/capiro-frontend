import {
  applyNewsletterBrandKit,
  type NewsletterBrandKit,
} from "@capiro/shared/newsletter";
import type { RichDraft } from "../draft";
export function editBrand(
  kit: NewsletterBrandKit,
  edit: (next: NewsletterBrandKit) => void,
) {
  const next = structuredClone(kit);
  edit(next);
  return next;
}
export function applyBrand(
  draft: RichDraft,
  kit: NewsletterBrandKit,
): RichDraft {
  const design = structuredClone(draft.design);
  applyNewsletterBrandKit(design, structuredClone(kit));
  return { ...draft, design };
}
/** Removing a kit reference cannot silently change selected font families. */
export function fontIsSelected(kit: NewsletterBrandKit, family: string) {
  return (
    kit.fonts.heading === family ||
    kit.fonts.body === family ||
    kit.buttons.some((button) => button.fontFamily === family)
  );
}

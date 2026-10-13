import { createContext } from 'react';
import {
  NEWSLETTER_SYSTEM_FONTS,
  NEWSLETTER_FONT_CATALOG,
  type NewsletterFont,
} from '@capiro/shared/newsletter';

export type NewsletterFontChoice = string | [string, string];
export const NewsletterBrandContext = createContext<{
  fonts: NewsletterFontChoice[];
  colors: string[];
}>({ fonts: newsletterFontChoices([]), colors: [] });
export function newsletterFontChoices(fonts: NewsletterFont[]): NewsletterFontChoice[] {
  return [
    ...new Map(
      [
        ...NEWSLETTER_SYSTEM_FONTS,
        ...NEWSLETTER_FONT_CATALOG.map((font) => font.label),
        ...fonts.map(
          (font) => [`${font.family}, Arial, sans-serif`, font.name] as [string, string],
        ),
      ].map((choice) => [Array.isArray(choice) ? choice[0] : choice, choice]),
    ).values(),
  ].sort((a, b) =>
    (Array.isArray(a) ? a[1] : a).localeCompare(Array.isArray(b) ? b[1] : b, 'en', {
      sensitivity: 'base',
    }),
  );
}

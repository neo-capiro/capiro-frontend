import type { ArtifactKind } from "./types";

/** What verification checks before a revised version of each artifact kind is published. */
export const verificationByKind: Readonly<Record<ArtifactKind, string>> = {
  spreadsheet: "Totals, formulas, cell references and rendered workbook",
  presentation: "Slide layout, text overflow, notes and citations",
  web: "Isolated preview, source links and accessibility",
};

/** Sentence-case display name for sheet titles that start with the artifact name. */
export const sentenceCase = (name: string) =>
  name.charAt(0).toUpperCase() + name.slice(1);

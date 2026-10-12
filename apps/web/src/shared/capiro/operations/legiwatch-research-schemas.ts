import { z } from "zod";
import { evidenceId, evidenceScope } from "./legiwatch-evidence-schemas";
export const researchScope = evidenceScope
  .extend({
    jurisdiction: z
      .string()
      .regex(/^[A-Z]{2}$/)
      .optional(),
  })
  .strict();
export const researchVersion = z.object({
  id: evidenceId,
  billId: z.string(),
  jurisdiction: z.string(),
  sessionKey: z.string(),
  revision: z.string(),
  contentHash: z.string(),
  extractorVersion: z.string(),
  sourceUrl: z.string().nullable(),
  kind: z.string(),
  publishedDate: z.string().nullable(),
  observedAt: z.string(),
  complete: z.boolean(),
  title: z.string().nullable().optional(),
  isCurrent: z.boolean().optional(),
});
export const researchMatch = researchVersion.extend({
  billTitle: z.string(),
  billIdentifier: z.string(),
  sponsor: z.string().nullable(),
  chamber: z.string().nullable(),
  lastAction: z.string().nullable(),
  versionType: z.string().nullable(),
  excerpt: z.object({ quote: z.string(), start: z.number(), end: z.number() }),
});
export const researchSearchBody = researchScope
  .extend({
    sessionKey: z.string().min(1).max(60),
    query: z.string().max(2000),
    versionPolicy: z.enum([
      "any_retained",
      "current_extractions",
      "newest_dated_text",
    ]),
    versionStage: z.enum(["all", "enrolled", "chaptered"]),
    kind: z.enum(["all", "text", "amendment", "supplement"]),
    billIds: z.array(z.string().min(1).max(180)).min(1).max(30).optional(),
    title: z.string().max(160).optional(),
    sponsor: z.string().max(160).optional(),
    chamber: z.string().max(160).optional(),
    action: z.string().max(160).optional(),
    referenceId: z.string().max(180).optional(),
    cursor: z.string().max(4000).optional(),
  })
  .strict();
export const researchSearchPage = z.object({
  items: z.array(researchMatch),
  versionPolicy: z.string(),
  searchedKinds: z.string(),
  scanned: z.number(),
  cursor: z.string().nullable(),
  coverage: z.object({
    complete: z.boolean(),
    reason: z.string(),
    manifestId: z.string().nullable(),
    billIds: z.array(z.string()),
    retainedVersionsOnly: z.boolean(),
  }),
  message: z.string(),
});
const linePosition = z
  .object({ locator: z.string(), start: z.number(), end: z.number() })
  .nullable();
export const researchComparison = z.object({
  version: z.literal("exact-line-lcs-v1"),
  left: researchVersion,
  right: researchVersion,
  changes: z.array(
    z.object({
      kind: z.enum(["unchanged", "removed", "added"]),
      text: z.string(),
      left: linePosition,
      right: linePosition,
    }),
  ),
  classification: z.enum([
    "identical_bytes",
    "reextraction_only",
    "layout_only",
    "textual_change",
  ]),
  warning: z.string(),
});
export const legalSection = z.object({
  locator: z.string(),
  text: z.string(),
  hash: z.string().optional(),
});
export const legalReferenceRow = z.object({
  id: z.string(),
  code_kind: z.string().optional(),
  reference_kind: z.string().optional(),
  chapter: z.string().nullable().optional(),
  section: z.string().nullable().optional(),
  edition: z.string().nullable().optional(),
  title: z.string().nullable(),
  source_url: z.string().nullable(),
  revision_id: z.string().nullable().optional(),
  content_hash: z.string().nullable().optional(),
  sections: z.array(legalSection).nullable().optional(),
  complete: z.boolean().nullable().optional(),
  coverage: z.string().nullable().optional(),
  observed_at: z.string().nullable().optional(),
});
export const legalRuleRow = z.object({
  id: z.string(),
  notice_id: z.string(),
  source_url: z.string(),
  content_hash: z.string(),
  observed_at: z.string(),
  payload: z.object({
    title: z.string().optional(),
    noticeType: z.string().optional(),
    ruleTitle: z.string().optional(),
    description: z.string().optional(),
    text: z.string().optional(),
  }),
});
export const legalDeadlineRow = z.object({
  id: z.string(),
  date_only: z.string().nullable(),
  notice_revision_id: z.string(),
  raw_wording: z.string(),
  source_locator: z.string(),
  precision: z.string(),
  basis: z.string(),
  canceled: z.boolean(),
  source_url: z.string(),
  notice_id: z.string(),
  notice_type: z.string().nullable().optional(),
  kind: z.string().optional(),
  date_kind: z.string().optional(),
  label: z.string().nullable().optional(),
  qualifier: z.string().nullable().optional(),
});
export const legalMembership = z.object({
  reference_id: z.string(),
  folder_id: z.string(),
  version: z.number().int(),
  removed: z.boolean(),
  edition: z.string().nullable(),
});

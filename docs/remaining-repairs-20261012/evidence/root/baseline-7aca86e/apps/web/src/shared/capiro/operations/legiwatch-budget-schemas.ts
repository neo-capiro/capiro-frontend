import { z } from "zod";
import { evidenceId } from "./legiwatch-evidence-schemas";

export const minorUnits = z.string().regex(/^-?\d+$/);
export const budgetAmount = z.object({
  id: evidenceId,
  projectId: z.string(),
  fiscalYear: z.string(),
  periodStart: z.string(),
  periodEnd: z.string(),
  currency: z.literal("USD"),
  fund: z.string(),
  basis: z.enum(["recurring", "nonrecurring", "total"]),
  measure: z.enum(["money", "positions", "percentage"]),
  minorUnits: minorUnits.nullable(),
  state: z.enum(["amount", "blank", "omitted", "embedded", "unpublished"]),
  stage: z.string(),
  chamber: z.string(),
  offer: z.string().nullable(),
  sourceRevision: z.string(),
  documentId: z.string(),
  locator: z.string(),
  unitMultiplier: z.string(),
  allocationBasis: z.string(),
  qualified: z.boolean(),
  valueRole: z.enum(["allocation_amount", "vetoed_amount"]).optional(),
});
export const retainedAmount = z.object({
  id: evidenceId,
  observation: budgetAmount,
});
export const budgetProject = z.object({
  id: evidenceId,
  title: z.string(),
  fiscal_year: z.string(),
  saved: z.boolean(),
  tracking_version: z.number().int().nullable(),
  recentAmounts: z.array(retainedAmount),
});
export const budgetDocument = z.object({
  id: evidenceId,
  title: z.string(),
  publisher: z.string(),
  source_url: z.string(),
  content_hash: z.string(),
  fiscal_year: z.string(),
  session_key: z.string(),
  chamber: z.string(),
  stage: z.string(),
  role: z.string(),
  offer: z.string().nullable(),
  publication_date: z.string().nullable(),
  observed_at: z.string(),
  complete: z.boolean(),
});
export const budgetEvent = z.object({
  id: evidenceId,
  title: z.string(),
  source_url: z.string(),
  stage: z.string(),
  fiscal_year: z.string(),
  observed_at: z.string().optional(),
  kind: z.string().optional(),
  project_id: z.string().nullable().optional(),
});
export const budgetPage = z.object({
  fiscalYear: z.string(),
  projects: z.array(budgetProject),
  nextOffset: z.number().int().nullable(),
  documents: z.array(budgetDocument),
  amounts: z.array(retainedAmount),
  events: z.array(budgetEvent),
  notice: z.string(),
});
export const budgetComparison = z.object({
  left: budgetAmount,
  right: budgetAmount,
  comparable: z.boolean(),
  reasons: z.array(z.string()),
  deltaMinorUnits: minorUnits.nullable(),
  percentage: z.string().nullable(),
});

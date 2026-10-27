import { z } from "zod";
import { defineOperation } from "../contracts";
import { evidence } from "./defense-research-schemas";
const source =
  "capiro-backend@f7b3c4401 packages/shared/src/defense-research.ts; defense-research.controller.ts evidence/referenceOccurrence";
export const referenceOccurrence = z.object({
  id: z.string(),
  sourceDocumentId: z.string(),
  sourceRevisionId: z.string(),
  sourceSectionId: z.string().nullable(),
  exactSpan: z.string(),
  originalWording: z.string(),
  referenceType: z.string(),
  disposition: z.enum(["resolved", "ambiguous", "unresolved", "unavailable"]),
  evidenceRef: evidence,
});
export const defenseEvidenceOperations = {
  "defenseResearch.evidence": defineOperation({
    service: "core",
    method: "GET",
    path: "/defense-budget/evidence/:evidenceRefId",
    source,
    request: z
      .object({
        params: z
          .object({ evidenceRefId: z.string().min(1).max(500) })
          .strict(),
      })
      .strict(),
    response: evidence,
  }),
  "defenseResearch.occurrence": defineOperation({
    service: "core",
    method: "GET",
    path: "/defense-budget/reference-occurrences/:occurrenceId",
    source,
    request: z
      .object({
        params: z.object({ occurrenceId: z.string().min(1).max(500) }).strict(),
      })
      .strict(),
    response: referenceOccurrence,
  }),
} as const;

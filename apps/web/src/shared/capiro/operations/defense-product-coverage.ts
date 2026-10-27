import { z } from "zod";
import { defineOperation } from "../contracts";
const filter = z.string().max(200).optional();
export const coverageFilters = z
  .object({
    perimeter: filter,
    component: filter,
    account: filter,
    family: filter,
    fiscalYear: z.number().int().min(1900).max(2200).optional(),
    edition: filter,
    stage: filter,
    detail: filter,
  })
  .strict();
export const productCoverage = z.object({
  projectionVersion: z.string(),
  filters: coverageFilters,
  rows: z.array(
    z.object({
      perimeter: z.string(),
      component: z.string().nullable(),
      account: z.string().nullable(),
      family: z.string(),
      fiscalYear: z.number(),
      edition: z.string().nullable(),
      stage: z.string(),
      detail: z.string().nullable(),
      asOf: z.string(),
      denominator: z.object({
        state: z.enum(["known", "unknown"]),
        value: z.number().nullable(),
        unit: z.literal("physical_documents"),
        reason: z.string(),
        attestedAt: z.string().nullable(),
      }),
      discovered: z.number(),
      parsed: z.number(),
      qualified: z.number(),
      published: z.number(),
      outcome: z.enum(["complete", "partial", "unavailable", "unknown"]),
      limitations: z.array(z.string()),
    }),
  ),
  denominatorKnown: z.boolean(),
  limitations: z.array(z.string()),
});
export const defenseProductCoverageOperations = {
  "defenseResearch.coverage": defineOperation({
    service: "core",
    method: "GET",
    path: "/defense-budget/product-coverage",
    request: z.object({ query: coverageFilters }).strict(),
    response: productCoverage,
    source:
      "capiro-backend@f7b3c4401 packages/shared/src/defense-research.ts DefenseProductCoverageResponseDto; defense-research.controller.ts",
  }),
} as const;

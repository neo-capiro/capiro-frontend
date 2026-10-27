import { z } from "zod";
import { defineOperation } from "../contracts";
import { researchReceipt } from "./research-schemas";

const source =
  "capiro-backend@fba7ed5d1 packages/shared/src/research-portfolios.ts; research-portfolios.controller.ts; research-portfolio-rules.ts";
const params = z.object({ id: z.uuid() }).strict();
export const researchRuleFields = [
  "entityKind",
  "capability",
  "component",
  "account",
  "sourceFamily",
  "publisher",
  "qualification",
  "fiscalYear",
  "stage",
] as const;
export const researchRuleOperators = [
  "eq",
  "neq",
  "in",
  "not_in",
  "contains",
  "exists",
  "gte",
  "lte",
] as const;
type Scalar = string | number | boolean;
export type ResearchRule =
  | { kind: "and" | "or"; clauses: ResearchRule[] }
  | { kind: "not"; clause: ResearchRule }
  | {
      kind: "condition";
      field: string;
      operator: (typeof researchRuleOperators)[number];
      value: Scalar | Scalar[];
    };
export const researchRule: z.ZodType<ResearchRule> = z.lazy(() =>
  z.union([
    z
      .object({
        kind: z.enum(["and", "or"]),
        clauses: z.array(researchRule).min(1).max(50),
      })
      .strict(),
    z.object({ kind: z.literal("not"), clause: researchRule }).strict(),
    z
      .object({
        kind: z.literal("condition"),
        field: z.string().min(1).max(70),
        operator: z.enum(researchRuleOperators),
        value: z.union([
          z.string(),
          z.number(),
          z.boolean(),
          z.array(z.union([z.string(), z.number(), z.boolean()])),
        ]),
      })
      .strict(),
  ]),
);
const version = z.object({
  id: z.uuid(),
  version: z.number(),
  schemaVersion: z.literal(1),
  expression: researchRule,
  readableExpression: z.string(),
  mode: z.enum(["manual", "rules", "hybrid"]),
  qualificationPolicy: z.record(z.string(), z.unknown()),
  taxonomyVersionId: z.string().nullable(),
  publishedAt: z.string(),
});
export const researchRulePreview = z.object({
  previewId: z.uuid(),
  previewHash: z.string(),
  portfolioRevision: z.number(),
  expiresAt: z.string(),
  complete: z.boolean(),
  counts: z.record(z.string(), z.number()),
  items: z.array(
    z.object({
      targetKind: z.string(),
      targetId: z.string(),
      label: z.string().nullable(),
      result: z.enum(["match", "nonmatch", "unknown"]),
      disposition: z.string(),
      reasons: z.array(z.string()),
    }),
  ),
});
export const researchRuleOperations = {
  "research.rules": defineOperation({
    service: "core",
    method: "GET",
    path: "/research-portfolios/:id/rules",
    request: z.object({ params }).strict(),
    response: z.array(
      version.extend({
        recompute: z
          .object({ operationId: z.string(), status: z.string() })
          .nullable(),
      }),
    ),
    source,
  }),
  "research.templates": defineOperation({
    service: "core",
    method: "GET",
    path: "/research-portfolios/templates",
    request: z.object({}).strict(),
    response: z.array(
      z.object({
        id: z.uuid(),
        name: z.string(),
        description: z.string().nullable(),
        archivedAt: z.string().nullable(),
        versions: z.array(version),
      }),
    ),
    source,
  }),
  "research.rules.preview": defineOperation({
    service: "core",
    method: "POST",
    path: "/research-portfolios/:id/rules/preview",
    request: z
      .object({
        params,
        body: z
          .object({
            expectedRevision: z.number().int().nonnegative(),
            schemaVersion: z.literal(1),
            expression: researchRule,
            readableExpression: z.string().trim().min(1).max(10000),
            mode: z.enum(["rules", "hybrid"]),
            qualificationPolicy: z.record(z.string(), z.unknown()),
            taxonomyVersionId: z.string().nullable().optional(),
            templateVersionId: z.string().nullable().optional(),
            candidates: z
              .array(
                z
                  .object({
                    targetKind: z.enum([
                      "program",
                      "program_element",
                      "project",
                      "budget_line",
                      "award",
                    ]),
                    targetId: z.string(),
                    label: z.string().nullable().optional(),
                    facts: z.record(z.string(), z.unknown()),
                  })
                  .strict(),
              )
              .max(200),
          })
          .strict(),
      })
      .strict(),
    response: researchRulePreview,
    source,
  }),
  "research.rules.publish": defineOperation({
    service: "core",
    method: "POST",
    path: "/research-portfolios/:id/rules",
    request: z
      .object({
        params,
        body: z
          .object({
            expectedRevision: z.number().int().nonnegative(),
            idempotencyKey: z.string().min(1).max(128),
            previewId: z.uuid(),
            previewHash: z.string().min(1),
          })
          .strict(),
      })
      .strict(),
    response: researchReceipt,
    source,
  }),
};

import { z } from "zod";
import { defineOperation } from "../contracts";

const source =
  "capiro-backend@f7b3c4401 packages/shared/src/defense-research.ts; defense-saved-comparisons.controller.ts; defense-research.controller.ts";
export const comparisonSubjectTypes = [
  "program_element",
  "program",
  "project",
  "budget_line",
  "context_document",
] as const;
const availability = z.enum(["available", "partial", "unavailable"]);
export const comparisonEvidence = z.object({
  evidenceRefId: z.string(),
  sourceDocumentId: z.string().nullable(),
  sourceRevisionId: z.string().nullable(),
  sourceFamily: z.string(),
  publisher: z.string().nullable(),
  sourceUrl: z.string().nullable(),
  nativeLocator: z.object({
    page: z.number().nullable(),
    section: z.string().nullable(),
    occurrenceId: z.string().nullable(),
  }),
  contentHash: z.string().nullable(),
  edition: z.string().nullable(),
  observedAt: z.string().nullable(),
  availability: availability.optional(),
  reason: z.string().nullable().optional(),
});
export const comparisonProjection = z.object({
  projectionVersion: z.string(),
  subjects: z.array(
    z.object({
      key: z.string(),
      type: z.enum(comparisonSubjectTypes),
      id: z.string(),
      label: z.string(),
      availability,
    }),
  ),
  metrics: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      period: z.string().nullable(),
      metric: z.string(),
      unit: z.string().nullable(),
      grain: z.string(),
      cells: z.array(
        z.object({
          subjectKey: z.string(),
          value: z.string().nullable(),
          disposition: z.enum([
            "observed",
            "missing",
            "unavailable",
            "incompatible",
          ]),
          reason: z.string().nullable(),
          evidence: z.array(comparisonEvidence),
        }),
      ),
    }),
  ),
  alignments: z.array(
    z.object({
      kind: z.enum(["funding", "milestone", "passage", "table"]),
      state: z.enum(["aligned", "partial", "unavailable"]),
      reason: z.string().nullable(),
      subjectEvidence: z.record(z.string(), z.array(comparisonEvidence)),
    }),
  ),
  limitations: z.array(z.string()),
});
const subject = z
  .object({
    type: z.enum(comparisonSubjectTypes),
    id: z
      .string()
      .min(1)
      .max(256)
      .refine(
        (value) => value === value.trim(),
        "Use an exact subject identifier",
      ),
  })
  .strict();
export const comparisonBasis = z
  .object({
    requestEdition: z.string().max(256).nullable(),
    fundingFiscalYear: z.number().int().min(1900).max(2200).nullable(),
    stage: z.string().max(256).nullable(),
    metric: z.string().max(256).nullable(),
    unit: z.string().max(256).nullable(),
    currency: z.string().max(256).nullable(),
    priceBasis: z.string().max(256).nullable(),
    asOfDate: z.string().max(256).nullable(),
    periodStart: z.string().max(256).nullable(),
    periodEnd: z.string().max(256).nullable(),
  })
  .strict();
export const comparisonSelection = z
  .object({
    mode: z.literal("explicit"),
    subjectKeys: z.array(z.string()).max(5),
    passageIds: z.array(z.uuid()).max(1000),
  })
  .strict();
const pins = z
  .array(
    z
      .object({
        documentId: z.uuid(),
        revisionId: z.uuid(),
        sectionIds: z.array(z.uuid()).max(1000),
      })
      .strict(),
  )
  .max(5);
export const saveComparisonBody = z
  .object({
    schemaVersion: z.literal("defense_saved_comparison_v1"),
    name: z.string().trim().min(1).max(200),
    subjects: z.array(subject).min(2).max(5),
    selection: comparisonSelection,
    basisPair: z
      .object({ left: comparisonBasis, right: comparisonBasis })
      .strict(),
    passageMode: z.enum(["none", "native_sections"]),
    contextualRevisionPins: pins,
    displayVersion: z.literal("defense-compare-display-v1"),
    portfolioId: z.uuid().nullable().optional(),
    idempotencyKey: z.string().min(1).max(128),
    expectedRevision: z.number().int().min(1).optional(),
  })
  .strict()
  .superRefine((body, ctx) => {
    const keys = body.subjects.map((item) => `${item.type}:${item.id}`);
    if (
      new Set(keys).size !== keys.length ||
      body.selection.subjectKeys.some((key) => !keys.includes(key))
    )
      ctx.addIssue({
        code: "custom",
        message: "Select distinct subjects and only their exact keys",
      });
    const documents = body.subjects.filter(
      (item) => item.type === "context_document",
    );
    if (
      body.contextualRevisionPins.length !== documents.length ||
      documents.some(
        (item) =>
          body.contextualRevisionPins.filter(
            (pin) => pin.documentId === item.id,
          ).length !== 1,
      )
    )
      ctx.addIssue({
        code: "custom",
        message: "Each contextual subject needs an exact revision pin",
      });
    const sections = body.contextualRevisionPins.flatMap(
      (pin) => pin.sectionIds,
    );
    if (
      body.selection.passageIds.some((id) => !sections.includes(id)) ||
      (body.passageMode === "none" && body.selection.passageIds.length)
    )
      ctx.addIssue({
        code: "custom",
        message: "Passages must belong to pinned native sections",
      });
  });
export const savedComparisonVersion = z.object({
  id: z.uuid(),
  version: z.number().int(),
  schemaVersion: z.literal("defense_saved_comparison_v1"),
  displayVersion: z.string(),
  projectionVersion: z.string(),
  subjects: z.array(subject),
  selection: comparisonSelection,
  basisPair: z.object({ left: comparisonBasis, right: comparisonBasis }),
  passageMode: z.enum(["none", "native_sections"]),
  sourcePins: z.object({
    contextualRevisionPins: pins,
    evidence: z.array(comparisonEvidence),
  }),
  capturedProjection: comparisonProjection,
  contentHash: z.string(),
  capturedAt: z.string(),
  captureKnownAt: z.string(),
  knownAtSupport: z.literal("capture_only"),
  limitations: z.array(z.string()),
});
export const savedComparison = z.object({
  id: z.uuid(),
  name: z.string(),
  ownerUserId: z.string(),
  portfolioId: z.uuid().nullable(),
  revision: z.number().int(),
  archivedAt: z.string().nullable(),
  currentVersion: savedComparisonVersion,
});
const receipt = z.object({
  comparison: savedComparison,
  eventId: z.string(),
  resultingRevision: z.number().int(),
  replayed: z.boolean(),
});
const params = z.object({ id: z.uuid() }).strict();
const versionParams = params.extend({ versionId: z.uuid() }).strict();
const lifecycle = z
  .object({
    expectedRevision: z.number().int().min(1),
    idempotencyKey: z.string().min(1).max(128),
  })
  .strict();
const base = "/defense-budget/saved-comparisons";
const write = <B extends z.ZodType, R extends z.ZodType>(
  path: string,
  body: B,
  response: R,
) =>
  defineOperation({
    service: "core",
    method: "POST",
    path,
    request: z.object({ params, body }).strict(),
    response,
    source,
  });
export const researchComparisonOperations = {
  "research.comparisons.preview": defineOperation({
    service: "core",
    method: "GET",
    path: "/defense-budget/compare",
    request: z
      .object({
        query: z.object({ subjects: z.string().min(1).max(1500) }).strict(),
      })
      .strict(),
    response: comparisonProjection,
    source,
  }),
  "research.comparisons.list": defineOperation({
    service: "core",
    method: "GET",
    path: base,
    request: z
      .object({
        query: z
          .object({ includeArchived: z.boolean().optional() })
          .strict()
          .optional(),
      })
      .strict(),
    response: z.array(savedComparison),
    source,
  }),
  "research.comparisons.read": defineOperation({
    service: "core",
    method: "GET",
    path: `${base}/:id`,
    request: z.object({ params }).strict(),
    response: savedComparison,
    source,
  }),
  "research.comparisons.version": defineOperation({
    service: "core",
    method: "GET",
    path: `${base}/:id/versions/:versionId`,
    request: z.object({ params: versionParams }).strict(),
    response: savedComparison,
    source,
  }),
  "research.comparisons.create": defineOperation({
    service: "core",
    method: "POST",
    path: base,
    request: z.object({ body: saveComparisonBody }).strict(),
    response: receipt,
    source,
  }),
  "research.comparisons.revise": write(
    `${base}/:id/versions`,
    saveComparisonBody,
    receipt,
  ),
  "research.comparisons.archive": write(
    `${base}/:id/archive`,
    lifecycle,
    receipt,
  ),
  "research.comparisons.restore": write(
    `${base}/:id/restore`,
    lifecycle,
    receipt,
  ),
  "research.comparisons.add": defineOperation({
    service: "core",
    method: "POST",
    path: `${base}/:id/versions/:versionId/add-selection-to-portfolio`,
    request: z
      .object({
        params: versionParams,
        body: lifecycle
          .extend({
            portfolioId: z.uuid(),
            expectedPortfolioRevision: z.number().int().min(0),
            selection: comparisonSelection,
          })
          .strict(),
      })
      .strict(),
    response: receipt.extend({
      portfolioId: z.uuid(),
      portfolioRevision: z.number().int(),
      outcomes: z.array(
        z.object({
          kind: z.enum(["member", "bookmark"]),
          targetId: z.string(),
          id: z.string(),
          status: z.enum(["created", "unchanged"]),
        }),
      ),
    }),
    source,
  }),
} as const;
export type ComparisonProjection = z.infer<typeof comparisonProjection>;
export type ComparisonEvidence = z.infer<typeof comparisonEvidence>;
export type SavedComparison = z.infer<typeof savedComparison>;
export type SaveComparison = z.infer<typeof saveComparisonBody>;
export type ComparisonSelection = z.infer<typeof comparisonSelection>;

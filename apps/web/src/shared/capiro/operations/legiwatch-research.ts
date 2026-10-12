import { z } from "zod";
import { defineOperation } from "../contracts";
import {
  legalDeadlineRow,
  legalMembership,
  legalReferenceRow,
  legalRuleRow,
  researchComparison,
  researchScope,
  researchSearchBody,
  researchSearchPage,
  researchVersion,
} from "./legiwatch-research-schemas";
const source =
  "apps/intel-api/src/tracker/research/research.controller.ts + research.service.ts; packages/shared/src/legislative-research.ts @4be13b0b1ed0f2f3fa014040eedbb2fc2c27dace";
const limitedCoverage = z.object({
  complete: z.literal(false),
  reason: z.string(),
});
export const legiwatchResearchOperations = {
  "legiwatch.research.search": defineOperation({
    service: "intelligence",
    method: "POST",
    path: "/legiwatch/research/search",
    request: z.object({ body: researchSearchBody }).strict(),
    response: researchSearchPage,
    source,
  }),
  "legiwatch.research.versions": defineOperation({
    service: "intelligence",
    method: "GET",
    path: "/legiwatch/research/versions",
    request: z
      .object({
        query: researchScope
          .extend({
            billId: z.string().min(1).max(180),
            sessionKey: z.string().min(1).max(60),
          })
          .strict(),
      })
      .strict(),
    response: z.object({
      versions: z.array(researchVersion),
      complete: z.boolean(),
      order: z.literal("source_identity_not_legislative_sequence"),
    }),
    source,
  }),
  "legiwatch.research.compare": defineOperation({
    service: "intelligence",
    method: "POST",
    path: "/legiwatch/research/compare",
    request: z
      .object({
        body: researchScope
          .extend({
            leftId: z.string().min(1).max(180),
            rightId: z.string().min(1).max(180),
            leftRevision: z.string().min(1).max(200),
            rightRevision: z.string().min(1).max(200),
            allowCrossBill: z.boolean(),
            rightSessionKey: z.string().max(60).optional(),
          })
          .strict()
          .refine((value) => value.leftId !== value.rightId, {
            message: "Choose different retained versions.",
          }),
      })
      .strict(),
    response: researchComparison,
    source,
  }),
  "legiwatch.research.references": defineOperation({
    service: "intelligence",
    method: "GET",
    path: "/legiwatch/research/references",
    request: z
      .object({
        query: researchScope
          .extend({
            citation: z.string().max(180).optional(),
            referenceId: z.string().max(180).optional(),
            edition: z
              .string()
              .regex(/^20\d{2}$/)
              .optional(),
            code: z.enum(["statute", "constitution"]).optional(),
          })
          .strict(),
      })
      .strict(),
    response: z.object({
      referenceId: z.string(),
      edition: z.string().nullable(),
      rows: z.array(legalReferenceRow),
      coverage: limitedCoverage,
    }),
    source,
  }),
  "legiwatch.research.rules": defineOperation({
    service: "intelligence",
    method: "GET",
    path: "/legiwatch/research/rules",
    request: z
      .object({
        query: researchScope
          .extend({
            ruleNumber: z.string().max(60).optional(),
            noticeId: z.string().max(100).optional(),
          })
          .strict(),
      })
      .strict(),
    response: z.object({
      rows: z.array(legalRuleRow),
      adopted: z.array(
        legalReferenceRow.omit({
          code_kind: true,
          reference_kind: true,
          chapter: true,
          section: true,
          edition: true,
          revision_id: true,
        }),
      ),
      coverage: limitedCoverage,
    }),
    source,
  }),
  "legiwatch.research.deadlines": defineOperation({
    service: "intelligence",
    method: "GET",
    path: "/legiwatch/research/deadlines",
    request: z
      .object({
        query: researchScope
          .extend({
            from: z.iso.date().optional(),
            to: z.iso.date().optional(),
            noticeId: z.string().max(100).optional(),
          })
          .strict()
          .refine(
            (value) => !value.from || !value.to || value.from <= value.to,
            { message: "Choose an ordered date range." },
          ),
      })
      .strict(),
    response: z.object({
      rows: z.array(legalDeadlineRow),
      kind: z.literal("legal_deadline_overlay"),
      captureAllowed: z.literal(false),
      coverage: limitedCoverage,
    }),
    source,
  }),
  "legiwatch.research.memberships": defineOperation({
    service: "intelligence",
    method: "GET",
    path: "/legiwatch/research/memberships",
    request: z
      .object({
        query: researchScope
          .extend({
            folderId: z.string().min(1).max(100),
            includeRemoved: z.enum(["true", "false"]).optional(),
          })
          .strict(),
      })
      .strict(),
    response: z.array(legalMembership),
    source,
  }),
  "legiwatch.research.membership.save": defineOperation({
    service: "intelligence",
    method: "POST",
    path: "/legiwatch/research/memberships",
    request: z
      .object({
        body: researchScope
          .extend({
            folderId: z.string().min(1).max(100),
            requestKey: z.string().min(8).max(180),
            referenceId: z.string().min(1).max(180),
            expectedVersion: z.number().int().nonnegative(),
            remove: z.boolean(),
            edition: z
              .string()
              .regex(/^20\d{2}$/)
              .nullable(),
          })
          .strict(),
      })
      .strict(),
    response: z.object({
      referenceId: z.string(),
      folderId: z.string(),
      version: z.number().int(),
      removed: z.boolean(),
    }),
    source,
  }),
  "legiwatch.research.coverage": defineOperation({
    service: "intelligence",
    method: "GET",
    path: "/legiwatch/research/coverage",
    request: z.object({ query: researchScope }).strict(),
    response: z.object({
      receipts: z.array(
        z.object({
          id: z.string(),
          source: z.string(),
          complete: z.boolean(),
          observed_at: z.string(),
          manifest: z.object({
            status: z.string().optional(),
            reason: z.string().nullable().optional(),
            coverage: z.string().optional(),
            billDocumentCorpusComplete: z.boolean().optional(),
          }),
        }),
      ),
    }),
    source,
  }),
} as const;

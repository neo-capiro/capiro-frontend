import { z } from "zod";
import { defineOperation } from "../contracts";
import {
  acquisitionDetail,
  acquisitionSummary,
  contextDetail,
  contextSummary,
  dossier,
  fundingMatrix,
  officeDetail,
  officeSummary,
  relationship,
  subjectType,
} from "./defense-research-schemas";
const source =
  "capiro-backend@f7b3c4401 packages/shared/src/defense-research.ts; apps/api/src/defense-research/defense-research.controller.ts";
const filter = z.string().max(200).optional();
const pageQuery = {
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
};
const id = z.string().min(1).max(300);
const subjectParams = z.object({ subjectType, subjectId: id }).strict();
export const defenseResearchOperations = {
  "defenseResearch.context": defineOperation({
    service: "core",
    method: "GET",
    path: "/defense-budget/context-documents",
    source,
    request: z
      .object({
        query: z
          .object({
            family: filter,
            publisher: filter,
            status: filter,
            limit: pageQuery.limit,
          })
          .strict(),
      })
      .strict(),
    response: z.object({
      items: z.array(contextSummary),
      nextCursor: z.string().nullable(),
      denominator: z.object({
        eligible: z.number(),
        observed: z.number(),
        qualified: z.number(),
        available: z.number(),
        partial: z.number(),
        unavailable: z.number(),
      }),
    }),
  }),
  "defenseResearch.context.detail": defineOperation({
    service: "core",
    method: "GET",
    path: "/defense-budget/context-documents/:documentId",
    source,
    request: z
      .object({ params: z.object({ documentId: id }).strict() })
      .strict(),
    response: contextDetail,
  }),
  "defenseResearch.offices": defineOperation({
    service: "core",
    method: "GET",
    path: "/defense-budget/offices",
    source,
    request: z
      .object({
        query: z
          .object({
            q: filter,
            component: filter,
            status: z
              .enum(["active", "historical", "superseded", "unresolved"])
              .optional(),
            ...pageQuery,
          })
          .strict(),
      })
      .strict(),
    response: z.object({
      items: z.array(officeSummary),
      total: z.number(),
      page: z.number(),
      limit: z.number(),
    }),
  }),
  "defenseResearch.office": defineOperation({
    service: "core",
    method: "GET",
    path: "/defense-budget/offices/:officeId",
    source,
    request: z.object({ params: z.object({ officeId: id }).strict() }).strict(),
    response: officeDetail,
  }),
  "defenseResearch.relationships": defineOperation({
    service: "core",
    method: "GET",
    path: "/defense-budget/relationships",
    source,
    request: z
      .object({
        query: z.object({ from: filter, to: filter, ...pageQuery }).strict(),
      })
      .strict(),
    response: z.object({
      items: z.array(relationship),
      total: z.number(),
      page: z.number(),
      limit: z.number(),
    }),
  }),
  "defenseResearch.acquisitions": defineOperation({
    service: "core",
    method: "GET",
    path: "/defense-budget/acquisition-records",
    source,
    request: z
      .object({
        query: z
          .object({
            q: filter,
            sourceSystem: filter,
            recordKind: filter,
            status: filter,
            ...pageQuery,
          })
          .strict(),
      })
      .strict(),
    response: z.object({
      items: z.array(acquisitionSummary),
      total: z.number(),
      page: z.number(),
      limit: z.number(),
    }),
  }),
  "defenseResearch.acquisition": defineOperation({
    service: "core",
    method: "GET",
    path: "/defense-budget/acquisition-records/:identityKey",
    source,
    request: z
      .object({ params: z.object({ identityKey: id }).strict() })
      .strict(),
    response: acquisitionDetail,
  }),
  "defenseResearch.dossier": defineOperation({
    service: "core",
    method: "GET",
    path: "/defense-budget/dossiers/:subjectType/:subjectId",
    source,
    request: z.object({ params: subjectParams }).strict(),
    response: dossier,
  }),
  "defenseResearch.funding": defineOperation({
    service: "core",
    method: "GET",
    path: "/defense-budget/funding-matrix/:subjectType/:subjectId",
    source,
    request: z.object({ params: subjectParams }).strict(),
    response: fundingMatrix,
  }),
} as const;

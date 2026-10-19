import { z } from "zod";
import { binaryDownloadSchema, defineOperation } from "../contracts";
const nullable = z.union([z.string(), z.number()]).nullable();
export const programElement = z.object({
  peCode: z.string(),
  title: z.string(),
  service: z.string().nullable(),
  budgetActivity: z.string().nullable(),
  appropriationType: z.string().nullable(),
  status: z.string().nullable(),
  lastSyncedAt: z.string(),
  watched: z.boolean().optional(),
  latestRequest: z.number().nullable().optional(),
  latestRequestFy: z.number().nullable().optional(),
  latestEnacted: z.number().nullable().optional(),
  latestEnactedFy: z.number().nullable().optional(),
  latestCurrent: z.number().nullable().optional(),
  latestCurrentFy: z.number().nullable().optional(),
  latestCurrentStage: z.string().nullable().optional(),
  signalType: z.string().nullable().optional(),
});
export const programDetail = z.object({
  peCode: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  service: z.string().nullable(),
  budgetActivity: z.string().nullable(),
  lastSyncedAt: z.string(),
  currentUserIsWatching: z.boolean(),
  years: z.array(
    z.object({
      id: z.string(),
      fy: z.number(),
      request: nullable,
      hascMark: nullable.optional(),
      sascMark: nullable.optional(),
      hacDMark: nullable.optional(),
      sacDMark: nullable.optional(),
      conference: nullable,
      ndaaConference: nullable.optional(),
      enacted: nullable,
    }),
  ),
  sourceCount: z.number().optional(),
  fundingSummary: z.string().nullable().optional(),
  unsupportedSourceFamily: z.boolean().nullable().optional(),
});
const peParams = z.object({ peCode: z.string().min(1).max(30) }).strict();
const source =
  "apps/api/src/program-element/program-element.controller.ts / dto/query-program-elements.dto.ts @ 4be13b0";
export const districtSummary = z.object({
  districtKey: z.string(),
  state: z.string(),
  districtCode: z.string(),
  name: z.string().nullable(),
  status: z.enum(["C", "F"]),
  awarded: z.object({
    contractObligations: z.number().nullable(),
    grantObligations: z.number().nullable(),
    grantOutlays: z.number().nullable(),
  }),
  opportunities: z.object({
    opportunityEstimatedFunding: z.number().nullable(),
    opportunityAwardCeiling: z.number().nullable(),
  }),
  clientCount: z.number(),
  score: z.number().nullable(),
  coveragePercent: z.number(),
  employeeCount: z.number().nullable(),
  employeesUnreported: z.boolean(),
  warnings: z.array(z.object({ code: z.string(), message: z.string() })),
});
const districtResponse = z.object({
  districts: z.array(districtSummary),
  freshness: z.array(
    z.object({
      source: z.string(),
      label: z.string(),
      lastSyncedAt: z.string().nullable(),
      neverSynced: z.boolean(),
      freshnessUnavailable: z.boolean().optional(),
    }),
  ),
  warnings: z.array(z.object({ code: z.string(), message: z.string() })),
  generatedAt: z.string(),
});
export const intelligenceDefenseOperations = {
  "intelligence.defense.bills": defineOperation({
    service: "core",
    method: "GET",
    path: "/program-elements/:peCode/bills",
    request: z.object({ params: peParams }).strict(),
    response: z.array(
      z.object({
        id: z.string(),
        congress: z.number(),
        billType: z.string(),
        billNumber: z.union([z.string(), z.number()]),
        title: z.string(),
        latestActionText: z.string().nullable(),
        latestActionDate: z.string().nullable(),
        url: z.string().nullable(),
        budgetPackage: z
          .object({
            name: z.string(),
            fiscalYear: z.number(),
            track: z.string(),
            stage: z.string(),
          })
          .nullable()
          .optional(),
      }),
    ),
    source,
  }),
  "intelligence.defense.projects": defineOperation({
    service: "core",
    method: "GET",
    path: "/program-elements/:peCode/projects",
    request: z.object({ params: peParams }).strict(),
    response: z.array(
      z.object({
        id: z.string(),
        projectCode: z.string(),
        title: z.string(),
        mission: z.string().nullable(),
        fy: z.number().nullable(),
        sourceUrl: z.string().nullable(),
        pageNumber: z.number().nullable(),
      }),
    ),
    source,
  }),
  "intelligence.defense.sources": defineOperation({
    service: "core",
    method: "GET",
    path: "/program-elements/:peCode/sources",
    request: z.object({ params: peParams }).strict(),
    response: z.array(
      z.object({
        id: z.string(),
        docType: z.string(),
        exhibitType: z.string().nullable(),
        fy: z.number().nullable(),
        sourceUrl: z.string(),
        pageNumber: z.number().nullable(),
        pageEnd: z.number().nullable(),
        snippet: z.string().nullable(),
        publisher: z.string().nullable(),
        confidence: z.number().nullable(),
        sourceDocument: z
          .object({
            title: z.string(),
            budgetCycle: z.string(),
            sha256: z.string().nullable(),
          })
          .nullable(),
      }),
    ),
    source,
  }),
  "intelligence.defense.list": defineOperation({
    service: "core",
    method: "GET",
    path: "/program-elements",
    request: z
      .object({
        query: z
          .object({
            q: z.string().max(500).optional(),
            service: z.string().optional(),
            budget_activity: z.string().optional(),
            fy: z.number().int().min(2000).max(2100).optional(),
            watched: z.enum(["true", "false"]).optional(),
            page: z.number().int().min(1).optional(),
            limit: z.number().int().min(1).max(100).optional(),
          })
          .strict()
          .optional(),
      })
      .strict(),
    response: z.object({
      data: z.array(programElement),
      total: z.number(),
      page: z.number(),
      limit: z.number(),
    }),
    source,
  }),
  "intelligence.defense.detail": defineOperation({
    service: "core",
    method: "GET",
    path: "/program-elements/:peCode",
    request: z.object({ params: peParams }).strict(),
    response: programDetail,
    source,
  }),
  "intelligence.defense.watch": defineOperation({
    service: "core",
    method: "POST",
    path: "/program-elements/:peCode/watch",
    request: z
      .object({
        params: peParams,
        body: z.object({ watching: z.boolean() }).strict(),
      })
      .strict(),
    response: z.object({ peCode: z.string(), watching: z.boolean() }),
    source,
  }),
  "intelligence.district.map": defineOperation({
    service: "core",
    method: "GET",
    path: "/intelligence/district-nexus/map",
    request: z
      .object({
        query: z
          .object({
            view: z.literal("current").optional(),
            clientId: z.string().optional(),
            state: z.string().max(2).optional(),
            includeAllDistricts: z.boolean().optional(),
          })
          .strict()
          .optional(),
      })
      .strict(),
    response: districtResponse,
    source: "apps/api/src/district-nexus/district-nexus.controller.ts",
  }),
  "intelligence.district.boundaries": defineOperation({
    service: "core",
    method: "GET",
    path: "/intelligence/district-nexus/boundaries/:status/geojson",
    request: z
      .object({ params: z.object({ status: z.literal("C") }).strict() })
      .strict(),
    response: binaryDownloadSchema,
    responseMode: "binary",
    binary: {
      contentTypes: ["application/geo+json", "application/json"],
      maxBytes: 30000000,
      filename: "current-congressional-districts.geojson",
    },
    timeoutMs: 90000,
    source: "apps/api/src/intelligence/intelligence.controller.ts:673",
  }),
} as const;
export type ProgramElement = z.infer<typeof programElement>;
export type ProgramDetail = z.infer<typeof programDetail>;
export type DistrictSummary = z.infer<typeof districtSummary>;

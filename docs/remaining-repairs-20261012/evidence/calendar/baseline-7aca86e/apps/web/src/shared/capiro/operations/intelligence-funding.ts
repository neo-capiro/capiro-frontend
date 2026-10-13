import { z } from "zod";
import { defineOperation } from "../contracts";
export const fundingSource = z.enum([
  "grants_gov",
  "sam_gov",
  "agency_forecast",
  "dibbs",
  "sbir_sttr",
  "ca_portal",
]);
export const fundingRecord = z.object({
  id: z.string(),
  source: fundingSource,
  sourceRecordId: z.string(),
  title: z.string(),
  agency: z.string().nullable(),
  sourceUrl: z.string().nullable(),
  type: z.string(),
  lifecycle: z.string(),
  postedDate: z.string().nullable(),
  deadline: z.string().nullable(),
  closeOrArchiveDate: z.string().nullable(),
  isPursuable: z.boolean(),
  summary: z.string().nullable(),
  value: z.number().nullable(),
  valueBasis: z.enum(["source_backed", "not_stated_by_source"]),
  sourceFacts: z.object({ provenance: z.string() }),
  relevanceScore: z.number().nullable(),
  eligibility: z.object({ state: z.string(), reason: z.string() }).nullable(),
  clientId: z.string().nullable(),
});
export const fundingSearchResponse = z.object({
  opportunities: z.array(fundingRecord),
  page: z.number(),
  pageSize: z.number(),
  total: z.number().nullable(),
  totalIsCapped: z.boolean(),
  catalogComplete: z.boolean(),
  counts: z.object({
    grants: z.number().nullable(),
    contracts: z.number().nullable(),
    active: z.number().nullable(),
    closed: z.number().nullable(),
  }),
  emptyReason: z.string().nullable(),
  generatedAt: z.string(),
  freshness: z.array(
    z.object({
      source: fundingSource,
      state: z.string(),
      lastSyncedAt: z.string().nullable(),
      recordCount: z.number().nullable(),
    }),
  ),
});
export const fundingDateFact = z.object({
  value: z.string().nullable(),
  precision: z.enum(["date", "timestamp", "raw"]).nullable(),
  timezone: z.string().nullable(),
  sourceRaw: z.string().nullable(),
  unavailableReason: z.string().nullable(),
});
const capability = z.object({ allowed: z.boolean(), reason: z.string() });
export const fundingDetailRecord = fundingRecord.extend({
  dates: z.object({
    posted: fundingDateFact,
    responseDeadline: fundingDateFact,
    closeOrArchive: fundingDateFact,
  }),
  scope: z.object({
    agencies: z.array(z.string()),
    geography: z.array(z.string()),
    naicsCodes: z.array(z.string()),
    pscCodes: z.array(z.string()),
    setAside: z.string().nullable(),
  }),
  eligibilityDetail: z.object({
    applicantTypes: z.array(z.string()),
    restrictions: z.array(z.string()),
    sourceText: z.string().nullable(),
    clientState: z.string().nullable(),
    clientReason: z.string().nullable(),
  }),
  responseInstructions: z.object({
    steps: z.array(z.string()),
    unavailableReason: z.string().nullable(),
  }),
  documents: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      url: z.string(),
      documentType: z.string().nullable(),
    }),
  ),
  capabilities: z.object({
    view: capability,
    sourceClick: capability,
    pursue: capability,
    save: capability,
    submit: capability,
  }),
});
const query = z
  .object({
    mode: z.enum(["all", "matched"]).optional(),
    clientId: z.string().optional(),
    query: z.string().max(2000).optional(),
    source: z.string().optional(),
    type: z.string().optional(),
    agency: z.string().optional(),
    lifecycle: z.string().optional(),
    deadlineWindow: z.enum(["any", "14d", "30d", "90d", "180d"]).optional(),
    deadlineFrom: z.string().optional(),
    deadlineTo: z.string().optional(),
    sort: z
      .enum([
        "deadline",
        "relevance",
        "title",
        "posted",
        "value",
        "agency",
        "updated",
      ])
      .optional(),
    direction: z.enum(["asc", "desc"]).optional(),
    page: z.number().int().min(1).optional(),
    pageSize: z.number().int().min(1).max(100).optional(),
  })
  .strict();
const source =
  "apps/api/src/funding-opportunities/funding-opportunity-v2-search.controller.ts; packages/shared/src/funding-opportunities-v2.ts @ 4be13b0";
const identity = z
  .object({ source: fundingSource, sourceRecordId: z.string().min(1).max(300) })
  .strict();
export const intelligenceFundingOperations = {
  "intelligence.funding.search": defineOperation({
    service: "core",
    method: "GET",
    path: "/intelligence/opportunities/v2/search",
    request: z.object({ query: query.optional() }).strict(),
    response: fundingSearchResponse,
    source,
  }),
  "intelligence.funding.detail": defineOperation({
    service: "core",
    method: "GET",
    path: "/intelligence/opportunities/v2/detail/:source/:sourceRecordId",
    request: z
      .object({
        params: identity,
        query: z
          .object({
            mode: z.enum(["all", "matched"]).optional(),
            clientId: z.string().optional(),
          })
          .strict()
          .optional(),
      })
      .strict(),
    response: z.object({
      opportunity: fundingDetailRecord,
      generatedAt: z.string(),
      source: fundingSource,
      sourceRecordId: z.string(),
      authoritativeSourceUrl: z.string().nullable(),
    }),
    source:
      "apps/api/src/funding-opportunities/funding-opportunity-v2-detail.controller.ts",
  }),
  "intelligence.funding.save": defineOperation({
    service: "core",
    method: "POST",
    path: "/intelligence/opportunities/:source/:sourceRecordId/save",
    request: z
      .object({
        params: identity,
        body: z.object({ status: z.literal("saved") }).strict(),
      })
      .strict(),
    response: z.object({ saved: z.boolean() }),
    source:
      "apps/api/src/funding-opportunities/funding-opportunity-v2-workflow.service.ts:47-106",
  }),
  "intelligence.funding.unsave": defineOperation({
    service: "core",
    method: "DELETE",
    path: "/intelligence/opportunities/:source/:sourceRecordId/save",
    request: z.object({ params: identity }).strict(),
    response: z.object({ saved: z.boolean() }),
    source:
      "apps/api/src/funding-opportunities/funding-opportunity-v2-workflow.service.ts:47-106",
  }),
} as const;
export type FundingRecord = z.infer<typeof fundingRecord>;

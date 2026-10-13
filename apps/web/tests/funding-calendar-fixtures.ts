import type { FundingRecord } from "../src/shared/capiro/operations/intelligence-funding";
import { createApiClient } from "../src/shared/portfolio/api/http";

export const fundingRecord = (
  id = "record-one",
  source: FundingRecord["source"] = "sam_gov",
): FundingRecord => ({
  id: `${source}:${id}`,
  source,
  sourceRecordId: id,
  title: `Synthetic ${source} opportunity ${id}`,
  agency: "Synthetic agency",
  sourceUrl: null,
  type: "solicitation",
  lifecycle: "active",
  postedDate: "2026-09-01T00:00:00Z",
  deadline: "2026-10-14T00:00:00Z",
  closeOrArchiveDate: "2026-12-31T00:00:00Z",
  isPursuable: true,
  summary: null,
  value: null,
  valueBasis: "not_stated_by_source",
  sourceFacts: {
    provenance: source === "sbir_sttr" ? "tango_sbir_topic" : "sam_opportunity",
  },
  relevanceScore: null,
  eligibility: null,
  clientId: null,
});

export const fundingPage = (
  opportunities: FundingRecord[],
  overrides: Record<string, unknown> = {},
) => ({
  opportunities,
  page: 1,
  pageSize: 25,
  total: opportunities.length,
  totalIsCapped: false,
  catalogComplete: true,
  counts: {
    grants: 0,
    contracts: opportunities.length,
    active: opportunities.length,
    closed: 0,
  },
  emptyReason: opportunities.length ? null : "no_matches",
  generatedAt: "2026-10-13T12:00:00Z",
  mode: "all",
  clientId: null,
  freshness: ["sam_gov", "sbir_sttr"].map((source) => ({
    source,
    state: "current",
    lastSyncedAt: "2026-10-13T11:00:00Z",
    recordCount: 100,
  })),
  ...overrides,
});

export const dateFact = (
  value: string | null = "2026-10-14",
  precision: "date" | "timestamp" | "raw" | null = "date",
) => ({
  value,
  precision,
  timezone: null,
  sourceRaw: value,
  unavailableReason: null,
});

export const fundingDetail = (
  record = fundingRecord(),
  responseDeadline = dateFact(),
) => {
  const capability = { allowed: true, reason: "Synthetic permitted read" };
  return {
    opportunity: {
      ...record,
      dates: {
        posted: dateFact("2026-09-01"),
        responseDeadline,
        closeOrArchive: dateFact("2026-12-31"),
      },
      scope: {
        agencies: [],
        geography: [],
        naicsCodes: [],
        pscCodes: [],
        setAside: null,
      },
      eligibilityDetail: {
        applicantTypes: [],
        restrictions: [],
        sourceText: null,
        clientState: null,
        clientReason: null,
      },
      responseInstructions: { steps: [], unavailableReason: null },
      documents: [],
      capabilities: {
        view: capability,
        sourceClick: capability,
        pursue: capability,
        save: capability,
        submit: capability,
      },
    },
    generatedAt: "2026-10-13T12:00:01Z",
    source: record.source,
    sourceRecordId: record.sourceRecordId,
    authoritativeSourceUrl: "https://example.test/synthetic-opportunity",
  };
};

export function fundingApi(
  respond: (url: URL, options?: RequestInit) => unknown | Promise<unknown>,
) {
  const requests: URL[] = [];
  const fetcher = async (input: RequestInfo | URL, options?: RequestInit) => {
    const url = new URL(String(input), "http://127.0.0.1");
    requests.push(url);
    if (options?.method !== "GET") throw new Error("Unexpected funding write");
    const value = await respond(url, options);
    return value instanceof Response ? value : Response.json(value);
  };
  return { api: createApiClient(fetcher), fetcher, requests };
}

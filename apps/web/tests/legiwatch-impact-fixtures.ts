import type {
  ImpactDetail,
  ImpactRow,
} from "../src/shared/capiro/operations/legiwatch-impact-schemas";

export const syntheticClient = "10000000-0000-4000-8000-000000000001";
export const otherSyntheticClient = "10000000-0000-4000-8000-000000000002";
export const syntheticCitation = {
  sourceId: "synthetic-version",
  sourceUrl: "https://example.test/bill/text",
  label: "Synthetic bill text",
  quote: "Eligible components must be produced domestically.",
  locator: "Section 4",
  revision: "sha256-synthetic-version",
};
export function impactRow(overrides: Partial<ImpactRow> = {}): ImpactRow {
  return {
    clientId: syntheticClient,
    clientName: "Synthetic Aerospace",
    billId: "hr-1-119",
    displayNum: "H.R. 1",
    title: "Synthetic Component Eligibility Act",
    jurisdiction: "US",
    status: "Referred to committee",
    stage: "committee",
    passageProbability: null,
    latestActionText: "Referred to the synthetic committee",
    latestActionDate: "2026-11-01",
    sourceUrl: "https://example.test/bill",
    trackedAt: "2026-11-01T12:00:00Z",
    note: null,
    position: "monitor",
    priority: "high",
    trackerBackend: "intelligence",
    impact: {
      status: "ready",
      summary: "Domestic sourcing could affect component eligibility.",
      direction: "mixed",
      confidence: "medium",
      findings: [
        {
          title: "Domestic component requirement",
          direction: "mixed",
          mechanism:
            "The bill would condition eligibility on domestic production; the client supplies relevant components.",
          confidence: "medium",
          provisions: [syntheticCitation],
          clientFacts: [
            {
              ...syntheticCitation,
              sourceId: "synthetic-profile",
              sourceUrl: null,
              label: "Verified client profile",
              quote: "Produces navigation components.",
              locator: "Products",
              revision: "profile-v2",
            },
          ],
          conditions: ["Applies if the client bids on a covered program."],
          missingFacts: ["Supplier origin is not recorded."],
          nextAction:
            "Confirm component supplier locations before taking a position.",
        },
      ],
      missingFacts: ["Supplier origin is not recorded."],
      analyzedAt: "2026-11-05T12:00:00Z",
      inputFingerprint: "synthetic-fingerprint",
      stale: false,
      staleReason: null,
      model: "synthetic-model",
    },
    ...overrides,
  };
}
export function impactDetail(row = impactRow()): ImpactDetail {
  return {
    row,
    actions: [
      {
        date: row.latestActionDate,
        text: row.latestActionText ?? "",
        sourceUrl: row.sourceUrl,
      },
    ],
    versions: [
      {
        id: "synthetic-version",
        label: "Introduced text",
        sourceUrl: syntheticCitation.sourceUrl!,
        publishedAt: "2026-11-01",
        contentHash: "sha256-synthetic-version",
        completeness: "complete",
        current: true,
      },
    ],
    clientFacts: [
      {
        id: "synthetic-profile",
        kind: "product",
        label: "Components",
        value: "Produces navigation components.",
        revision: "profile-v2",
        citations: [],
      },
    ],
    sourceCoverage: { billText: true, clientFacts: true, notes: [] },
    refresh: null,
  };
}
export function impactPage(rows = [impactRow()]) {
  return {
    trackerBackend: rows[0]?.trackerBackend ?? "intelligence",
    rows,
    total: rows.length,
    nextCursor: null,
    hasMore: false,
    clients: [
      { id: syntheticClient, name: "Synthetic Aerospace" },
      { id: otherSyntheticClient, name: "Synthetic Energy" },
    ],
    asOf: "2026-11-06T12:00:00Z",
  };
}

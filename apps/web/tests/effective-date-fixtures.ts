import type {
  EffectiveDatePage,
  EffectiveDateRecord,
} from "../src/shared/federal-register/effective-dates";
export const effectiveRecord: EffectiveDateRecord = {
  documentNumber: "2026-12345",
  title: "Synthetic effective rule",
  agencyNames: ["Synthetic Agency"],
  date: "2026-10-09",
  dateKind: "effective",
  provenance: {
    schemaVersion: 1,
    status: "supported",
    dateKind: "effective",
    documentNumber: "2026-12345",
    publicationDate: "2026-10-01",
    date: "2026-10-09",
    rawEffectiveOn: "2026-10-09",
    sourceUrl:
      "https://www.federalregister.gov/api/v1/documents/2026-12345.json",
    officialPdfUrl:
      "https://www.govinfo.gov/content/pkg/FR-2026-10-01/pdf/2026-12345.pdf",
    correctionOf: null,
    corrections: [],
    authority: "federal_register_publisher_metadata",
    sourceField: "effective_on",
    changedAt: "2026-10-08T10:00:00.000Z",
    observedAt: "2026-10-08T10:00:00.000Z",
    evidenceHash: "a".repeat(64),
    revision: 2,
    previous: {
      date: "2026-10-07",
      status: "supported",
      evidenceHash: "b".repeat(64),
      revision: 1,
      observedAt: "2026-10-07T10:00:00.000Z",
    },
  },
};
export function effectivePage(
  dateFrom = "2026-10-01",
  dateTo = "2026-10-31",
  page = 1,
): EffectiveDatePage {
  return {
    data: [structuredClone(effectiveRecord)],
    range: { dateFrom, dateTo },
    page,
    limit: 100,
    pagination: {
      totalCandidates: 1,
      returned: 1,
      excludedOnPage: 0,
      hasMoreCandidates: false,
    },
    coverage: {
      scope: "locally_ingested_rule_publisher_metadata",
      complete: false,
      allFederalRules: false,
      parsedFullDatesSection: false,
      separatelyIssuedCorrectionsResolved: false,
      asOf: "2026-10-08T12:00:00.000Z",
      maximumObservationAgeHours: 48,
      catalogRules: 12,
      withoutEvidence: 3,
      unsupportedEvidence: 2,
      latestIngestion: null,
      latestRefresh: null,
      refreshRequired: true,
    },
  };
}

import { procurementAccountReports } from "../../src/shared/capiro/operations/procurement-account-reports";

export function unavailableAccounts(
  awardIdentityKeys: string[],
  knownAt: string,
) {
  return procurementAccountReports.parse({
    contract: "defproc-account-reports/v1",
    knownAt,
    scope: { awardIdentityKeys, includesDescendants: false },
    coverage: "source_reported_rows_only",
    reports: awardIdentityKeys.map((awardIdentityKey) => ({
      awardIdentityKey,
      state: "unavailable",
      snapshotId: null,
      sourceObservedAt: null,
      recordedAt: null,
      sourcePayloadSha256: null,
      rows: [],
      sourceUrl: `https://www.usaspending.gov/award/${awardIdentityKey.slice("usaspending|award|".length)}`,
    })),
  });
}

/** Explicitly synthetic client fixture, not publisher or native-SQL acceptance. */
export function accountFixture(
  awardIdentityKey = "usaspending|award|CONT_AWD_0007_9700_-NONE-_-NONE-",
  knownAt = "2026-11-01T01:02:03.123456Z",
) {
  const row = {
    federalAccount: "017-1804",
    accountTitle: "Synthetic account",
    treasuryAccountSymbol: null,
    programActivityCode: "0004",
    programActivityName: "Synthetic activity",
    objectClass: "25.1",
    objectClassName: "Synthetic object class",
    disasterEmergencyFundCode: "Q",
    fundingAgencyName: "Synthetic funding agency",
    awardingAgencyName: "Synthetic awarding agency",
    reportingFiscalYear: 2024,
    reportingFiscalQuarter: 4,
    reportingFiscalMonth: 12,
    isQuarterlySubmission: false,
  };
  return procurementAccountReports.parse({
    contract: "defproc-account-reports/v1",
    knownAt,
    scope: {
      awardIdentityKeys: [awardIdentityKey],
      includesDescendants: false,
    },
    coverage: "source_reported_rows_only",
    reports: [
      {
        awardIdentityKey,
        state: "reported",
        snapshotId: "10000000-0000-4000-8000-000000000001",
        sourceObservedAt: "2026-10-30T00:00:00.000000Z",
        recordedAt: "2026-10-31T00:00:00.000000Z",
        sourcePayloadSha256: "a".repeat(64),
        sourceUrl: `https://www.usaspending.gov/award/${awardIdentityKey.slice("usaspending|award|".length)}`,
        rows: [
          {
            ...row,
            sourceRowIndex: 0,
            reportedObligationUsd: "-1700000.00",
            reportedGrossOutlayUsd: null,
          },
          {
            ...row,
            sourceRowIndex: 1,
            reportedObligationUsd: null,
            reportedGrossOutlayUsd: "0.00",
          },
          {
            ...row,
            sourceRowIndex: 2,
            reportedObligationUsd: null,
            reportedGrossOutlayUsd: "1700000.00",
          },
        ],
      },
    ],
  });
}

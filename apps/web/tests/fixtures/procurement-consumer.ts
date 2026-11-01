import type { ProcurementMoneyFlow } from "@capiro/shared";

export const first = "usaspending|award|CONT_AWD_0007_9700_-NONE-_-NONE-";
export const second = "usaspending|award|CONT_AWD_0007_1700_-NONE-_-NONE-";
export const snapshot = "2026-11-01T01:02:03.123456Z";
export function populated(): ProcurementMoneyFlow {
  return {
    contract: "defproc-scoped-money-flow/v1",
    state: "partial",
    measure: "qualified_observed_actions",
    currency: "USD",
    knownAt: snapshot,
    sourceThrough: null,
    scope: { awardIdentityKeys: [first], includesDescendants: false },
    totals: {
      actions: "2",
      obligationUsd: "-9007199254740993.000001",
      outlayUsd: null,
      obligationKnown: "2",
      outlayKnown: "0",
    },
    coverage: { selected: "2", unqualified: "3" },
    groups: [
      {
        fiscalYear: null,
        awardingAgency: "Synthetic agency",
        awardingSubTier: null,
        contractorName: "Synthetic vendor",
        recipientUei: null,
        vendorIdentityState: "unresolved",
        vendorKey: `award:${first}`,
        attributeState: "latest_known_catalog_observation",
        latestSourceRevision: "2026-10-30T00:00:00.000001Z",
        latestSourceObservedAt: "2026-10-31T00:00:00.000002Z",
        latestRecordedAt: "2026-10-31T00:01:00.000003Z",
        latestAttributeRecordedAt: "2026-10-31T00:00:00.000000Z",
        actions: "2",
        obligationUsd: "-9007199254740993.000001",
        outlayUsd: null,
        obligationKnown: "2",
        outlayKnown: "0",
      },
    ],
    provenance: [
      {
        awardIdentityKey: first,
        contract: "sam-contract-action/v2",
        producerCommit: "a".repeat(40),
        imageDigest: `sha256:${"b".repeat(64)}`,
        runId: "synthetic-run",
        targetId: "synthetic-target",
        selectedActions: "2",
        sourceUrl: "https://example.invalid/action",
        catalogRevisionId: "10000000-0000-4000-8000-000000000001",
        catalogSourceUrl: null,
        attributeRecordedAt: "2026-10-31T00:00:00.000000Z",
      },
    ],
    sources: [
      {
        system: "sam_gov",
        documentationUrl: "https://example.invalid/docs",
        semantics: "Documentation only",
      },
      {
        system: "usaspending",
        documentationUrl: "https://example.invalid/awards",
        semantics: "Original-source award attributes",
      },
    ],
  };
}

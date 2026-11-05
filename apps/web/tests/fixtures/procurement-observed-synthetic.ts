/**
 * CLEARLY SYNTHETIC fixture for procurement-observed contract tests.
 * Not a native SQL capture. Do NOT use in production or claim as real data.
 */
import type { ProcurementObservedMoneyFlow } from "@capiro/shared";

export const observedKey =
  "usaspending|award|CONT_AWD_OBSERVED01_9700_-NONE-_-NONE-";
export const observedKey2 =
  "usaspending|award|CONT_AWD_OBSERVED02_1700_-NONE-_-NONE-";
export const observedSnapshot = "2026-11-01T00:00:00.000000Z";

/** One group, one action detail, minimal valid observed response. */
export function syntheticObservedFlow(): ProcurementObservedMoneyFlow & {
  actionDetails: NonNullable<ProcurementObservedMoneyFlow["actionDetails"]>;
} {
  const txKey =
    "sam_gov|modification|" +
    encodeURIComponent(
      JSON.stringify([
        "sam-contract-action/observed-v1",
        observedKey,
        "P00001",
        "1",
      ]),
    );
  return {
    contract: "defproc-observed-money-flow/v1",
    state: "partial",
    measure: "latest_observed_actions",
    revisionBasis: "latest_observed",
    currency: "USD",
    knownAt: observedSnapshot,
    sourceThrough: null,
    scope: { awardIdentityKeys: [observedKey], includesDescendants: false },
    totals: {
      actions: "1",
      obligationUsd: "100000.00",
      outlayUsd: null,
      obligationKnown: "1",
      outlayKnown: "0",
    },
    coverage: { selected: "1" },
    groups: [
      {
        fiscalYear: 2026,
        awardingAgency: "Synthetic Department",
        awardingSubTier: "Synthetic Agency",
        contractorName: "Synthetic Vendor LLC",
        recipientUei: "SYNTH123ABCD",
        vendorIdentityState: "source_uei",
        vendorKey: "uei:SYNTH123ABCD",
        attributeState: "latest_known_catalog_observation",
        latestSourceObservedAt: "2026-10-31T12:00:00.000000Z",
        latestRecordedAt: "2026-10-31T12:01:00.000000Z",
        latestAttributeRecordedAt: "2026-10-31T12:00:00.000000Z",
        actions: "1",
        obligationUsd: "100000.00",
        outlayUsd: null,
        obligationKnown: "1",
        outlayKnown: "0",
      },
    ],
    provenance: [
      {
        awardIdentityKey: observedKey,
        contract: "sam-contract-action/observed-v1",
        producerCommit: "f7c284a25264a3b830ee2831dab967b2c33b5b31",
        imageDigest: `sha256:${"c".repeat(64)}`,
        runId: "synthetic-observed-run-01",
        targetId: "synthetic-observed-target-01",
        selectedActions: "1",
        sourceUrl:
          "https://api.sam.gov/contract-awards/v1/search?piid=OBSERVED01",
        catalogRevisionId: "20000000-0000-4000-8000-000000000001",
        catalogSourceUrl:
          "https://www.usaspending.gov/award/CONT_AWD_OBSERVED01_9700_-NONE-_-NONE-",
        attributeRecordedAt: "2026-10-31T12:00:00.000000Z",
      },
    ],
    sources: [
      {
        system: "sam_gov",
        documentationUrl: "https://open.gsa.gov/api/contract-awards/",
        semantics:
          "Observed actions; verbatim publisher labels; no certified UTC revision ordering",
      },
      {
        system: "usaspending",
        documentationUrl: "https://www.usaspending.gov/",
        semantics: "Latest known source-reported award attributes",
      },
    ],
    actionDetails: [
      {
        transactionIdentityKey: txKey,
        awardIdentityKey: observedKey,
        awardUniqueId: "CONT_AWD_OBSERVED01_9700_-NONE-_-NONE-",
        selectedRevisionId: "30000000-0000-4000-8000-000000000001",
        piid: "OBSERVED01",
        submittingAgencyCode: "9700",
        parentPiid: null,
        parentAgencyCode: null,
        modificationNumber: "P00001",
        transactionNumber: "1",
        awardType: "B",
        actionDate: "2026-10-15",
        fiscalYear: 2026,
        obligationUsd: "100000.00",
        outlayUsd: null,
        sourceRevisionLabel: "2026-10-14",
        sourceObservedAt: "2026-10-31T12:00:00.000000Z",
        recordedAt: "2026-10-31T12:01:00.000000Z",
        sourceUrl:
          "https://api.sam.gov/contract-awards/v1/search?piid=OBSERVED01",
        sourcePayloadHash: "d".repeat(64),
        vendorKey: "uei:SYNTH123ABCD",
        contractorName: "Synthetic Vendor LLC",
        recipientUei: "SYNTH123ABCD",
        vendorIdentityState: "source_uei",
        attributeState: "latest_known_catalog_observation",
        fundingOrganization: {
          department: { code: "9700", name: "Department of Defense" },
          subtier: { code: "9700F", name: "Synthetic Funding Subtier" },
          office: { code: null, name: null },
        },
        contractingOrganization: {
          department: { code: "9700", name: "Department of Defense" },
          subtier: { code: "9700C", name: "Synthetic Contracting Subtier" },
          office: { code: null, name: null },
        },
      },
    ],
  };
}

/** Same as syntheticObservedFlow but without actionDetails. */
export function syntheticObservedFlowNoDetails(): ProcurementObservedMoneyFlow {
  const { actionDetails: _omit, ...rest } = syntheticObservedFlow();
  return rest;
}

/** A detail with null sourceRevisionLabel (label not reported by publisher). */
export function syntheticObservedDetailNullLabel() {
  const base = syntheticObservedFlow();
  return {
    ...base,
    actionDetails: base.actionDetails.map((d) => ({
      ...d,
      sourceRevisionLabel: null,
    })),
  };
}

/** An older-looking publisher label string, with a later retrieval clock — valid for observed. */
export function syntheticObservedDetailOlderLabel() {
  const base = syntheticObservedFlow();
  return {
    ...base,
    actionDetails: base.actionDetails.map((d) => ({
      ...d,
      sourceRevisionLabel: "2020-01-01",
      sourceObservedAt: "2026-10-31T12:00:00.000000Z",
    })),
  };
}

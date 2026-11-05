import { useState } from "react";
import { createRoot } from "react-dom/client";
import { ProcurementResult } from "@/features/modules/intelligence/research/ProcurementResult";
import type { ProcurementMoneyFlow } from "@capiro/shared";
import "@/app/globals.css";
import "@/shared/portfolio/styles.css";

const first = "usaspending|award|CONT_AWD_0007_9700_-NONE-_-NONE-";
const second = "usaspending|award|CONT_AWD_0007_1700_-NONE-_-NONE-";
const snapshot = "2026-11-01T01:02:03.123456Z";

function makeGroup(overrides: Partial<ProcurementMoneyFlow["groups"][0]> = {}): ProcurementMoneyFlow["groups"][0] {
  return {
    fiscalYear: 2025,
    awardingAgency: "Synthetic Agency",
    awardingSubTier: "Synthetic Sub-Agency",
    contractorName: "Synthetic Vendor Corp",
    recipientUei: "SYNTH1234567A",
    vendorIdentityState: "source_uei",
    vendorKey: "uei:SYNTH1234567A",
    attributeState: "latest_known_catalog_observation",
    latestSourceRevision: "2026-10-30T00:00:00.000001Z",
    latestSourceObservedAt: "2026-10-31T00:00:00.000002Z",
    latestRecordedAt: "2026-10-31T00:01:00.000003Z",
    latestAttributeRecordedAt: "2026-10-31T00:00:00.000000Z",
    actions: "2",
    obligationUsd: "-1.50",
    outlayUsd: null,
    obligationKnown: "2",
    outlayKnown: "0",
    ...overrides,
  };
}

const params = new URLSearchParams(location.search);
const scenario = params.get("scenario") ?? "populated";

function makeData(): ProcurementMoneyFlow {
  if (scenario === "unavailable") {
    return {
      contract: "defproc-scoped-money-flow/v1",
      state: "unavailable",
      measure: "qualified_observed_actions",
      currency: "USD",
      knownAt: snapshot,
      sourceThrough: null,
      scope: { awardIdentityKeys: [first], includesDescendants: false },
      totals: null,
      coverage: { unqualified: "3" },
      groups: [],
      provenance: [],
      sources: [
        { system: "sam_gov", documentationUrl: "https://example.invalid/docs", semantics: "Documentation only" },
        { system: "usaspending", documentationUrl: "https://example.invalid/awards", semantics: "Original-source award attributes" },
      ],
    };
  }
  if (scenario === "negative") {
    // Multiple vendors with negative obligations
    const g1 = makeGroup({
      vendorKey: "uei:SYNTH1234567A",
      recipientUei: "SYNTH1234567A",
      fiscalYear: 2025,
      obligationUsd: "-1.50",
      actions: "1",
      obligationKnown: "1",
    });
    const g2 = makeGroup({
      vendorKey: "uei:SYNTH1234567A",
      recipientUei: "SYNTH1234567A",
      fiscalYear: 2026,
      obligationUsd: "-0.50",
      actions: "1",
      obligationKnown: "1",
      latestSourceRevision: "2026-10-31T00:00:00.000001Z",
      latestSourceObservedAt: "2026-11-01T00:00:00.000002Z",
      latestRecordedAt: "2026-11-01T00:01:00.000003Z",
      latestAttributeRecordedAt: "2026-11-01T00:00:00.000000Z",
    });
    return {
      contract: "defproc-scoped-money-flow/v1",
      state: "partial",
      measure: "qualified_observed_actions",
      currency: "USD",
      knownAt: snapshot,
      sourceThrough: null,
      scope: { awardIdentityKeys: [first], includesDescendants: false },
      totals: { actions: "2", obligationUsd: "-2.00", outlayUsd: null, obligationKnown: "2", outlayKnown: "0" },
      coverage: { selected: "2" },
      groups: [g1, g2],
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
        { system: "sam_gov", documentationUrl: "https://example.invalid/docs", semantics: "Documentation only" },
        { system: "usaspending", documentationUrl: "https://example.invalid/awards", semantics: "Original-source award attributes" },
      ],
    };
  }
  // Default: populated with multiple fiscal years and vendors
  // Consistent fixture: 3 groups (1 unresolved no obligation, 2 resolved with obligations)
  // unresolved: null obligation, obligationKnown "0", actions "1"
  // uei:SYNTH 2025: 1000.00 obligation, 1 action
  // uei:SYNTH 2026: 500.00 obligation, 1 action
  // uei:OTHER 2025: 200.00 obligation, 1 action
  // totals: actions=4, obligationUsd="1700.00", obligationKnown=3
  const groups = [
    makeGroup({ fiscalYear: null, vendorKey: `award:${first}`, recipientUei: null, vendorIdentityState: "unresolved", attributeState: "missing_catalog_attributes", contractorName: null, awardingAgency: null, awardingSubTier: null, latestAttributeRecordedAt: null, actions: "1", obligationUsd: null, obligationKnown: "0" }),
    makeGroup({ fiscalYear: 2025, vendorKey: "uei:SYNTH1234567A", recipientUei: "SYNTH1234567A", obligationUsd: "1000.00", actions: "1", obligationKnown: "1" }),
    makeGroup({ fiscalYear: 2026, vendorKey: "uei:SYNTH1234567A", recipientUei: "SYNTH1234567A", obligationUsd: "500.00", actions: "1", obligationKnown: "1", latestSourceRevision: "2026-10-31T00:00:00.000001Z", latestSourceObservedAt: "2026-11-01T00:00:00.000002Z", latestRecordedAt: "2026-11-01T00:01:00.000003Z", latestAttributeRecordedAt: "2026-11-01T00:00:00.000000Z" }),
    makeGroup({ fiscalYear: 2025, vendorKey: "uei:OTHER1234567B", recipientUei: "OTHER1234567B", contractorName: "Other Vendor LLC", obligationUsd: "200.00", actions: "1", obligationKnown: "1" }),
  ];
  // totals: actions=4, obligationUsd sum = 1000.00 + 500.00 + 200.00 = 1700.00
  return {
    contract: "defproc-scoped-money-flow/v1",
    state: "partial",
    measure: "qualified_observed_actions",
    currency: "USD",
    knownAt: snapshot,
    sourceThrough: null,
    scope: { awardIdentityKeys: [first, second], includesDescendants: false },
    totals: { actions: "4", obligationUsd: "1700.00", outlayUsd: null, obligationKnown: "3", outlayKnown: "0" },
    coverage: { selected: "4" },
    groups,
    provenance: [
      {
        awardIdentityKey: first,
        contract: "sam-contract-action/v2",
        producerCommit: "a".repeat(40),
        imageDigest: `sha256:${"b".repeat(64)}`,
        runId: "synthetic-run",
        targetId: "synthetic-target",
        selectedActions: "3",
        sourceUrl: "https://example.invalid/action",
        catalogRevisionId: "10000000-0000-4000-8000-000000000001",
        catalogSourceUrl: null,
        attributeRecordedAt: "2026-10-31T00:00:00.000000Z",
      },
      {
        awardIdentityKey: second,
        contract: "sam-contract-action/v2",
        producerCommit: "c".repeat(40),
        imageDigest: `sha256:${"d".repeat(64)}`,
        runId: "synthetic-run-b",
        targetId: "synthetic-target-b",
        selectedActions: "1",
        sourceUrl: null,
        catalogRevisionId: null,
        catalogSourceUrl: null,
        attributeRecordedAt: null,
      },
    ],
    sources: [
      { system: "sam_gov", documentationUrl: "https://example.invalid/docs", semantics: "Documentation only" },
      { system: "usaspending", documentationUrl: "https://example.invalid/awards", semantics: "Original-source award attributes" },
    ],
  };
}

function Harness() {
  const [data] = useState<ProcurementMoneyFlow>(() => makeData());
  return (
    <main data-portfolio-root style={{ padding: 24 }}>
      <h1>Procurement Result Harness ({scenario})</h1>
      <ProcurementResult result={data} />
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<Harness />);

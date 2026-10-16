import type { BudgetComparisonView } from "../../screens/workflows/BudgetComparisonScreen";
import type { CompanyResearchView } from "../../screens/workflows/CompanyResearchScreen";
import type { FundingMarketView } from "../../screens/workflows/FundingMarketScreen";
import type { PortfolioOverlapView } from "../../screens/workflows/PortfolioOverlapScreen";
import { fixtureHref } from "./href";

const coverage = {
  label: "Sources & coverage",
  variant: "outline" as const,
  href: fixtureHref("sources-coverage"),
};
const sourceAccess = {
  label: "Source access",
  variant: "ghost" as const,
  href: fixtureHref("source-operations"),
};
const readSource = [
  {
    label: "Read source",
    variant: "ghost" as const,
    href: fixtureHref("exact-source-record"),
  },
];

export const fundingMarket: FundingMarketView = {
  subject:
    "Illustrative · Anduril · CLIENT-104 · Snapshot 10 Oct 2026 · Qualification pending",
  opportunities: [
    {
      eyebrow: "GRANT · G-DEMO-01",
      title: "Applied sensing research",
      lines: [
        "Deadline 22 Oct · Grant funding $2M",
        "Relevance: strong capability match",
        "Eligibility: unassessable — applicant type missing",
        "Recommendation: needs_review",
        "Human decision: not recorded",
      ],
      captions: ["Grants.gov · Source 10 Oct · Synced 10:30 · Fetched 10:44"],
    },
    {
      eyebrow: "SOLICITATION · C-DEMO-02",
      title: "Systems evaluation support",
      lines: [
        "Response 28 Oct · Contract value not held",
        "Relevance: agency and capability match",
        "Eligibility: ineligible — required set-aside not met",
        "Recommendation: pass",
        "Human decision: not recorded",
      ],
      captions: ["SAM.gov · Source 9 Oct · Synced 10:32 · Fetched 10:44"],
    },
  ],
  rails: [
    {
      label: "Procurement forecast",
      value:
        "F-DEMO-03 · Anticipated award FY27 · Early signal; no bid eligibility or response deadline inferred",
    },
    {
      label: "Prime contract obligation",
      value:
        "A-DEMO-04 · $0.8M obligated · Reviewed recipient DEMO-UEI-A · Awarded money",
    },
    {
      label: "Individual subaward",
      value:
        "S-DEMO-05 · $0.2M · Prime DEMO-A / subrecipient DEMO-B · District unknown",
    },
  ],
  railsNote:
    "Grant funding, contract values, obligations and subaward amounts remain separate. Forecasts and solicitations are excluded from awarded-money totals.",
  requirements: [
    "C-DEMO-02 · Attachment ATT-DEMO-4 · p12, characters 420–685 · Extraction confidence: medium · Review pending. This passage is not a verified mandatory condition.",
    "Budget-line linkage: inferred match only; not accepted evidence. Facility overlap uses recorded locations. An unwired context source remains “not checked.”",
  ],
  partial: {
    title: "Partial comparison · 2 read, 1 excluded",
    detail:
      "G-DEMO-06 was unavailable: current source grant denied. It stays listed with its reason. Page 1 of 2; 5 candidates returned, total capped. Missing profile fields can make fit unassessable rather than poor.",
  },
  actions: [
    coverage,
    sourceAccess,
    {
      label: "Government context",
      variant: "ghost",
      href: fixtureHref("government-watch"),
    },
  ],
};

export const budgetComparison: BudgetComparisonView = {
  subject:
    "Illustrative · Federal / Air Force · DEMO-PE-01 · FY27 current cycle · As of 10 Oct 2026",
  identities: [
    {
      title: "RDT&E Program Element",
      lines: ["DEMO-PE-01 · Applied sensing"],
      captions: [
        "Exhibits R-1 / R-2 · RDT&E · Budget activity 6.3",
        "Source J-DEMO-R2 · Revision r4 · Units $M",
      ],
    },
    {
      title: "Procurement line item",
      lines: ["DEMO-PROC-04 · Test systems"],
      captions: [
        "Exhibits P-1 / P-40 · Procurement · Line item 04",
        "Source J-DEMO-P40 · Revision r2 · Units $M",
      ],
    },
  ],
  observationsTitle: "FY and stage observations · DEMO-PE-01",
  observations: [
    {
      id: "fy26",
      period: "FY26",
      cycle: "Historical",
      basis: "Enacted appropriation · P.L. DEMO",
      value: "120 $M · Historical observation",
    },
    {
      id: "fy27-pb",
      period: "FY27",
      cycle: "Current",
      basis: "President’s request · R-2 r4",
      value: "138 $M · Current request; not enacted",
    },
    {
      id: "fy27-hacd",
      period: "FY27",
      cycle: "Current",
      basis: "HAC-D mark · H-DEM-27 r2",
      value: "140 $M · Committee appropriation mark",
    },
    {
      id: "fy28",
      period: "FY28",
      cycle: "Outyear",
      basis: "FYDP projection · R-2 r4",
      value: "145 $M · Projection; not current request",
    },
  ],
  compatible: {
    title: "Compatible · +2 $M",
    lines: [
      "FY27 · RDT&E · Same line, fund, fiscal period and $M basis. Request 138 → HAC-D mark 140. Exact stages and revision IDs retained.",
    ],
    captions: [
      "The delta does not explain why the mark changed. No report-language provision returned in this checked scope.",
    ],
  },
  blocked: {
    title: "Blocked · No numerical delta",
    lines: [
      "DEMO-PE-01 RDT&E request versus DEMO-PROC-04 procurement obligation: different appropriation, observation basis and line identity.",
    ],
    captions: [
      "Unknown values and mismatched units, periods or revisions must be resolved before comparison. A procurement line is not a Program Element.",
    ],
  },
  actions: [
    coverage,
    {
      label: "Bill status & source text",
      variant: "outline",
      href: fixtureHref("government-watch"),
    },
    sourceAccess,
  ],
};

export const companyResearch: CompanyResearchView = {
  description:
    "Example Systems, Inc. · example.com · Confirmed demonstration entity",
  scope: [
    "DEMO-ENTITY-01",
    "Anduril · Authorized context",
    "11 Oct 2026–8 Jan 2027",
  ],
  capabilities: {
    title: "Capabilities grounded in evidence",
    summary:
      "Sensor integration and edge analytics · Demonstration product sheet [R1, 2 Oct, v3]. Agency mission fit is an inference from that capability evidence, not a confirmed program requirement, contract or customer relationship.",
  },
  rails: [
    {
      title: "Awarded money · Historical context",
      lines: [
        "DEMO-AWD-01 · Obligation: $2.4M [R2]",
        "FY 2025 · Award action dated 18 Jun 2025",
        "Obligation is separate from ceiling, potential value and future funding. This is not an open opportunity.",
      ],
      captions: [
        "Award extract as of 9 Oct 2026 · Fetched 10 Oct 10:44",
        "Direct fixture evidence · Exact entity and award action",
      ],
      actions: readSource,
    },
    {
      title: "Future opportunities · Separate rails",
      lines: [
        "DEMO-OPP-02 · Open solicitation [R3]",
        "Deadline: 2 Nov 2026, 5 PM EST (UTC−05:00)",
        "Fit: candidate; eligibility not yet confirmed",
        "DEMO-FCST-03 is a forecast, not an open solicitation.",
      ],
      captions: [
        "Notice revision 2 · Source as of 9 Oct · Fetched 10 Oct",
        "No award assumed · Human pursuit decision required",
      ],
      actions: readSource,
    },
  ],
  gaps: "Capture gaps: validate eligibility and buyer need [R3]; exact PE/procurement links, OTA/grant lanes and partner claims remain unverified. Only the checked source excerpts support this draft.",
  bandLabels: [
    "11 Oct–9 Nov 2026",
    "10 Nov 2026–8 Jan 2027",
    "9 Jan–30 Sep 2027",
  ],
  roadmap: [
    {
      id: "validate",
      lane: "Validate · [R1,R3]",
      bands: ["Resolve eligibility + capability gaps", "—", "—"],
    },
    {
      id: "qualify",
      lane: "Qualify · [R2,R3]",
      bands: ["—", "Verify buyer need + pursuit decision", "—"],
    },
    {
      id: "develop",
      lane: "Develop · [R1–R3]",
      bands: ["—", "—", "Recheck sources + phase next pursuits"],
    },
  ],
  coverage:
    "Coverage: identity, capabilities, award and solicitation fixtures read. Exact PEs, procurement, OTAs, grants and partner evidence are incomplete. Calendar dates and budget fiscal years remain distinct.",
  actions: [
    {
      label: "Sources & coverage",
      variant: "primary",
      href: fixtureHref("sources-coverage"),
    },
    {
      label: "Open sourced dossier",
      variant: "outline",
      href: fixtureHref("word-document"),
    },
    {
      label: "Revise plan with Meri",
      variant: "ghost",
      href: fixtureHref("revise-artifact"),
    },
  ],
};

export const portfolioOverlap: PortfolioOverlapView = {
  description: "Example Systems · example.com → Anduril + AeroVironment",
  scope: [
    "DEMO-ENTITY-01 · Confirmed",
    "2 selected authorized clients",
    "As of 10 Oct 2026",
  ],
  subjects: ["Example Systems", "Anduril", "AeroVironment"],
  dimensions: [
    {
      id: "capabilities",
      dimension: "Capabilities",
      cells: [
        { value: "Sensor integration", basis: "Direct [E1]" },
        {
          value: "Same capability term",
          basis: "Direct [A1]; overlap is inference",
        },
        { value: "Capability field unavailable", basis: "Unavailable" },
      ],
    },
    {
      id: "agency",
      dimension: "Agency / service",
      cells: [
        { value: "Demo Agency, Service A", basis: "Direct [E2]" },
        { value: "Same exact agency record", basis: "Direct [A2]" },
        { value: "Different fixture agency", basis: "Direct [V2]" },
      ],
    },
    {
      id: "mission",
      dimension: "Mission",
      cells: [
        { value: "Demo mission category", basis: "Direct [E3]" },
        { value: "Potential adjacent mission", basis: "Inference [E3,A3]" },
        { value: "Matching mission language", basis: "Inference [E3,V3]" },
      ],
    },
    {
      id: "pe",
      dimension: "Program Element",
      cells: [
        { value: "PE-DEMO-006 · FY 2027", basis: "Direct [E4]" },
        { value: "Same exact PE identity", basis: "Direct [A4]" },
        { value: "No PE evidence read", basis: "Unavailable" },
      ],
    },
    {
      id: "naics",
      dimension: "NAICS / PSC",
      cells: [
        { value: "541715 / PSC-DEMO", basis: "Direct [E5]" },
        {
          value: "Matching classification",
          basis: "Direct [A5]; no contract inferred",
        },
        { value: "PSC unavailable", basis: "Partial [V5]" },
      ],
    },
    {
      id: "contracts",
      dimension: "Contracts",
      cells: [
        { value: "AWD-DEMO-01", basis: "Direct [E6]" },
        { value: "No shared award established", basis: "Checked fixture [A6]" },
        { value: "Contract source unavailable", basis: "Unavailable" },
      ],
    },
    {
      id: "people",
      dimension: "People",
      cells: [
        { value: "Demo Person · PERSON-07", basis: "Direct identity [E7]" },
        { value: "Similar name only", basis: "Inference; identity unresolved" },
        { value: "No permitted people records", basis: "Unavailable" },
      ],
    },
  ],
  clientCoverage: [
    {
      title: "Anduril · 7 dimensions checked",
      summary:
        "Sources A1–A6 read; people identity remains unresolved. Source dates 2–9 Oct · Synced 10 Oct 10:30 · Fetched 10:44.",
    },
    {
      title: "AeroVironment · Partial coverage",
      summary:
        "Sources V2,V3,V5 read. Capabilities, PE, contracts and people unavailable. Source dates 1–8 Oct · Fetched 10 Oct 10:44.",
    },
  ],
  externalCoverage:
    "External source coverage: E1–E7 fixture excerpts read · Exact legal entity retained. The matrix is bounded to this two-client roster and these sources; it is not an exhaustive market or relationship claim.",
  actions: [
    {
      label: "Inspect cited passages",
      variant: "primary",
      href: fixtureHref("exact-source-record"),
    },
    {
      label: "Source coverage",
      variant: "outline",
      href: fixtureHref("sources-coverage"),
    },
    {
      label: "Open analysis artifact",
      variant: "outline",
      href: fixtureHref("analysis-outputs"),
    },
  ],
};

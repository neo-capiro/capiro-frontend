import type { CodeAnalysisView } from "../../screens/workflows/CodeAnalysisScreen";
import type { CommitmentsView } from "../../screens/workflows/CommitmentsScreen";
import type { ExactSourceRecordView } from "../../screens/workflows/ExactSourceRecordScreen";
import type { SourcesCoverageView } from "../../screens/workflows/SourcesCoverageScreen";
import type { WorkflowRequestView } from "../../screens/workflows/WorkflowRequestScreen";
import type { WorkflowRunView } from "../../screens/workflows/WorkflowRunScreen";
import { fixtureHref } from "./href";

const auditContext = [
  "Client: Anduril · CLIENT-104",
  "Audit period: 1 Jul–10 Oct 2026",
  "Monday board: Not mapped",
];
const passage =
  "“We will send the revised briefing before the next review. Jordan will coordinate the update.”";
const noteLocator = "NOTE-047/revision 4/passage 3 of 8";

export const commitments: CommitmentsView = {
  scope: "Anduril · 1 Jul–10 Oct 2026 · America/New_York",
  summary: [
    { value: "4", label: "Promises", caption: "Suggestions separated" },
    {
      value: "2",
      label: "Need tracking",
      caption: "No task in checked records",
    },
    { value: "1", label: "Delivered", caption: "Delivery evidence linked" },
  ],
  coverage: {
    title: "Coverage is partial",
    detail:
      "Email, meeting notes, debriefs, tasks and action items checked. Monday is not mapped to this client; no unrelated boards were used.",
  },
  commitments: [
    {
      promise: "Send the revised briefing",
      source:
        "Explicit promise · 7 Oct meeting + 8 Oct email · Duplicates merged",
      owner: "Jordan Clayton",
      due: "Due 12 Oct",
      status: "In progress",
      tracking: "TASK-2047 · Open",
      evidenceHref: fixtureHref("exact-source-record"),
      needsTask: false,
    },
    {
      promise: "Confirm the funding language",
      source: "Explicit promise · Email thread · 8 Oct",
      owner: "Unknown",
      due: "Not stated",
      status: "No record of action",
      tracking: "No tracked task in checked sources",
      evidenceHref: fixtureHref("relationship-history"),
      draftTaskHref: fixtureHref("task-draft-commitment"),
      needsTask: true,
    },
    {
      promise: "Share the updated facility list",
      source: "Explicit promise · 7 Oct debrief",
      owner: "Maya Chen",
      due: "Due 9 Oct",
      status: "Completed with evidence",
      tracking: "Delivery email · 9 Oct · TASK-2059",
      evidenceHref: fixtureHref("exact-source-record"),
      needsTask: false,
    },
    {
      promise: "Provide a cost estimate",
      source: "Explicit promise · Meeting notes · 6 Oct",
      owner: "Unknown",
      due: "Due 15 Oct",
      status: "No record of action",
      tracking: "No tracked task in checked sources",
      evidenceHref: fixtureHref("exact-source-record"),
      draftTaskHref: fixtureHref("task-draft-commitment"),
      needsTask: true,
    },
  ],
  excluded:
    "Suggestion excluded: “Explore a joint briefing.” No explicit promise was found in the checked passage. Unknown owners and dates remain unknown.",
  actions: [
    {
      label: "Sources & coverage",
      variant: "outline",
      href: fixtureHref("sources-coverage"),
    },
    {
      label: "Export analysis",
      variant: "outline",
      href: fixtureHref("code-analysis"),
    },
    {
      label: "Refresh audit",
      variant: "ghost",
      href: fixtureHref("workflow-run"),
    },
  ],
};

export const sourcesCoverage: SourcesCoverageView = {
  description: "Illustrative commitments - Anduril",
  scope: [
    "Anduril/CLIENT-104",
    "1 Jul-10 Oct 2026",
    "America/New_York",
    "Partial coverage",
  ],
  bound: {
    title: "Promises use the records read",
    detail: "Unread mail and unmapped Monday prevent an exhaustive audit.",
  },
  sources: [
    {
      domain: "Notes/debriefs",
      count: "12 of 12 read",
      status: "Checked",
      scope: "Anduril",
      detail: "Dated promises read.",
      freshness: "Source 10 Oct; sync 10:30; read 10:44",
      outcome: "success",
    },
    {
      domain: "Action items",
      count: "0 of 0 matches",
      status: "No matches",
      scope: "Anduril/period",
      detail: "Successful empty in applied window.",
      freshness: "Source 10 Oct; sync 10:32; read 10:44",
      outcome: "empty",
    },
    {
      domain: "Granted mailbox",
      count: "50 of 128 threads",
      status: "Partial",
      scope: "Jordan mailbox",
      detail: "78 remain; read passages cited.",
      freshness: "Corpus 10 Oct 10:30; sync 10:32",
      outcome: "partial",
    },
    {
      domain: "Monday work",
      count: "Not checked",
      status: "Unavailable",
      scope: "No mapped board",
      detail: "Unrelated personal boards excluded.",
      freshness: "As-of unknown; not synced",
      outcome: "unavailable",
    },
  ],
  passage: {
    title: "7 Oct strategy review note",
    lines: [passage],
    captions: [noteLocator],
    actions: [
      {
        label: "Open exact source",
        variant: "outline",
        href: fixtureHref("exact-source-record"),
      },
    ],
  },
  metadata: [
    { label: "Requested / applied", value: "Anduril/CLIENT-104 -> same" },
    {
      label: "Calendar bounds",
      value: "1 Jul 00:00 -> 11 Oct 00:00 EDT; end exclusive",
    },
    { label: "FY / session", value: "FY/session: n/a" },
    { label: "Record / revision", value: noteLocator },
    { label: "Freshness", value: "7 Oct; sync 10 Oct 10:30; read 10:44" },
  ],
  actions: [
    { label: "Continue remaining pages", variant: "primary" },
    {
      label: "View client coverage",
      variant: "outline",
      href: fixtureHref("data-coverage"),
    },
    {
      label: "Return to audit",
      variant: "ghost",
      href: fixtureHref("commitments-deliverables"),
    },
  ],
};

export const codeAnalysis: CodeAnalysisView = {
  description: "analysis.py · Version 2 · Anduril · Run MR-1042",
  conversation: {
    request:
      "Analyze the checked commitment records. Keep unknown owners and dates, and show the underlying evidence.",
    answer:
      "The analysis separates explicit promises from suggestions and counts only evidence-backed delivery. Two promises have no tracked task in the checked sources.",
    sources: "Sources · 4 domains",
    actions: [
      {
        label: "Sources & coverage",
        variant: "outline",
        href: fixtureHref("sources-coverage"),
      },
      {
        label: "Ask for a revision",
        variant: "outline",
        href: fixtureHref("revise-artifact"),
      },
    ],
  },
  artifact: {
    status: "Verified · v2",
    actions: [
      {
        label: "Versions",
        variant: "ghost",
        href: fixtureHref("artifact-versions"),
      },
      { label: "Download source", variant: "outline" },
    ],
    fileName: "analysis.py",
    code: [
      "from pathlib import Path",
      "import csv",
      "",
      'with Path("inputs/commitments.csv").open() as f:',
      "    records = list(csv.DictReader(f))",
      "",
      'promises = [r for r in records if r["kind"] == "promise"]',
      'delivered = [r for r in promises if r["delivery_evidence_id"]]',
      'untracked = [r for r in promises if not r["task_id"]]',
      "",
      'print({"promises": len(promises),',
      '       "delivered": len(delivered),',
      '       "untracked": len(untracked)})',
    ].join("\n"),
    output: 'Exit code 0\n{"promises": 4, "delivered": 1, "untracked": 2}',
    outputNote:
      "Executed in this run’s isolated workspace. Inputs: commitments.csv · Exact source versions retained. This viewer does not provide an unrestricted user shell.",
    files: [
      "commitments.csv · Source rows and evidence IDs",
      "analysis.ipynb · Calculations and chart",
      "analysis-bundle.zip · Inputs, code and outputs",
    ],
    filesAction: {
      label: "Open analysis files",
      variant: "outline",
      href: fixtureHref("analysis-outputs"),
    },
  },
};

export const workflowRequest: WorkflowRequestView = {
  workflow: "Commitments & Deliverables",
  context: auditContext,
  prompt:
    "Audit our commitments to Anduril. Keep unknown owners and dates, link delivery evidence, and flag promises without tracked tasks.",
  requiredSources:
    "Email, meeting notes, debriefs, native tasks, action items and explicitly mapped Monday work",
  attached: [
    "Confirmed subject",
    "Calendar dates and timezone",
    "Fiscal year / session when applicable",
    "Exact workflow revision",
    "Required evidence and output checks",
  ],
  editInputsHref: fixtureHref("setup-commitments-audit"),
  cancelHref: fixtureHref("workflow-library"),
  sourceAccessHref: fixtureHref("source-operations"),
};

export const workflowRun: WorkflowRunView = {
  description:
    "Run MR-1042 · Anduril · All attempts and specialist usage included",
  status: "Running",
  workflow: "Commitments & Deliverables",
  context: [
    {
      title: "Selected invocation",
      lines: auditContext,
      captions: [
        "Workflow revision is fixed at acceptance; resume rechecks current grants.",
      ],
    },
    {
      title: "Verified checkpoint · 10:44 AM",
      lines: [
        "Session and eligible workspace files saved. Completed source-action receipts remain attached.",
      ],
      captions: [
        "Pause is available for this verified state. Invalid restore or lost persistence disables Resume and offers eligible partial work or a clean start.",
      ],
      actions: [
        {
          label: "Checkpoint details",
          variant: "outline",
          href: fixtureHref("states-run-recovery"),
        },
      ],
    },
  ],
  timeline: [
    {
      label: "Queued · 10:42:00",
      value: "Request accepted; no worker has started.",
    },
    {
      label: "Starting · 10:42:02",
      value:
        "Checking current scope, required sources and workspace readiness.",
    },
    {
      label: "Running · 10:42:30",
      value: "Reading exact source records and retained passages.",
    },
  ],
  activity: [
    {
      domain: "Required source checks",
      count: "Scoped to this invocation",
      status: "In progress",
      scope: "Current grants",
      detail:
        "Email, meeting notes, debriefs, native tasks, action items and explicitly mapped Monday work",
      freshness: "Counts and source timestamps appear in exact tool receipts.",
      outcome: "success",
    },
    {
      domain: "Read exact evidence",
      count: "Per-source result counts",
      status: "Result pending",
      scope: "Accepted context",
      detail:
        "Search candidates are followed by reading permitted passages and retaining exact revisions.",
      freshness: "Empty, partial and unavailable remain distinct.",
      outcome: "partial",
    },
  ],
  controls: [
    { label: "Steer", variant: "outline" },
    { label: "Pause", variant: "outline" },
    { label: "Stop", variant: "outline" },
    {
      label: "Review result",
      variant: "primary",
      href: fixtureHref("commitments-deliverables"),
    },
    { label: "Usage", variant: "ghost" },
  ],
  note: "Simple lookups stay in the main run. Research, analysis, artifact and verification specialists appear only when useful; progress shows supported activity, not private reasoning.",
};

export const exactSourceRecord: ExactSourceRecordView = {
  title: "7 Oct strategy review note",
  passage,
  provenance: [
    "Anduril/CLIENT-104 -> same",
    "1 Jul 00:00 -> 11 Oct 00:00 EDT; end exclusive",
    "FY/session: n/a",
    noteLocator,
    "7 Oct; sync 10 Oct 10:30; read 10:44",
  ],
  coverageHref: fixtureHref("sources-coverage"),
  extractionHref: fixtureHref("file-extraction-coverage"),
};

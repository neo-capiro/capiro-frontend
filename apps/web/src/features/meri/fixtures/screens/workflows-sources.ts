import type { BrowserPermissionsView } from "../../screens/workflows/BrowserPermissionsScreen";
import type { FileExtractionView } from "../../screens/workflows/FileExtractionScreen";
import type { SourceCoverageView } from "../../screens/workflows/SourceCoverageRow";
import type { SourceOperationsView } from "../../screens/workflows/SourceOperationsScreen";
import { fixtureHref } from "./href";

const domain = (
  name: string,
  count: string,
  status: string,
  scope: string,
  detail: string,
  freshness: string,
  outcome: SourceCoverageView["outcome"] = "success",
): SourceCoverageView => ({
  domain: name,
  count,
  status,
  scope,
  detail,
  freshness,
  outcome,
});

export const sourceOperations: SourceOperationsView = {
  description:
    "Anduril · Only permitted sources and qualified operations are used.",
  domains: [
    domain(
      "Client context",
      "Profiles, contacts, strategies, programs and recommendations",
      "Available",
      "Anduril · Client team",
      "Record reads · Current authority checked",
      "Just-in-time",
    ),
    domain(
      "Tasks & commitments",
      "Native tasks, action items and promise evidence",
      "Available",
      "Anduril",
      "Read records · Draft an exact task proposal",
      "Just-in-time",
    ),
    domain(
      "Institutional Memory",
      "Approved/current facts, provenance, history and permitted private records",
      "Available",
      "Client + eligible private grants",
      "Recall · Propose/review under canonical rules",
      "Just-in-time",
    ),
    domain(
      "Documents & storage",
      "Source documents, client files, uploads, attachments and permitted objects",
      "Available",
      "Authorized folders / exact version",
      "Read passages · Native artifacts · Approved filing",
      "Synced 10:40 AM",
    ),
    domain(
      "Mailbox & message threads",
      "Owned or delegated mailboxes and permitted attachment bodies",
      "Partial",
      "Jordan’s explicit mailbox grant",
      "Read synced history · Continue pages · No sending",
      "Synced 10:32 AM",
      "partial",
    ),
    domain(
      "Meetings & calendars",
      "Calendar events, meeting notes and debriefs remain distinct",
      "Available",
      "Authorized client calendars",
      "Read context · Prepare a brief · No event creation",
      "Synced 10:35 AM",
    ),
    domain(
      "Legislation & hearings",
      "Federal/state bills, status, votes, exact sessions and committee records",
      "Workflow-specific",
      "Permitted official intelligence",
      "Qualified typed reads only; exact recipes vary",
      "Source timestamps shown",
    ),
    domain(
      "Budget & Program Elements",
      "PEs, procurement lines, fiscal years, stages, vehicles and units",
      "Workflow-specific",
      "Permitted budget sources",
      "Exact comparisons require compatible basis and qualification",
      "Exact exhibit revision",
    ),
    domain(
      "Funding & federal market",
      "Grants, solicitations, forecasts, awards and subawards on separate rails",
      "Workflow-specific",
      "Authorized source domains",
      "Candidate search and fit evidence; human pursuit decision",
      "Per-source freshness",
    ),
    domain(
      "Directories & districts",
      "Offices, people and deterministic facility/district assignments",
      "Workflow-specific",
      "Permitted location / client",
      "Exact identity and dated role evidence",
      "As-of date retained",
    ),
    domain(
      "Relationship graph & history",
      "Permitted links, knowledge graph history and semantic indexes",
      "Workflow-specific",
      "Contributing source grants",
      "Search candidates · Read exact evidence · Label inference",
      "Per-record dates",
    ),
    domain(
      "Monday work",
      "Boards explicitly mapped to the client or an authorized supplied board ID",
      "Not connected",
      "No board mapped",
      "Not checked · No unrelated personal-board access",
      "No synchronization",
      "unavailable",
    ),
    domain(
      "Public web & browser",
      "Public search, observed pages, screenshots and downloaded files",
      "Public workflows",
      "Conversation-bound remote browser",
      "Read / download · Signed-in actions individually qualified",
      "Fetched-at shown",
    ),
    domain(
      "Research Portfolio resource",
      "A specific Defense Research Portfolio, not all-client Meri scope",
      "Not enabled",
      "Resource scope unselected",
      "Exact reads/actions await a selected contract",
      "No availability claim",
      "unavailable",
    ),
    domain(
      "Prospect business development",
      "Prospect identity, details and resource-specific workflow access",
      "Not enabled",
      "Prospect scope unselected",
      "Exact prospect recipes await a selected contract",
      "No availability claim",
      "unavailable",
    ),
  ],
};

const readSource = [
  {
    label: "Read source",
    variant: "ghost" as const,
    href: fixtureHref("exact-source-record"),
  },
];

export const fileExtraction: FileExtractionView = {
  files: [
    {
      title: "PDF · briefing-scan.pdf · v3",
      lines: [
        "Pages 1–8 of 10 read. Pages 9–10 are unreadable. Figures are not interpreted by text extraction. OCR is not enabled for this example.",
      ],
      captions: [
        "FILE-DEMO-PDF · Hash pdf-demo-v3 · Page bounds retained",
        "Partial · Citations may use only readable pages",
      ],
      actions: readSource,
    },
    {
      title: "DOCX · client-notes.docx · v2",
      lines: [
        "Sections 1–4 of 6 read, including supported tables. Sections 5–6 remain unread. Embedded binary objects and diagram content are omitted.",
      ],
      captions: [
        "FILE-DEMO-DOCX · Hash docx-demo-v2 · Section IDs retained",
        "Partial · Preserve the original document",
      ],
      actions: readSource,
    },
    {
      title: "XLSX · funding.xlsx · v5",
      lines: [
        "Summary!A1:F40 read. Data!A1:H50 of 200 rows read; continue at row 51. Held formulas/cached values are distinct. Macros and images were not extracted.",
      ],
      captions: [
        "FILE-DEMO-XLSX · Hash xlsx-demo-v5 · Sheet/range retained",
        "Partial · No full-workbook or recalculation claim",
      ],
      actions: readSource,
    },
    {
      title: "PPTX · client-review.pptx · v1",
      lines: [
        "Slides 1–6 of 8 and their speaker notes read. Slides 7–8 remain unread. Embedded video, audio and binary objects are omitted.",
      ],
      captions: [
        "FILE-DEMO-PPTX · Hash pptx-demo-v1 · Slide/note bounds retained",
        "Partial · Cite the read slide or speaker note",
      ],
      actions: readSource,
    },
  ],
  citation:
    "Partial citation example: FILE-DEMO-PDF/v3, p4, characters 120–360. A citation never implies that unread pages, figures or missing notes were checked. OCR and file/page limits must be qualified for the actual workload.",
  actions: [
    { label: "Continue readable sections", variant: "outline" },
    { label: "Replace inaccessible file", variant: "outline" },
    {
      label: "Sources & coverage",
      variant: "ghost",
      href: fixtureHref("sources-coverage"),
    },
  ],
};

export const browserPermissions: BrowserPermissionsView = {
  description:
    "Illustrative connection · Public research profile · Conversation-bound",
  change: {
    title: "Current authority changed · Access revoked at 10:45 AM",
    detail:
      "Configured workflow support does not override current grants. Browser work stopped; affected profile state, downloads and saved context cannot be reused or published.",
  },
  permissions: [
    {
      id: "public",
      workflow: "Public browsing",
      qualification: "Qualified example only",
      rights: "Read / permitted downloads",
      availability: "Blocked · Current grant revoked",
    },
    {
      id: "signed-in",
      workflow: "Signed-in websites",
      qualification: "Qualification pending per site",
      rights: "No signed-in grant",
      availability: "Not enabled · Secure sign-in required",
    },
    {
      id: "uploads",
      workflow: "Website uploads",
      qualification: "Unsupported for this connection",
      rights: "No upload/action grant",
      availability: "Unavailable · Exact site action needed",
    },
    {
      id: "viewer",
      workflow: "Live browser viewer",
      qualification: "Not selected / unsupported",
      rights: "Snapshots and activity only",
      availability: "No live viewer or user takeover",
    },
  ],
  boundaries: [
    {
      title: "Profile & data boundary",
      summary:
        "Tenant, actor, conversation and permitted domains remain bound to this profile. Remote browsing does not inherit your desktop files, cookies or signed-in accounts.",
    },
    {
      title: "Check authority at every operation",
      summary:
        "Opening a page, downloading, restoring profile state and publishing an output require current access. Reconnection does not restore revoked grants.",
    },
  ],
  blocked: [
    "Read blocked",
    "Upload unavailable",
    "Live viewer unavailable",
    "Resume blocked",
  ],
  actions: [
    {
      label: "Review source access",
      variant: "outline",
      href: fixtureHref("source-operations"),
    },
    {
      label: "View activity history",
      variant: "outline",
      href: fixtureHref("browser-activity"),
    },
    {
      label: "Review eligible partial work",
      variant: "ghost",
      href: fixtureHref("analysis-outputs"),
    },
  ],
};

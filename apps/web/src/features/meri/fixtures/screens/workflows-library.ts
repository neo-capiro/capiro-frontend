import type { ArtifactFormatsView } from "../../screens/workflows/ArtifactFormatsScreen";
import type { ArtifactVerificationScreenView } from "../../screens/workflows/ArtifactVerificationScreen";
import type { WorkflowLibraryView } from "../../screens/workflows/WorkflowLibraryScreen";
import { fixtureHref } from "./href";
import { emptySuccessStates } from "./states-empty";

const noSearchResults = emptySuccessStates.states.find(
  (state) => state.title === "No search results",
);

export const workflowLibrary: WorkflowLibraryView = {
  actions: [
    {
      label: "Create an artifact",
      variant: "outline",
      href: fixtureHref("artifact-formats"),
    },
    {
      label: "Source access",
      variant: "ghost",
      href: fixtureHref("source-operations"),
    },
  ],
  workflows: [
    {
      id: "research_company",
      title: "Research a Company",
      description:
        "Capabilities, federal markets, capture gaps and a sourced roadmap.",
      state: "default",
    },
    {
      id: "relationship_brief",
      title: "Relationship Brief",
      description:
        "People, history, decisions and open questions across permitted sources.",
      state: "default",
    },
    {
      id: "client_changes",
      title: "Client Changes",
      description:
        "Dated changes this week, with carryover and source gaps separated.",
      state: "default",
    },
    {
      id: "portfolio_changes",
      title: "Portfolio Changes",
      description: "Changes across the full permitted active-client roster.",
      state: "default",
    },
    {
      id: "portfolio_overlap",
      title: "Portfolio Overlap",
      description:
        "Evidence-backed overlap with an external company or domain.",
      state: "default",
    },
    {
      id: "mail_history",
      title: "Mail History",
      description:
        "Correspondence, promises and unresolved threads with cited dates.",
      state: "default",
    },
    {
      id: "meeting_prep",
      title: "Meeting Prep Brief",
      description:
        "Prior exchanges, decisions, deadlines and a one-page checklist.",
      state: "default",
    },
    {
      id: "commitments_audit",
      title: "Commitments & Deliverables",
      description: "Promises, delivery evidence and missing tracked work.",
      state: "default",
    },
    {
      id: "funding_opportunity_match",
      title: "Funding Opportunity Match",
      description:
        "Active grant and contract candidates with fit evidence and deadlines.",
      state: "default",
    },
    {
      id: "pe_deep_dive",
      title: "PE Deep Dive",
      description:
        "Exact Program Element, fiscal year, budget stage and source exhibits.",
      state: "default",
    },
    {
      id: "bill_watch",
      title: "Bill Watch",
      description:
        "Tracked legislation with jurisdiction, session and dated status evidence.",
      state: "default",
    },
    {
      id: "hearing_watch",
      title: "Hearing Watch",
      description:
        "Upcoming hearings with committee, jurisdiction and precise time.",
      state: "default",
    },
    {
      id: "representation_lookup",
      title: "Representation Lookup",
      description:
        "Deterministic representation for a state, district or facility.",
      state: "default",
    },
    {
      id: "regulatory_docket_brief",
      title: "Regulatory Docket Brief",
      description:
        "Exact docket, rule stage and verified comment or action window.",
      state: "default",
    },
  ],
  noResults: {
    title: noSearchResults?.title ?? "No search results",
    explanation: noSearchResults?.explanation ?? "",
  },
  note: "Workflows keep their selected subject, dates and required sources with the request. You can still ask a simple question in the conversation.",
};

export const artifactFormats: ArtifactFormatsView = {
  formats: [
    {
      format: "DOCX",
      title: "Research brief",
      description:
        "Headings, tables, citations and an approved client template.",
      exampleHref: fixtureHref("word-document"),
    },
    {
      format: "PDF",
      title: "Rendered document",
      description:
        "Multi-page preview, page navigation and exact-version download.",
      exampleHref: fixtureHref("pdf-preview"),
    },
    {
      format: "XLSX",
      title: "Analysis workbook",
      description: "Supported formulas, charts and recalculation checks.",
      exampleHref: fixtureHref("spreadsheet-preview"),
    },
    {
      format: "PPTX",
      title: "Client update deck",
      description: "Editable native slides, sources and speaker notes.",
      exampleHref: fixtureHref("presentation-preview"),
    },
    {
      format: "HTML",
      title: "Interactive web artifact",
      description: "Isolated preview, source and screenshot verification.",
      exampleHref: fixtureHref("generated-web-preview"),
    },
    {
      format: "CODE",
      title: "Analysis script",
      description:
        "Source code and authorized execution results kept together.",
      exampleHref: fixtureHref("code-analysis"),
    },
    {
      format: "CSV",
      title: "Data table",
      description: "Typed rows and provenance from the checked source records.",
      exampleHref: fixtureHref("analysis-outputs"),
    },
    {
      format: "IPYNB",
      title: "Analysis notebook",
      description: "Reproducible inputs, calculations, charts and results.",
      exampleHref: fixtureHref("analysis-outputs"),
    },
    {
      format: "ZIP",
      title: "Source bundle",
      description: "Permitted inputs, source files and verified outputs.",
      exampleHref: fixtureHref("analysis-outputs"),
    },
  ],
  actions: [
    { label: "Choose an approved template", variant: "outline" },
    { label: "Attach a source file", variant: "outline" },
  ],
  note: "Supported formats and edits depend on the selected workflow. Unsupported workbook features or conversions are disclosed; existing files are preserved.",
};

export const artifactVerification: ArtifactVerificationScreenView = {
  cards: [
    {
      format: "DOCX + PDF",
      title: "Preview not verified",
      version: "meeting-brief.docx / meeting-brief.pdf · Selected v2",
      problem:
        "Document content was generated, but page layout and citation checks are incomplete. The PDF must correspond to this exact DOCX version; a thumbnail is not verification.",
      preserved:
        "Last verified v1 retained · Native document and rendered PDF remain available through version history.",
      checksHref: fixtureHref("artifact-versions"),
      reviseHref: fixtureHref("revise-artifact"),
    },
    {
      format: "XLSX",
      title: "Unsupported workbook features",
      version: "funding-analysis.xlsx · Selected v3",
      problem:
        "An unsupported formula or workbook feature prevented qualified recalculation. Cached values are not newly verified results. Do not mark the workbook recalculated or silently remove unsupported content.",
      preserved:
        "Last verified v2 retained · Original workbook and formulas preserved. Review the affected cells and supported revision choices.",
      checksHref: fixtureHref("spreadsheet-preview"),
      reviseHref: fixtureHref("revise-artifact"),
    },
    {
      format: "PPTX",
      title: "Slide layout requires review",
      version: "client-update.pptx · Selected v2",
      problem:
        "Slide 4 contains cropped text; slide 5 used a substituted font. Per-slide rendering and source checks must pass before this selected version can be released.",
      preserved:
        "Last verified v1 retained · Original slides and speaker notes preserved. Ask for a new layout revision.",
      checksHref: fixtureHref("presentation-preview"),
      reviseHref: fixtureHref("revise-artifact"),
    },
    {
      format: "HTML",
      title: "Isolated preview verification failed",
      version: "signal-summary.html · Selected v2",
      problem:
        "The isolated renderer could not verify the generated preview against its exact source. Runtime restrictions and render failures are reported separately; no unchecked external execution is enabled.",
      preserved:
        "Last verified v1 retained · Current source and eligible diagnostics preserved. Unverified download and filing stay blocked.",
      checksHref: fixtureHref("generated-web-preview"),
      reviseHref: fixtureHref("revise-artifact"),
    },
  ],
  actions: [
    {
      label: "Open version history",
      variant: "outline",
      href: fixtureHref("artifact-versions"),
    },
    {
      label: "Back to artifact formats",
      variant: "ghost",
      href: fixtureHref("artifact-formats"),
    },
  ],
  note: "Preview, save, layout, source and permission checks are separate gates. A prior verified version remains subject to current access when opened or downloaded. This design does not assert that an unqualified renderer or edit is available.",
};

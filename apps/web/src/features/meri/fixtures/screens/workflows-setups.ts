import type { WorkflowFieldView } from "../../screens/workflows/WorkflowField";
import type { WorkflowSetupView } from "../../screens/workflows/WorkflowSetup";

/**
 * The fourteen named workflows from the 10 Oct 2026 inventory (Figma
 * Meri/Workflow setup variants), keyed by their original skill identifier.
 * Values are illustrative; the trusted control layer validates identities.
 */
const field = (
  label: string,
  value: string,
  helper: string,
): WorkflowFieldView => ({
  label,
  value,
  helper,
});
const anduril = "Anduril · Authorized client";

export const workflowSetups = {
  research_company: {
    skill: "quick_skill.research_company",
    title: "Research a Company",
    fields: [
      field(
        "Company name or domain",
        "Anduril Industries · anduril.com",
        "Confirm the legal entity before research.",
      ),
      field(
        "Research horizon",
        "Next 90 days + long-range roadmap",
        "Calendar dates and fiscal years stay separate.",
      ),
      field(
        "Client context",
        anduril,
        "Use only this client’s permitted records.",
      ),
    ],
    requiredSources:
      "Company identity, capabilities, Program Elements, procurement, awards/OTAs, grants, partners and public records",
    output:
      "A sourced market strategy, qualification gaps, 90-day plan and long-range roadmap. Forecasts and open solicitations stay separate.",
  },
  relationship_brief: {
    skill: "quick_skill.relationship_brief",
    title: "Relationship Brief",
    fields: [
      field(
        "Person or organization",
        "Taylor Morgan · House office",
        "Confirm the contact record and office.",
      ),
      field(
        "Client context",
        anduril,
        "Permitted client and mailbox records only.",
      ),
      field(
        "Date range",
        "1 Jul – 10 Oct 2026",
        "America/New_York · Through 10 Oct inclusive.",
      ),
    ],
    requiredSources:
      "Email, meetings, contacts, notes, approved memory, documents and commitments",
    output:
      "Verified facts and inference are separate, with source-by-source coverage and unresolved questions.",
  },
  client_changes: {
    skill: "quick_skill.client_changes",
    title: "Client Changes",
    fields: [
      field("Client", anduril, "Exact client identity is preserved."),
      field(
        "Calendar week",
        "5–11 Oct 2026",
        "5 Oct 00:00 through 12 Oct 00:00, exclusive end.",
      ),
      field(
        "Timezone",
        "America/New_York",
        "Used for week and event boundaries.",
      ),
    ],
    requiredSources:
      "Client records, mail, meetings, tasks, documents, memory and public intelligence",
    output:
      "New dated events, carryover and unavailable sources appear separately. Empty findings stay bounded to checked sources.",
  },
  portfolio_changes: {
    skill: "quick_skill.portfolio_changes",
    title: "Portfolio Changes",
    fields: [
      field(
        "Client roster",
        "All permitted active clients · 2 clients",
        "The roster is enumerated before source checks.",
      ),
      field(
        "Calendar week",
        "5–11 Oct 2026",
        "New dated events are separate from carryover.",
      ),
      field(
        "Timezone",
        "America/New_York",
        "5 Oct 00:00 through 12 Oct 00:00, exclusive end.",
      ),
    ],
    requiredSources:
      "Required authorized sources for each client in the selected active roster",
    output:
      "Per-client coverage, new events, carryover and source failures. No omitted clients hidden by top results.",
  },
  portfolio_overlap: {
    skill: "quick_skill.portfolio_overlap",
    title: "Portfolio Overlap",
    fields: [
      field(
        "External company or domain",
        "Example Systems · example.com",
        "Resolve the intended company; a mention is not a relationship.",
      ),
      field(
        "Permitted clients",
        "Anduril + AeroVironment · 2 permitted clients",
        "Only the selected authorized roster is compared.",
      ),
      field(
        "Comparison date",
        "10 Oct 2026",
        "Capabilities and historical relationships carry their source dates.",
      ),
    ],
    requiredSources:
      "Client capabilities, agencies, services, missions, PEs, NAICS/PSC, contracts, people and public company evidence",
    output:
      "An overlap matrix with direct evidence and inference labeled. No implied existing relationship without proof.",
  },
  mail_history: {
    skill: "quick_skill.mail_history",
    title: "Mail History",
    fields: [
      field(
        "Person or organization",
        "Taylor Morgan · Confirmed contact",
        "Use the selected contact and permitted email identities.",
      ),
      field(
        "Mailbox and client",
        "Jordan’s mailbox · Anduril",
        "Owned or explicitly delegated mailbox grants only.",
      ),
      field(
        "Date range",
        "1 Jul – 10 Oct 2026",
        "The synchronized corpus bounds are reported.",
      ),
    ],
    requiredSources:
      "Every required authorized mailbox, thread body and permitted attachment",
    output:
      "Dated correspondence timeline and open items. Truncated bodies or unsynced history are disclosed.",
  },
  meeting_prep: {
    skill: "quick_skill.meeting_prep",
    title: "Meeting Prep Brief",
    fields: [
      field(
        "Meeting or subject",
        "Anduril strategy review · Confirmed meeting",
        "Calendar event, transcript and meeting notes are distinct sources.",
      ),
      field(
        "Meeting date",
        "12 Oct 2026 · 10:00 AM EDT",
        "America/New_York · Upcoming meeting.",
      ),
      field(
        "Authorized context",
        "Anduril + permitted correspondence",
        "No broader mailbox or client scope is implied.",
      ),
    ],
    requiredSources:
      "Recent events, email, prior meetings/notes, decisions, documents, commitments and relevant legislative sources",
    output:
      "A sourced brief with outstanding questions and a one-page pre-meeting checklist.",
  },
  commitments_audit: {
    skill: "quick_skill.commitments_audit",
    title: "Commitments & Deliverables",
    fields: [
      field(
        "Client",
        anduril,
        "Promises are audited in this client context only.",
      ),
      field(
        "Audit period",
        "1 Jul – 10 Oct 2026",
        "Source dates, owners and due dates are preserved, including unknowns.",
      ),
      field(
        "Monday board",
        "Not mapped · Add an authorized board ID or link",
        "Unrelated personal boards are excluded. This source is disclosed as not checked.",
      ),
    ],
    requiredSources:
      "Emails, meeting notes, debriefs, native tasks, action items and explicitly mapped Monday work",
    output:
      "Promise versus suggestion, owner/due, evidence-backed delivery, deduplicated records and missing tracked tasks. No completion without evidence.",
  },
  funding_opportunity_match: {
    skill: "quick_skill.funding_opportunity_match",
    title: "Funding Opportunity Match",
    fields: [
      field(
        "Client",
        "Anduril · Authorized profile",
        "The current capability profile is checked for assessment gaps.",
      ),
      field(
        "Opportunity rail",
        "Grants + contract opportunities",
        "Awards and forecasts are separate context, not open solicitations.",
      ),
      field(
        "Deadline horizon",
        "Next 90 days",
        "Preserve source deadline and timezone; candidates are not exhaustive.",
      ),
    ],
    requiredSources:
      "Active opportunities, client capabilities, past awards and relevant agency/program context",
    output:
      "Cited fit verdicts with eligibility, source coverage and uncertainty separated from human pursuit decisions.",
  },
  pe_deep_dive: {
    skill: "quick_skill.pe_deep_dive",
    title: "PE Deep Dive",
    fields: [
      field(
        "Program Element",
        "DEMO-PE-01 · Illustrative exact PE selection",
        "Bounded candidates must resolve before comparing values.",
      ),
      field(
        "Service and exhibit",
        "Air Force · RDT&E · R-2",
        "A Program Element is distinct from a procurement budget line.",
      ),
      field(
        "Fiscal year and stage",
        "FY 2027 · President’s budget request",
        "Dollar units, current year and outyears are explicit.",
      ),
    ],
    requiredSources:
      "Exact PE identity, official budget exhibits, revisions and comparable fiscal/stage context",
    output:
      "Source-backed PE brief with exact exhibits, comparable units and stage distinctions. Incompatible totals are blocked.",
  },
  bill_watch: {
    skill: "quick_skill.bill_watch",
    title: "Bill Watch",
    fields: [
      field(
        "Client",
        anduril,
        "Use the tracked bill relationship in this context.",
      ),
      field(
        "Jurisdiction and session",
        "United States · 119th Congress",
        "Bill number alone is insufficient identity.",
      ),
      field(
        "Bill and date range",
        "H.R. 0000 · Illustrative bill · 1–10 Oct 2026",
        "Text, status, votes and enactment evidence remain distinct.",
      ),
    ],
    requiredSources:
      "Tracked bills, exact text/revision, official status, recorded votes and source dates",
    output:
      "Dated changes with exact bill/session. No recorded vote is not a vote against; text alone does not prove enactment.",
  },
  hearing_watch: {
    skill: "quick_skill.hearing_watch",
    title: "Hearing Watch",
    fields: [
      field("Client", anduril, "Permitted tracked issues and committees only."),
      field(
        "Upcoming window",
        "12–25 Oct 2026",
        "America/New_York · Inclusive dates.",
      ),
      field(
        "Jurisdiction and committee",
        "Federal · Selected defense committees",
        "A scheduled hearing is distinct from a completed event or transcript.",
      ),
    ],
    requiredSources:
      "Official hearing schedules, committee records, permitted client issues and available hearing materials",
    output:
      "Upcoming hearing summary with current source timestamps, available materials and schedule uncertainty.",
  },
  representation_lookup: {
    skill: "quick_skill.representation_lookup",
    title: "Representation Lookup",
    fields: [
      field(
        "Location",
        "Arlington facility · Confirmed address",
        "Use a geocoded facility or exact state/district, not inferred proximity.",
      ),
      field(
        "Client",
        "Anduril · Authorized facility",
        "Keep the selected facility and district evidence together.",
      ),
      field(
        "Jurisdiction and as-of",
        "Federal + Virginia · 10 Oct 2026",
        "Current roles require dated official evidence.",
      ),
    ],
    requiredSources:
      "Deterministic district assignment, official office/person directories and dated facility context",
    output:
      "Exact district and representation with geographic/source provenance. Ambiguous addresses require clarification.",
  },
  regulatory_docket_brief: {
    skill: "quick_skill.regulatory_docket_brief",
    title: "Regulatory Docket Brief",
    fields: [
      field(
        "Rule or docket",
        "Docket 0000-001 · Illustrative selection",
        "Resolve an exact docket from bounded search candidates.",
      ),
      field(
        "Jurisdiction",
        "Federal · Selected agency",
        "No cross-jurisdiction identity substitution.",
      ),
      field(
        "Date range",
        "1–10 Oct 2026",
        "Deadline timezone and current lifecycle stage are explicit.",
      ),
    ],
    requiredSources:
      "Official docket, rule documents, published lifecycle updates and deadline records",
    output:
      "Sourced rule brief with stage, dates and an evidence-backed open/closed window. Unknown deadlines stay unknown.",
  },
} as const satisfies Record<string, WorkflowSetupView>;

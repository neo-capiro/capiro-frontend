import type { ClarifyContextView } from "../../screens/workflows/ClarifyContextScreen";
import type { GovernmentWatchView } from "../../screens/workflows/GovernmentWatchScreen";
import type { MemoryConflictView } from "../../screens/workflows/MemoryConflictScreen";
import type { PortfolioChangesView } from "../../screens/workflows/PortfolioChangesScreen";
import type { RelationshipHistoryView } from "../../screens/workflows/RelationshipHistoryScreen";
import { fixtureHref } from "./href";

const readSource = [
  {
    label: "Read source",
    variant: "ghost" as const,
    href: fixtureHref("exact-source-record"),
  },
];
const coverage = {
  label: "Sources & coverage",
  variant: "outline" as const,
  href: fixtureHref("sources-coverage"),
};

export const relationshipHistory: RelationshipHistoryView = {
  description: "Example brief · Anduril / Taylor Morgan · 1 Jul–10 Oct 2026",
  scope: [
    "Illustrative source records",
    "Jordan’s granted mailbox",
    "Partial coverage",
  ],
  events: [
    {
      title: "8 Oct · Verified correspondence",
      lines: [
        "Taylor requested a revised Anduril briefing. The read reply records Jordan’s commitment to coordinate it.",
      ],
      captions: [
        "THREAD-028 · Revision 2 · Dated messages",
        "Direct exchange · Source passage read",
      ],
      actions: readSource,
    },
    {
      title: "7 Oct · Calendar mention",
      lines: [
        "Taylor is listed on a strategy-review invitation. This establishes an invitation, not attendance or what was discussed.",
      ],
      captions: [
        "EVENT-019 · Revision 1 · 7 Oct, 2:00 PM EDT",
        "Mention · Attendance not verified",
      ],
      actions: readSource,
    },
  ],
  thread: {
    title: "Re: Anduril briefing",
    eyebrow: "Taylor Morgan → Jordan Clayton · 8 Oct 2026, 9:15 AM EDT",
    lines: [
      "“Could you send the revised briefing by 12 October? Please include the funding changes.”",
      "Read reply · Jordan: “I’ll coordinate the update.”",
    ],
    locator: "THREAD-028 / v2 · Message 1 of 2 · Body 1–420 of 860 characters",
    captions: [
      "Partial thread · The remaining body and next message are unread. Only shown passages support this brief.",
      "Corpus: inbox/sent through 10 Oct, 10:30 AM; drafts, spam and deleted mail excluded. A miss means “not found in synced mail.”",
      "Source: 8 Oct 9:15 AM · Synced: 10 Oct 10:32 AM · Read: 10:44 AM",
    ],
    actions: [{ label: "Continue reading", variant: "outline" }],
  },
  distinct: {
    title: "Calendar, notes and transcripts remain distinct",
    detail:
      "Invitation available · Notes: pages 1–2 of 3 read · Transcript unavailable. Memory and contacts checked; documents unavailable. These gaps limit the history.",
  },
  actions: [
    coverage,
    {
      label: "Source access",
      variant: "ghost",
      href: fixtureHref("source-operations"),
    },
    {
      label: "Draft a meeting brief",
      variant: "outline",
    },
  ],
};

export const portfolioChanges: PortfolioChangesView = {
  description: "Example weekly review · 5–11 Oct 2026 · America/New_York",
  scope: [
    "Full permitted active roster · 2 of 2",
    "As of 10 Oct, 10:44 AM",
    "Partial source coverage",
  ],
  window:
    "Applied window: 5 Oct 00:00 → 12 Oct 00:00 EDT, exclusive end. This example includes every permitted active client; a listed client can still have unavailable sources.",
  clients: [
    {
      domain: "Anduril",
      count: "Included · Client 1 of 2",
      status: "Partial",
      scope: "Active / permitted",
      detail:
        "Meeting notes and tasks checked. Mail: 20 of 32 threads read. Monday is not mapped; unrelated boards excluded.",
      freshness: "Source through 10 Oct 10:30 · Synced 10:32 · Read 10:44",
      outcome: "partial",
    },
    {
      domain: "AeroVironment",
      count: "Included · Client 2 of 2",
      status: "Source unavailable",
      scope: "Active / permitted",
      detail:
        "Meeting notes checked in the window. Mail unavailable; no exhaustive “nothing changed” conclusion.",
      freshness: "Notes as of 9 Oct · Synced 10 Oct 10:35 · Mail as-of unknown",
      outcome: "unavailable",
    },
  ],
  changes: {
    title: "New in the checked window",
    lines: [
      "8 Oct · Taylor requested an Anduril briefing. The read response contains an explicit commitment. [1]",
      "7 Oct · Meeting notes record a follow-up review. The calendar invitation alone is not a transcript. [2]",
    ],
    captions: [
      "AeroVironment: no matching changes in the checked meeting notes. Mail remains unavailable.",
    ],
  },
  carryover: {
    title: "Carryover, not a new event",
    lines: [
      "Cost estimate · Promised 30 Sep, due 15 Oct. Owner unknown. No delivery evidence in checked sources. [3]",
      "Funding follow-up · Task created 2 Oct remains open. Its status is carryover, not a new promise this week. [4]",
    ],
    actions: [
      {
        label: "Review commitments",
        variant: "ghost",
        href: fixtureHref("commitments-deliverables"),
      },
    ],
  },
  draft: {
    title: "Weekly client update · DOCX · Version 1 · Draft",
    captions: [
      "4 citations: [1] THREAD-028/v2 · [2] NOTE-047/v4 · [3] NOTE-041/v1 · [4] TASK-2047/v3. Coverage limits travel with the draft.",
    ],
  },
  draftActions: [
    {
      label: "Open cited draft",
      variant: "outline",
      href: fixtureHref("word-document"),
    },
    {
      label: "Sources & coverage",
      variant: "ghost",
      href: fixtureHref("sources-coverage"),
    },
  ],
};

export const governmentWatch: GovernmentWatchView = {
  scope: [
    "Anduril · Authorized footprint",
    "As of 10 Oct 2026",
    "Illustrative records",
  ],
  results: [
    {
      title: "Bill Watch",
      lines: [
        "Federal · 119th Congress · DEMO-BILL-01",
        "Text: introduced version · 2 Oct 2026",
        "Latest action: committee referral · 5 Oct",
        "Votes: no recorded vote returned",
        "Enactment: not established by sources read",
      ],
      captions: [
        "Source as of 5 Oct · Synced 10 Oct 10:30 · Fetched 10:44",
        "Status record and bill text are separate evidence",
      ],
      actions: readSource,
    },
    {
      title: "Hearing Watch",
      lines: [
        "Federal · 119th Congress · DEMO-HEARING-02",
        "14 Oct 2026 · 10:00 AM EDT (UTC−04:00)",
        "Committee: demonstration committee",
        "Status: scheduled in the source notice",
        "Revision 2 · Location and witnesses not yet provided",
      ],
      captions: [
        "Notice as of 9 Oct · Synced 10 Oct 10:35 · Fetched 10:44",
        "Exact time retained · No calendar event created",
      ],
      actions: readSource,
    },
    {
      title: "Representation Lookup",
      lines: [
        "DEMO-FACILITY-03 · Confirmed location record",
        "District: Demo State, District 04",
        "Assignment: deterministic boundary lookup, v2026",
        "Role: demonstration district representative",
        "Dated official directory required before a current-role claim",
      ],
      captions: [
        "Boundary/role sources as of 8 Oct · Fetched 10 Oct 10:44",
        "Illustrative identity · No address or role inferred",
      ],
      actions: readSource,
    },
    {
      title: "Regulatory Docket Brief",
      lines: [
        "Federal · DEMO-DOCKET-04 · Notice revision 3",
        "Lifecycle: proposed rule in retrieved notice",
        "Comment deadline: date known, time/timezone unknown",
        "Date: 30 Oct 2026 · No “open now” conclusion",
        "State register coverage: unavailable",
      ],
      captions: [
        "Notice as of 6 Oct · Synced 10 Oct 10:30 · Fetched 10:44",
        "Unknown fields preserved · Coverage is partial",
      ],
      actions: readSource,
    },
  ],
  actions: [
    {
      label: "Sources & coverage",
      variant: "primary",
      href: fixtureHref("sources-coverage"),
    },
    {
      label: "Change workflow or scope",
      variant: "outline",
      href: fixtureHref("workflow-library"),
    },
  ],
};

export const memoryConflict: MemoryConflictView = {
  description: "Briefing cadence · MEM-DEMO-024 · Illustrative evidence",
  scope: [
    "Anduril · CLIENT-104",
    "Client team",
    "Conflict · Review pending",
    "Source hold",
  ],
  evidence: [
    {
      title: "Current approved fact",
      lines: [
        "The client briefing is prepared monthly.",
        "This remains the approved record while the conflicting evidence is reviewed.",
      ],
      captions: [
        "Approved 30 Sep 2026 · MEM-DEMO-024 · Revision 4",
        "Client team · Owner Jordan Clayton · Current",
      ],
      actions: [
        {
          label: "Read source",
          variant: "ghost",
          href: fixtureHref("memory-detail"),
        },
      ],
    },
    {
      title: "New unreviewed evidence",
      lines: [
        "“Please prepare a weekly briefing starting in October.”",
        "A later source suggests a change; it has not superseded the approved fact.",
      ],
      captions: [
        "Meeting note 8 Oct 2026 · NOTE-DEMO-062 · Revision 2",
        "Unreviewed · Correction proposal · Pending",
      ],
      actions: readSource,
    },
  ],
  lifecycle: [
    {
      title: "Scope & access",
      summary:
        "Client team · Anduril only · Owner Jordan Clayton. Private records require their owner’s current grant. Expired grants prevent recall and reuse, including after resume.",
    },
    {
      title: "Source hold is active",
      summary:
        "The original source and its audit history must be preserved. Forget is unavailable for this held record. Review any correction through the canonical workflow.",
    },
  ],
  correction: {
    label: "Proposed correction",
    value: "Prepare the client briefing weekly from October 2026.",
    helper:
      "Evidence NOTE-DEMO-062 v2 · Client scope and source access rechecked on review",
  },
  commands: [
    {
      label: "Review correction",
      variant: "primary",
      href: fixtureHref("memory-proposal"),
    },
    { label: "Confirm current fact", variant: "outline" },
    {
      label: "Forget unavailable · Source hold",
      variant: "ghost",
      blocked: true,
    },
    {
      label: "Audit history",
      variant: "outline",
      href: fixtureHref("memory-detail"),
    },
  ],
  history: {
    title: "History & authoritative outcome",
    summary:
      "8 Oct · Correction proposed · Pending review; current fact retained. 30 Sep · Revision 4 approved · Supersedes revision 3; prior history preserved. On completion · Open the canonical item and actual receipt; failed or expired proposals do not change the fact.",
  },
};

export const clarifyContext: ClarifyContextView = {
  description:
    "Illustrative request · Anduril · Prepare Taylor’s fiscal-year briefing",
  ambiguity: {
    title: "Two authorized people match “Taylor Morgan”",
    detail:
      "Choose the intended record. No candidate is selected automatically, and the choices do not expand this conversation’s permitted scope.",
  },
  candidates: [
    {
      id: "CONTACT-DEMO-01",
      title: "Taylor Morgan · Client liaison",
      lines: ["Anduril relationship contact from client records."],
      captions: [
        "CONTACT-DEMO-01 · Authorized candidate",
        "Unselected · Confirm exact identity",
      ],
      actions: readSource,
    },
    {
      id: "CONTACT-DEMO-02",
      title: "Taylor Morgan · Policy analyst",
      lines: ["A different person in the permitted source records."],
      captions: [
        "CONTACT-DEMO-02 · Authorized candidate",
        "Unselected · Confirm exact identity",
      ],
      actions: readSource,
    },
  ],
  fiscalYears: ["FY2026", "FY2027"],
  timezone: "America/New_York",
  optional: {
    label: "Optional · Preferred emphasis",
    value: "",
    placeholder: "No preference supplied",
    helper:
      "This optional question may be skipped. Required identity, fiscal year and timezone cannot be skipped.",
  },
  cancelHref: fixtureHref("workflow-library"),
};

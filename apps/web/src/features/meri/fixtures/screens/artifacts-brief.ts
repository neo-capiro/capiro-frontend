import type {
  DocumentBlock,
  DocumentPageView,
} from "../../screens/artifacts/types";

/** Synthetic four-page Anduril meeting brief (Figma 03.02/03.03 and their pages A to C), citing exactly 3 sources. */
type BriefCheck = { title: string; detail: string };
type BriefPage = {
  id: string;
  label: string;
  title: string;
  heading: string;
  paragraph: string;
  listHeading: string;
  checks: readonly [BriefCheck, BriefCheck, BriefCheck];
  noteHeading: string;
  note: string;
  sources: string;
};

const briefPage = (page: BriefPage, number: number): DocumentPageView => ({
  id: page.id,
  label: page.label,
  blocks: [
    { kind: "eyebrow", text: "ANDURIL  /  CLIENT INTELLIGENCE" },
    { kind: "title", text: page.title },
    { kind: "byline", text: "9 October 2026 · Prepared for Jordan Clayton" },
    { kind: "divider" },
    { kind: "heading", text: page.heading },
    { kind: "paragraph", text: page.paragraph },
    { kind: "heading", text: page.listHeading },
    ...page.checks.map((check): DocumentBlock => ({ kind: "check", ...check })),
    { kind: "subheading", text: page.noteHeading },
    { kind: "note", text: page.note },
    { kind: "divider" },
    { kind: "sources", text: page.sources },
    {
      kind: "footer",
      text: `Capiro   •   Anduril   •   Page ${number} of 4`,
    },
  ],
});

const pages: readonly BriefPage[] = [
  {
    id: "page-1",
    label: "Meeting brief",
    title: "Meeting brief",
    heading: "The decisions to make",
    paragraph:
      "Align next week’s outreach around FY27 funding, clarify the outstanding restoration request, and confirm the timing of the revised client brief. [1] [2]",
    listHeading: "Three developments to discuss",
    checks: [
      {
        title: "Funding context",
        detail:
          "Review the published defense funding update before the meeting. [1]",
      },
      {
        title: "Open commitment",
        detail:
          "The restoration request remains open in the authorized task record. [2]",
      },
      {
        title: "Client communication",
        detail:
          "The latest meeting note asks for a concise update with sources. [3]",
      },
    ],
    noteHeading: "Evidence & limitations",
    note: "3 defined authorized sources · Public records through 8 Oct · Client records through 9 Oct. This brief reflects retrieved evidence only; coverage may be partial.",
    sources:
      "Sources: [1] Public funding update · [2] Client task · [3] Strategy review",
  },
  {
    id: "page-2",
    label: "Open commitments",
    title: "Open commitments",
    heading: "Confirm the restoration follow-up",
    paragraph:
      "The restoration request remains open in the retrieved client task. Confirm its owner and timing before drafting another task. [2]",
    listHeading: "Questions for the meeting",
    checks: [
      {
        title: "Owner",
        detail: "Ask who is accountable for the existing request. [2]",
      },
      {
        title: "Timing",
        detail:
          "Confirm the intended deadline before proposing a new due date.",
      },
      {
        title: "Context",
        detail: "Keep the 7 Oct strategy review linked to the follow-up. [3]",
      },
    ],
    noteHeading: "Recorded fact and proposed action",
    note: "TASK-2047 is the source record. A future task proposal TP-2048 and created task TASK-2048 are separate records; the source is never silently overwritten.",
    sources: "Sources: [2] Restoration request · [3] Strategy review",
  },
  {
    id: "page-3",
    label: "Recommendations",
    title: "Recommendations",
    heading: "A focused, reviewable next step",
    paragraph:
      "Use the evidence to prepare a concise client discussion. Recommendations below remain proposals until the relevant client decision is recorded. [1] [2] [3]",
    listHeading: "Recommended discussion sequence",
    checks: [
      {
        title: "Funding context",
        detail:
          "Review the published update and confirm implications with the client. [1]",
      },
      {
        title: "Follow-up",
        detail: "Confirm owner and timing for the restoration request. [2]",
      },
      {
        title: "Briefing format",
        detail:
          "Lead with an executive summary; preserve direct evidence links. [3]",
      },
    ],
    noteHeading: "Review before execution",
    note: "Changes to shared memory, filing, tasks or outbound actions follow their exact proposal and current permission checks. This document does not authorize them.",
    sources:
      "Sources: [1] Public funding update · [2] Client task · [3] Strategy review",
  },
  {
    id: "page-4",
    label: "Sources",
    title: "Sources and limitations",
    heading: "Evidence supporting this brief",
    paragraph:
      "This version defines 3 sources. It reflects the successfully retrieved evidence available to this synthetic client context; it does not establish complete coverage.",
    listHeading: "Contributing sources",
    checks: [
      {
        title: "[1] Public funding update",
        detail: "Public source · Published 8 Oct · Used for funding context.",
      },
      {
        title: "[2] Restoration request",
        detail: "Client task TASK-2047 · Updated 8 Oct · Existing request.",
      },
      {
        title: "[3] Strategy review",
        detail:
          "Meeting note · 7 Oct · Client discussion and follow-up context.",
      },
    ],
    noteHeading: "Freshness, access and coverage",
    note: "Retrieved 9 Oct 2026, 10:44 AM. Freshness is evaluated separately from authority. Restricted, superseded or unavailable source material is not silently substituted. A zero-result search is not proof of absence.",
    sources:
      "Source count: 3 · Full provenance remains linked to this immutable version",
  },
];

export const briefPages: readonly DocumentPageView[] = pages.map(
  (page, index) => briefPage(page, index + 1),
);

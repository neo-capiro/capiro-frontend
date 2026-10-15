import type {
  DocumentPageView,
  DocumentWorkspaceView,
  VersionRow,
} from "../../screens/artifacts/types";
import type { PdfPreviewView } from "../../screens/artifacts/PdfPreviewScreen";
import { fixtureHref } from "./href";

/** Synthetic Anduril meeting brief data for 03.02, 03.03, 03.09 and the working draft. */
const eyebrow = "ANDURIL  /  CLIENT INTELLIGENCE";
const footer = (page: number) => `Capiro   •   Anduril   •   Page ${page} of 4`;
const laterPage = (
  id: string,
  label: string,
  page: number,
  text: string,
): DocumentPageView => ({
  id,
  label,
  blocks: [
    { kind: "eyebrow", text: eyebrow },
    { kind: "heading", text: label },
    { kind: "paragraph", text },
    { kind: "divider" },
    { kind: "footer", text: footer(page) },
  ],
});

/** Synthetic Anduril meeting brief shared by the Word, PDF and working-draft frames. */
const briefPages: readonly DocumentPageView[] = [
  {
    id: "page-1",
    label: "Meeting brief",
    blocks: [
      { kind: "eyebrow", text: eyebrow },
      { kind: "title", text: "Meeting brief" },
      { kind: "byline", text: "9 October 2026 · Prepared for Jordan Clayton" },
      { kind: "divider" },
      { kind: "heading", text: "The decisions to make" },
      {
        kind: "paragraph",
        text: "Align next week’s outreach around FY27 funding, clarify the outstanding restoration request, and confirm the timing of the revised client brief. [1] [2]",
      },
      { kind: "heading", text: "Three developments to discuss" },
      {
        kind: "check",
        title: "Funding context",
        detail:
          "Review the published defense funding update before the meeting. [1]",
      },
      {
        kind: "check",
        title: "Open commitment",
        detail:
          "The restoration request remains open in the authorized task record. [2]",
      },
      {
        kind: "check",
        title: "Client communication",
        detail:
          "The latest meeting note asks for a concise update with sources. [3]",
      },
      { kind: "subheading", text: "Evidence & limitations" },
      {
        kind: "note",
        text: "6 authorized sources · Public records through 8 Oct · Mailbox results through 9 Oct. One older attachment could not be extracted; it is excluded from the summary.",
      },
      { kind: "divider" },
      {
        kind: "sources",
        text: "Sources: [1] Public funding update · [2] Client task · [3] Meeting note",
      },
      { kind: "footer", text: footer(1) },
    ],
  },
  laterPage(
    "page-2",
    "Open commitments",
    2,
    "Restoration request: no owner assigned, due 8 Oct and now overdue. Client brief: due 10 Oct. Both come from the authorized task record. [2]",
  ),
  laterPage(
    "page-3",
    "Recommendations",
    3,
    "Confirm the funding priorities. Assign an owner to the restoration request. Agree on the brief’s delivery date. [1] [2]",
  ),
  laterPage(
    "page-4",
    "Sources",
    4,
    "[1] Public funding update, published 8 Oct. [2] Client task, authorized task record retrieved 9 Oct. [3] Meeting note, mailbox result from 9 Oct.",
  ),
];

export const versionRows: readonly VersionRow[] = [
  {
    id: "v2",
    version: "v2 · Current",
    change: "Shorter recommendations",
    created: "Today, 10:47",
    validation: "Verified",
  },
  {
    id: "v1",
    version: "v1 · Original",
    change: "Create a meeting brief",
    created: "Today, 10:45",
    validation: "Verified",
  },
];

const documentBase: Omit<
  DocumentWorkspaceView,
  "heading" | "panelTitle" | "conversation"
> = {
  pages: briefPages,
  versions: versionRows,
  sources: [
    {
      id: "s1",
      label: "[1] Public funding update",
      detail: "Public record · through 8 Oct",
    },
    {
      id: "s2",
      label: "[2] Client task",
      detail: "Authorized task record · retrieved 9 Oct",
    },
    { id: "s3", label: "[3] Meeting note", detail: "Mailbox result · 9 Oct" },
  ],
  suggestion: {
    request: "Make the recommendation more concise",
    blockIndex: 5,
    text: "Confirm FY27 funding priorities, assign an owner to the restoration request, and agree on the next client brief. [1] [2]",
    note: "Source links retained · Review before applying",
  },
  comments: [
    {
      id: "c1",
      initials: "JC",
      author: "Jordan Clayton",
      text: "Keep the source links with this recommendation.",
      time: "Just now",
    },
  ],
  blockTypes: [
    { id: "h1", label: "Heading 1", detail: "Large section heading" },
    { id: "h2", label: "Heading 2", detail: "Subsection heading" },
    { id: "ul", label: "Bulleted list", detail: "A list of ideas" },
    { id: "ol", label: "Numbered list", detail: "A sequence of steps" },
    { id: "table", label: "Table", detail: "Structured evidence or data" },
    { id: "callout", label: "Callout", detail: "Highlight a key point" },
    { id: "divider", label: "Divider", detail: "Separate sections" },
    { id: "citation", label: "Citation", detail: "Link an authorized source" },
  ],
};

const conversation = (openHref?: string) => ({
  request: "Create a meeting brief with the open commitments and source links.",
  reply:
    "Your brief is ready. I verified the page layout, citations and open commitments.",
  artifact: {
    id: "brief",
    name: "Meeting brief",
    detail: "DOCX · v2 · 4 pages · Verified",
    ...(openHref ? { openHref } : {}),
  },
  sourcesLabel: "View 6 sources",
  draft: "Make the recommendations more concise.",
});

export const wordDocument: DocumentWorkspaceView = {
  ...documentBase,
  heading: {
    title: "Meeting brief",
    description: "Anduril · 4 pages · Version 2 · Verified",
  },
  panelTitle: "meeting-brief-v2.docx",
  conversation: conversation(),
};

export const workingDraft: DocumentWorkspaceView = {
  ...documentBase,
  heading: {
    title: "Meeting brief",
    description: "Anduril · Editable working copy",
  },
  caption: "Working draft · Based on version 2",
  panelTitle: "Meeting brief · Working draft",
  conversation: conversation(fixtureHref("word-document")),
};

export const pdfPreview: PdfPreviewView = {
  heading: {
    title: "Meeting brief · PDF",
    description: "Read-only preview · 4 pages · Same source version as DOCX",
  },
  title: "Meeting brief",
  pages: briefPages,
  details: [
    {
      id: "version",
      label: "Version",
      detail: "v2 · Created 10:47 AM",
    },
    { id: "pages", label: "Pages", detail: "4 · No overflow found" },
    { id: "sources", label: "Sources", detail: "6 linked references" },
    {
      id: "quality",
      label: "Quality check",
      detail: "Layout and links verified",
    },
  ],
};

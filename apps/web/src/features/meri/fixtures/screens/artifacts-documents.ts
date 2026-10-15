import type {
  CommentView,
  DocumentWorkspaceView,
  VersionRow,
} from "../../screens/artifacts/types";
import type { PdfPreviewView } from "../../screens/artifacts/PdfPreviewScreen";
import { briefPages } from "./artifacts-brief";
import { fixtureHref } from "./href";

/** Synthetic Anduril meeting brief data for 03.02, 03.03, 03.09, the working draft and the comment states. */

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

const sourceLinksReply =
  "Source links remain with this recommendation, including the strategy review. [3]";

/** The reply already added in this local preview when 13.25 opens. */
export const addedReply: CommentView = {
  id: "reply-1",
  initials: "JC",
  author: "Jordan Clayton",
  text: sourceLinksReply,
  time: "Just now",
};

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
      detail: "Public source · Published 8 Oct",
    },
    {
      id: "s2",
      label: "[2] Restoration request",
      detail: "Client task TASK-2047 · Updated 8 Oct",
    },
    {
      id: "s3",
      label: "[3] Strategy review",
      detail: "Meeting note · 7 Oct",
    },
  ],
  suggestion: {
    request: "Make the recommendation more concise",
    blockIndex: 5,
    text: "Confirm FY27 funding priorities, assign an owner to the restoration request, and agree on the next client brief. [1] [2]",
    note: "Source links retained · Review before applying",
  },
  commentThread: {
    comment: {
      id: "c1",
      initials: "JC",
      author: "Jordan Clayton",
      text: "Keep the source links with this recommendation.",
      time: "Just now",
    },
    replyAuthor: { initials: "JC", author: "Jordan Clayton" },
    replyDraft: sourceLinksReply,
  },
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
  sourcesLabel: "View 3 sources",
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
    { id: "sources", label: "Sources", detail: "3 linked references" },
    {
      id: "quality",
      label: "Quality check",
      detail: "Layout and links verified",
    },
  ],
};

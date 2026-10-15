/** View data for the Figma 3.4 03 · Artifacts screens; presentation shapes only, never authority. */

export type Heading = { title: string; description: string };

/** One labelled line with supporting detail, used by check lists and reference lists. */
export type DetailItem = { id: string; label: string; detail: string };

/** A file or generated output shown as an Artifact card. */
export type ArtifactFile = {
  id: string;
  name: string;
  /** Format, size and version summary, e.g. "DOCX · 4 pages · 184 KB · v2". */
  detail: string;
  /** Registered fixture screen that previews this file, when one exists. */
  openHref?: string;
};

export type WorkspaceFileRow = ArtifactFile & {
  /** Present for versioned outputs, which the file table lists. */
  version?: string;
  status?: string;
  /** Registered fixture screen that files this exact version to the client, when one exists. */
  fileHref?: string;
};

export type WorkspaceFileGroup = {
  id: string;
  label: string;
  fileIds: readonly string[];
};

export type DocumentBlock =
  | {
      kind: "eyebrow" | "title" | "byline" | "heading" | "paragraph";
      text: string;
    }
  | { kind: "subheading" | "note" | "sources" | "footer"; text: string }
  | { kind: "check"; title: string; detail: string }
  | { kind: "divider" };

export type DocumentPageView = {
  id: string;
  label: string;
  blocks: readonly DocumentBlock[];
};

/** Meri's proposed replacement for one paragraph of a document page. */
export type RevisionSuggestion = {
  request: string;
  /** Index of the paragraph block on the first page that the suggestion replaces. */
  blockIndex: number;
  text: string;
  note: string;
};

/** Who wrote a comment or reply, shown as initials beside the name. */
export type CommentAuthor = { initials: string; author: string };

export type CommentView = CommentAuthor & {
  id: string;
  text: string;
  time: string;
};

/** One anchored document comment, the current user who may reply locally, and a starting reply draft. */
export type CommentThreadView = {
  comment: CommentView;
  replyAuthor: CommentAuthor;
  replyDraft: string;
};

/** Local comment overlay states: the thread, writing a reply, a reply added, and resolved (Figma 13.24 to 13.26). */
export type CommentThreadState = "thread" | "reply" | "replied" | "resolved";

/** A comment overlay opened at a given state, with replies already added in this local preview. */
export type CommentThreadOpening = {
  state: CommentThreadState;
  replies?: readonly CommentView[];
};

export type VersionRow = {
  id: string;
  version: string;
  change: string;
  created: string;
  validation: string;
};

export type ConversationView = {
  request: string;
  reply: string;
  artifact: ArtifactFile;
  sourcesLabel: string;
  draft: string;
};

export type DocumentWorkspaceView = {
  heading: Heading;
  /** Second caption line under the heading (working draft only). */
  caption?: string;
  conversation: ConversationView;
  panelTitle: string;
  pages: readonly DocumentPageView[];
  versions: readonly VersionRow[];
  sources: readonly DetailItem[];
  suggestion: RevisionSuggestion;
  commentThread: CommentThreadView;
  blockTypes: readonly DetailItem[];
};

/** Where a document workspace opens: a page (0-based) and, optionally, the comment overlay at a state. */
export type DocumentOpening = {
  pageIndex?: number;
  comments?: CommentThreadOpening;
};

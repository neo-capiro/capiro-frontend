import {
  GeneratedWebFixture,
  PdfPreviewFixture,
  PresentationFixture,
  SpreadsheetFixture,
  WordDocumentFixture,
} from "./artifacts";
import { addedReply } from "./artifacts-documents";
import type { FixtureScreen } from "./types";

/**
 * Figma 3.4 frames that show an artifact screen at another page, tab, slide or comment
 * state. Each renders the same screen opened at that state; navigation stays local.
 */
export const artifactPageScreens: readonly FixtureScreen[] = [
  {
    slug: "word-document-page-2",
    figmaId: "03.02A",
    figmaNode: "3031:28357",
    title: "DOCX brief page 2",
    Screen: () => <WordDocumentFixture opening={{ pageIndex: 1 }} />,
  },
  {
    slug: "word-document-page-3",
    figmaId: "03.02B",
    figmaNode: "3031:28703",
    title: "DOCX brief page 3",
    Screen: () => <WordDocumentFixture opening={{ pageIndex: 2 }} />,
  },
  {
    slug: "word-document-page-4",
    figmaId: "03.02C",
    figmaNode: "3031:29048",
    title: "DOCX brief page 4",
    Screen: () => <WordDocumentFixture opening={{ pageIndex: 3 }} />,
  },
  {
    slug: "pdf-preview-page-2",
    figmaId: "03.03A",
    figmaNode: "3031:33544",
    title: "PDF brief page 2",
    Screen: () => <PdfPreviewFixture pageIndex={1} />,
  },
  {
    slug: "pdf-preview-page-3",
    figmaId: "03.03B",
    figmaNode: "3031:33809",
    title: "PDF brief page 3",
    Screen: () => <PdfPreviewFixture pageIndex={2} />,
  },
  {
    slug: "pdf-preview-page-4",
    figmaId: "03.03C",
    figmaNode: "3031:34074",
    title: "PDF brief page 4",
    Screen: () => <PdfPreviewFixture pageIndex={3} />,
  },
  {
    slug: "spreadsheet-source-data",
    figmaId: "03.04A",
    figmaNode: "3026:32155",
    title: "Spreadsheet source data",
    Screen: () => <SpreadsheetFixture tab="source" />,
  },
  {
    slug: "spreadsheet-references",
    figmaId: "03.04B",
    figmaNode: "3026:32465",
    title: "Spreadsheet references",
    Screen: () => <SpreadsheetFixture tab="references" />,
  },
  {
    slug: "presentation-slide-2",
    figmaId: "03.05A",
    figmaNode: "3031:34357",
    title: "Presentation slide 2",
    Screen: () => <PresentationFixture slideIndex={1} />,
  },
  {
    slug: "presentation-slide-3",
    figmaId: "03.05B",
    figmaNode: "3031:34599",
    title: "Presentation slide 3",
    Screen: () => <PresentationFixture slideIndex={2} />,
  },
  {
    slug: "presentation-slide-4",
    figmaId: "03.05C",
    figmaNode: "3031:34846",
    title: "Presentation slide 4",
    Screen: () => <PresentationFixture slideIndex={3} />,
  },
  {
    slug: "presentation-slide-5",
    figmaId: "03.05D",
    figmaNode: "3031:35087",
    title: "Presentation slide 5",
    Screen: () => <PresentationFixture slideIndex={4} />,
  },
  {
    slug: "presentation-slide-6",
    figmaId: "03.05E",
    figmaNode: "3031:35328",
    title: "Presentation slide 6",
    Screen: () => <PresentationFixture slideIndex={5} />,
  },
  {
    slug: "web-verification-activity",
    figmaId: "03.07A",
    figmaNode: "3026:32814",
    title: "Generated web verification activity",
    Screen: () => <GeneratedWebFixture tab="activity" />,
  },
  {
    slug: "document-comment-reply",
    figmaId: "13.24",
    figmaNode: "3045:34297",
    title: "Reply to document comment",
    Screen: () => (
      <WordDocumentFixture opening={{ comments: { state: "reply" } }} />
    ),
  },
  {
    slug: "document-comment-reply-added",
    figmaId: "13.25",
    figmaNode: "3045:34315",
    title: "Document comment reply added",
    Screen: () => (
      <WordDocumentFixture
        opening={{ comments: { state: "replied", replies: [addedReply] } }}
      />
    ),
  },
  {
    slug: "document-comment-resolved",
    figmaId: "13.26",
    figmaNode: "3045:34333",
    title: "Document comment resolved",
    Screen: () => (
      <WordDocumentFixture
        opening={{ comments: { state: "resolved", replies: [addedReply] } }}
      />
    ),
  },
  {
    slug: "document-comment-reopened",
    figmaId: "13.27",
    figmaNode: "3064:35947",
    title: "Comment reopened",
    Screen: () => (
      <WordDocumentFixture
        opening={{ comments: { state: "reopened", replies: [addedReply] } }}
      />
    ),
  },
  {
    slug: "document-comment-open-thread",
    figmaId: "13.28",
    figmaNode: "3064:35975",
    title: "Comment thread with reply",
    Screen: () => (
      <WordDocumentFixture
        opening={{ comments: { state: "open", replies: [addedReply] } }}
      />
    ),
  },
  {
    slug: "artifact-sharing-from-document",
    figmaId: "04.08B",
    figmaNode: "3064:40201",
    title: "Artifact sharing opened from document workspace",
    Screen: () => <WordDocumentFixture opening={{ share: true }} />,
  },
  {
    slug: "download-pdf",
    figmaId: "Overlay · Download PDF",
    figmaNode: "3064:40166",
    title: "Download PDF",
    Screen: () => <PdfPreviewFixture downloadOnLoad />,
  },
];

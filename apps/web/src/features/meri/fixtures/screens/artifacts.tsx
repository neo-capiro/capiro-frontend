import { AnalysisOutputsScreen } from "../../screens/artifacts/AnalysisOutputsScreen";
import { DocumentWorkspaceScreen } from "../../screens/artifacts/DocumentWorkspaceScreen";
import {
  GeneratedWebScreen,
  type GeneratedWebTab,
} from "../../screens/artifacts/GeneratedWebScreen";
import { PdfPreviewScreen } from "../../screens/artifacts/PdfPreviewScreen";
import { PresentationPreviewScreen } from "../../screens/artifacts/PresentationPreviewScreen";
import { ReviseArtifactScreen } from "../../screens/artifacts/ReviseArtifactScreen";
import {
  SpreadsheetPreviewScreen,
  type SpreadsheetTab,
} from "../../screens/artifacts/SpreadsheetPreviewScreen";
import type { DocumentOpening } from "../../screens/artifacts/types";
import { VersionsScreen } from "../../screens/artifacts/VersionsScreen";
import { WorkspaceFilesScreen } from "../../screens/artifacts/WorkspaceFilesScreen";
import {
  pdfPreview,
  versionRows,
  wordDocument,
  workingDraft,
} from "./artifacts-documents";
import { presentation, spreadsheet } from "./artifacts-previews";
import { generatedWeb } from "./artifacts-web";
import { workspaceFiles } from "./artifacts-workspace";
import {
  clientUpdateFlow,
  fundingAnalysisFlow,
  signalSummaryFlow,
} from "./files-flows";
import { documentSharing } from "./files-sharing";
import { fixtureHref, fixtureUnavailable } from "./href";
import type { FixtureScreen } from "./types";

/**
 * 03.02 Word document workspace; its page (03.02A to C), comment (13.24 to 13.28) and
 * sharing (04.08B) frames open it elsewhere.
 */
export function WordDocumentFixture({
  opening,
}: {
  opening?: DocumentOpening;
}) {
  return (
    <DocumentWorkspaceScreen
      view={wordDocument}
      editable={false}
      unavailable={fixtureUnavailable}
      opening={opening}
      sharing={documentSharing}
      links={{
        download: fixtureHref("download-artifact"),
        revise: fixtureHref("revise-artifact"),
        file: fixtureHref("file-to-client"),
        edit: fixtureHref("document-working-draft"),
        versions: fixtureHref("artifact-versions"),
      }}
    />
  );
}

/** 03.03 PDF preview, opened at a later page by 03.03A to C or with Overlay · Download PDF open. */
export function PdfPreviewFixture({
  pageIndex,
  downloadOnLoad,
}: {
  pageIndex?: number;
  downloadOnLoad?: boolean;
}) {
  return (
    <PdfPreviewScreen
      reviseHref={fixtureHref("revise-artifact")}
      unavailable={fixtureUnavailable}
      view={pdfPreview}
      initialPageIndex={pageIndex}
      downloadOnLoad={downloadOnLoad}
    />
  );
}

/** 03.04 Spreadsheet preview, opened on another tab by 03.04A and 03.04B. */
export function SpreadsheetFixture({ tab }: { tab?: SpreadsheetTab }) {
  return (
    <SpreadsheetPreviewScreen
      unavailable={fixtureUnavailable}
      view={spreadsheet}
      flow={fundingAnalysisFlow}
      initialTab={tab}
    />
  );
}

/** 03.05 Presentation preview, opened at a later slide by 03.05A to E. */
export function PresentationFixture({ slideIndex }: { slideIndex?: number }) {
  return (
    <PresentationPreviewScreen
      unavailable={fixtureUnavailable}
      view={presentation}
      flow={clientUpdateFlow}
      initialSlideIndex={slideIndex}
    />
  );
}

/** 03.06 generated web artifact on one of its tabs (03.06, 03.07, 03.07A). */
export function GeneratedWebFixture({ tab }: { tab: GeneratedWebTab }) {
  return (
    <GeneratedWebScreen
      view={generatedWeb}
      flow={signalSummaryFlow}
      initialTab={tab}
      unavailable={fixtureUnavailable}
    />
  );
}

/** Figma 3.4 03 · Artifacts frames and the document working draft, with synthetic data. */
export const artifactScreens: readonly FixtureScreen[] = [
  {
    slug: "workspace-files",
    figmaId: "03.01",
    figmaNode: "1064:145204",
    title: "Workspace files",
    Screen: () => (
      <WorkspaceFilesScreen
        unavailable={fixtureUnavailable}
        view={workspaceFiles}
      />
    ),
  },
  {
    slug: "word-document",
    figmaId: "03.02",
    figmaNode: "1064:145316",
    title: "Word document workspace",
    Screen: () => <WordDocumentFixture />,
  },
  {
    slug: "document-working-draft",
    figmaId: "Meri · Document working draft · Desktop",
    figmaNode: "1064:150330",
    title: "Document working draft",
    Screen: () => (
      <DocumentWorkspaceScreen
        view={workingDraft}
        editable
        unavailable={fixtureUnavailable}
        links={{
          back: fixtureHref("word-document"),
          versions: fixtureHref("artifact-versions"),
        }}
      />
    ),
  },
  {
    slug: "pdf-preview",
    figmaId: "03.03",
    figmaNode: "1064:145426",
    title: "PDF and multi-page preview",
    Screen: () => <PdfPreviewFixture />,
  },
  {
    slug: "spreadsheet-preview",
    figmaId: "03.04",
    figmaNode: "1064:145539",
    title: "Spreadsheet preview",
    Screen: () => <SpreadsheetFixture />,
  },
  {
    slug: "presentation-preview",
    figmaId: "03.05",
    figmaNode: "1064:145690",
    title: "Presentation preview",
    Screen: () => <PresentationFixture />,
  },
  {
    slug: "generated-web-preview",
    figmaId: "03.06",
    figmaNode: "1064:145787",
    title: "Generated web preview",
    Screen: () => <GeneratedWebFixture tab="preview" />,
  },
  {
    slug: "code-activity",
    figmaId: "03.07",
    figmaNode: "1064:145886",
    title: "Code and execution activity",
    Screen: () => <GeneratedWebFixture tab="code" />,
  },
  {
    slug: "analysis-outputs",
    figmaId: "03.08",
    figmaNode: "1064:145939",
    title: "Analysis outputs",
    Screen: () => (
      <AnalysisOutputsScreen
        unavailable={fixtureUnavailable}
        view={{
          heading: {
            title: "Commitment analysis",
            description:
              "Reproducible analysis · Inputs and results kept together",
          },
          outputs: [
            {
              id: "csv",
              name: "commitments.csv",
              detail: "CSV · 2 rows · Verified · 4 KB",
            },
            {
              id: "notebook",
              name: "analysis.ipynb",
              detail: "Notebook · Inputs and calculations · 24 KB",
            },
            {
              id: "bundle",
              name: "analysis-bundle.zip",
              detail: "ZIP · Notebook, inputs and outputs · 1.2 MB",
            },
          ],
          metric: {
            label: "Open commitments",
            value: "2",
            detail: "1 overdue · 1 due tomorrow",
          },
          commitments: [
            {
              id: "restoration",
              commitment: "Restoration request",
              due: "8 Oct",
              status: "Overdue",
            },
            {
              id: "brief",
              commitment: "Client brief",
              due: "10 Oct",
              status: "Open",
            },
          ],
          provenance:
            "Authorized client tasks · Retrieved 9 Oct, 10:44 AM · All result pages read.",
        }}
      />
    ),
  },
  {
    slug: "artifact-versions",
    figmaId: "03.09",
    figmaNode: "1064:146038",
    title: "Versions and comparison",
    Screen: () => (
      <VersionsScreen
        unavailable={fixtureUnavailable}
        view={{
          heading: {
            title: "Meeting brief · Versions",
            description: "Each revision keeps the original output available.",
          },
          rows: versionRows,
          comparison: [
            {
              id: "v1",
              title: "v1 · Original",
              summary: "Initial draft",
              section: "Recommendations",
              text: "Review the funding position, discuss the open restoration request, and consider a broader sequence of outreach.",
              status: "Sources preserved",
            },
            {
              id: "v2",
              title: "v2 · Current",
              summary: "Recommendations tightened",
              section: "Recommendations",
              text: "Confirm the funding priorities. Assign an owner to the restoration request. Agree on the brief’s delivery date.",
              status: "Sources preserved",
              previewHref: fixtureHref("word-document"),
            },
          ],
          lineage: {
            title: "Version 2 was derived from version 1",
            detail:
              "No changes were made to the original. Both versions retain their contributing sources.",
          },
          reviseHref: fixtureHref("revise-artifact"),
        }}
      />
    ),
  },
  {
    slug: "revise-artifact",
    figmaId: "03.10",
    figmaNode: "1064:146126",
    title: "Revise an artifact",
    Screen: () => (
      <ReviseArtifactScreen
        unavailable={fixtureUnavailable}
        view={{
          heading: {
            title: "Revise meeting brief",
            description:
              "Starting from version 2 · Original versions preserved",
          },
          request:
            "Add a one-page executive summary and move source details to the appendix.",
          versions: [
            { id: "v2", label: "v2 · Verified · Today, 10:47 AM" },
            { id: "v1", label: "v1 · Verified · Today, 10:45 AM" },
          ],
          keep: "Source links, client scope and original files",
          formats: ["DOCX", "PDF"],
          nextVersion: 3,
          process: [
            {
              id: "create",
              label: "Create new version",
              detail: "v3 is derived from v2",
            },
            {
              id: "check",
              label: "Check layout and evidence",
              detail: "Pages, citations and supported content are validated",
            },
            {
              id: "publish",
              label: "Publish after verification",
              detail: "The previous versions remain available",
            },
          ],
        }}
      />
    ),
  },
];

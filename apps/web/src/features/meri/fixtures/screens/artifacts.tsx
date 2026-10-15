import { AnalysisOutputsScreen } from "../../screens/artifacts/AnalysisOutputsScreen";
import { DocumentWorkspaceScreen } from "../../screens/artifacts/DocumentWorkspaceScreen";
import { GeneratedWebScreen } from "../../screens/artifacts/GeneratedWebScreen";
import { PdfPreviewScreen } from "../../screens/artifacts/PdfPreviewScreen";
import { PresentationPreviewScreen } from "../../screens/artifacts/PresentationPreviewScreen";
import { ReviseArtifactScreen } from "../../screens/artifacts/ReviseArtifactScreen";
import { SpreadsheetPreviewScreen } from "../../screens/artifacts/SpreadsheetPreviewScreen";
import { VersionsScreen } from "../../screens/artifacts/VersionsScreen";
import {
  WorkspaceFilesScreen,
  type WorkspaceFilesView,
} from "../../screens/artifacts/WorkspaceFilesScreen";
import {
  pdfPreview,
  versionRows,
  wordDocument,
  workingDraft,
} from "./artifacts-documents";
import { generatedWeb, presentation, spreadsheet } from "./artifacts-previews";
import {
  clientUpdateFlow,
  fundingAnalysisFlow,
  signalSummaryFlow,
} from "./files-flows";
import { fixtureHref, fixtureUnavailable } from "./href";
import type { FixtureScreen } from "./types";

/** 03.01 workspace contents, with entry points to the 04 · Files flows. */
const workspaceFiles: WorkspaceFilesView = {
  heading: {
    title: "Files",
    description: "Anduril meeting brief · 7 files in this workspace",
  },
  files: [
    {
      id: "brief",
      name: "meeting-brief-v2.docx",
      detail: "DOCX · 4 pages · 184 KB · v2",
      version: "v2",
      status: "Verified",
      openHref: fixtureHref("word-document"),
      fileHref: fixtureHref("file-to-client"),
    },
    {
      id: "funding",
      name: "funding-analysis.xlsx",
      detail: "XLSX · 1 sheet · 38 KB · v1",
      version: "v1",
      status: "Verified",
      openHref: fixtureHref("spreadsheet-preview"),
    },
    {
      id: "update",
      name: "client-update.pptx",
      detail: "PPTX · 6 slides · 2.1 MB · v1",
      version: "v1",
      status: "Verified",
      openHref: fixtureHref("presentation-preview"),
    },
    {
      id: "commitments",
      name: "commitments.csv",
      detail: "CSV · 2 rows · Verified · 4 KB",
      version: "Working",
      status: "Verified",
      openHref: fixtureHref("analysis-outputs"),
    },
    {
      id: "notes",
      name: "meeting-notes.pdf",
      detail: "PDF · Input · 2 pages · 96 KB",
    },
    {
      id: "funding-update",
      name: "funding-update.pdf",
      detail: "PDF · Input · 6 pages · 410 KB",
    },
    {
      id: "index",
      name: "source-index.json",
      detail: "JSON · Working · 12 KB",
    },
  ],
  groups: [
    {
      id: "inputs",
      label: "Inputs",
      fileIds: ["notes", "funding-update"],
    },
    {
      id: "working",
      label: "Working",
      fileIds: ["index", "commitments"],
    },
    {
      id: "published",
      label: "Published",
      fileIds: ["brief", "funding", "update"],
    },
  ],
  initialFileId: "brief",
  versionsHref: fixtureHref("artifact-versions"),
  uploadHref: fixtureHref("attach-files"),
  attachHref: fixtureHref("attach-capiro-file"),
};

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
    Screen: () => (
      <DocumentWorkspaceScreen
        view={wordDocument}
        editable={false}
        unavailable={fixtureUnavailable}
        links={{
          download: fixtureHref("download-artifact"),
          revise: fixtureHref("revise-artifact"),
          file: fixtureHref("file-to-client"),
          edit: fixtureHref("document-working-draft"),
          versions: fixtureHref("artifact-versions"),
        }}
      />
    ),
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
    Screen: () => (
      <PdfPreviewScreen
        reviseHref={fixtureHref("revise-artifact")}
        unavailable={fixtureUnavailable}
        view={pdfPreview}
      />
    ),
  },
  {
    slug: "spreadsheet-preview",
    figmaId: "03.04",
    figmaNode: "1064:145539",
    title: "Spreadsheet preview",
    Screen: () => (
      <SpreadsheetPreviewScreen
        unavailable={fixtureUnavailable}
        view={spreadsheet}
        flow={fundingAnalysisFlow}
      />
    ),
  },
  {
    slug: "presentation-preview",
    figmaId: "03.05",
    figmaNode: "1064:145690",
    title: "Presentation preview",
    Screen: () => (
      <PresentationPreviewScreen
        unavailable={fixtureUnavailable}
        view={presentation}
        flow={clientUpdateFlow}
      />
    ),
  },
  {
    slug: "generated-web-preview",
    figmaId: "03.06",
    figmaNode: "1064:145787",
    title: "Generated web preview",
    Screen: () => (
      <GeneratedWebScreen
        view={generatedWeb}
        flow={signalSummaryFlow}
        initialTab="preview"
        unavailable={fixtureUnavailable}
      />
    ),
  },
  {
    slug: "code-activity",
    figmaId: "03.07",
    figmaNode: "1064:145886",
    title: "Code and execution activity",
    Screen: () => (
      <GeneratedWebScreen
        view={generatedWeb}
        flow={signalSummaryFlow}
        initialTab="code"
        unavailable={fixtureUnavailable}
      />
    ),
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

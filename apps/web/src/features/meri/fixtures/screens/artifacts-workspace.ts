import type { WorkspaceFilesView } from "../../screens/artifacts/WorkspaceFilesScreen";
import { fixtureHref } from "./href";

/** 03.01 workspace contents, with entry points to the 04 · Files flows. */
export const workspaceFiles: WorkspaceFilesView = {
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

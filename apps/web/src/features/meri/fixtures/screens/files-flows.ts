import type { FieldRow } from "../../ui/FieldTable";
import type { ArtifactFlowView, DownloadView } from "../../screens/files/types";

/** Synthetic exact-version filing and download data for the Figma 3.4 04 · Files flows. */

const filingRows = (fileName: string): readonly FieldRow[] => [
  { label: "Artifact", value: `${fileName} · Immutable v1` },
  { label: "Client", value: "Anduril" },
  { label: "Destination", value: "Documents / Meri outputs" },
  {
    label: "Effective audience",
    value: "Users with access to all contributing sources",
  },
  { label: "Expiry", value: "Today, 11:30 AM" },
  { label: "Retry", value: "Return the existing filing receipt" },
];

const recorded = {
  filed: {
    destination: "Anduril / Documents / Meri outputs",
    approvedBy: "Jordan Clayton",
  },
  downloadedVersion: 1,
};

const exactVersion = "Exact immutable version 1 · Verified";
const bundle = {
  id: "bundle",
  label: "Permitted source bundle",
  detail: "Output and permitted supporting files · ZIP",
};

const download = (
  fileName: string,
  options: DownloadView["options"],
): DownloadView => ({
  title: fileName,
  description: exactVersion,
  options,
  note: "Downloads use this selected version and recheck your current access. They do not include restricted source files.",
});

export const fundingAnalysisFlow: ArtifactFlowView = {
  kind: "spreadsheet",
  name: "funding analysis",
  fileName: "funding-analysis.xlsx",
  version: 1,
  request:
    "Add a chart of year-over-year changes and keep the source references.",
  filing: filingRows("funding-analysis.xlsx"),
  download: download("funding-analysis.xlsx", [
    { id: "xlsx", label: "XLSX workbook", detail: "Editable XLSX · 38 KB" },
    bundle,
  ]),
  recorded,
};

export const clientUpdateFlow: ArtifactFlowView = {
  kind: "presentation",
  name: "client update",
  fileName: "client-update.pptx",
  version: 1,
  request: "Shorten the overview and add a slide with the open commitments.",
  filing: filingRows("client-update.pptx"),
  download: download("client-update.pptx", [
    { id: "pptx", label: "Editable PPTX", detail: "6 slides · 2.1 MB" },
    { id: "pdf", label: "Rendered PDF", detail: "6 pages · PDF" },
    bundle,
  ]),
  recorded,
};

export const signalSummaryFlow: ArtifactFlowView = {
  kind: "web",
  name: "signal summary",
  fileName: "signal-summary.html",
  version: 1,
  request: "Make the summary more concise and improve its small-screen layout.",
  filing: filingRows("signal-summary.html"),
  download: download("signal-summary.html", [
    { id: "html", label: "HTML file", detail: "Static generated page · HTML" },
    {
      id: "source",
      label: "Source bundle",
      detail: "Page source and permitted supporting files · ZIP",
    },
  ]),
  recorded,
};

/** 04.05 and 04.07: the meeting brief's exact version 2 formats. */
export const meetingBriefDownload: DownloadView = {
  title: "Download meeting brief",
  description: "Version 2 · Verified · 4 pages",
  options: [
    { id: "docx", label: "Word document", detail: "Editable DOCX · 184 KB" },
    { id: "pdf", label: "PDF document", detail: "Rendered PDF · 312 KB" },
    { id: "bundle", label: "Source bundle", detail: bundle.detail },
  ],
  note: "Downloads use this selected version and recheck your current access. They do not include restricted source files.",
};

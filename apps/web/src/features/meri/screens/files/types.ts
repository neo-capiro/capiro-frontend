/** View data for the Figma 3.4 04 · Files screens and artifact sheets; presentation shapes only, never authority. */
import type { FieldRow } from "../../ui/FieldTable";

export type Heading = { title: string; description: string };

/** A file attached to a local draft, from the device or from an authorized Capiro location. */
export type AttachedFile = {
  id: string;
  name: string;
  mediaType: string;
  origin: "upload" | "capiro";
};

/** One step of a revision pipeline; done steps show a check, the rest a clock. */
export type PipelineStep = {
  id: string;
  title: string;
  detail: string;
  done?: boolean;
};

/** One exact-version download format offered for an artifact. */
export type DownloadOption = { id: string; label: string; detail: string };

/** The exact version a download dialog offers, with its formats. */
export type DownloadView = {
  title: string;
  description: string;
  options: readonly DownloadOption[];
  note?: string;
};

/** Artifact kinds that carry revise, file, revision-progress and filed sheets. */
export type ArtifactKind = "spreadsheet" | "presentation" | "web";

/** One artifact's revise, file and download data; the sheets derive their copy from it and its kind. */
export type ArtifactFlowView = {
  kind: ArtifactKind;
  /** Lower-case display name used in sheet titles, e.g. "funding analysis". */
  name: string;
  fileName: string;
  version: number;
  request: string;
  filing: readonly FieldRow[];
  download: DownloadView;
  /** Already-recorded results from the trusted service, shown on request. */
  recorded: {
    filed: { destination: string; approvedBy: string };
    downloadedVersion: number;
  };
};

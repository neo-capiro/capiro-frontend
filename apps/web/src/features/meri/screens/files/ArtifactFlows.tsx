"use client";
import { useRef, useState } from "react";
import { Check, ChevronDown, Clock, FileText, Sparkle } from "lucide-react";
import ui from "../../ui/meri-ui.module.css";
import { DownloadDialog } from "./DownloadDialog";
import { FiledOutcomeSheet } from "./FiledOutcomeSheet";
import { FileSheet } from "./FileSheet";
import { ReceiptToasts } from "./ReceiptToasts";
import { RevisionProgressSheet } from "./RevisionProgressSheet";
import { ReviseSheet } from "./ReviseSheet";
import type { ArtifactFlowView } from "./types";
import styles from "./files.module.css";

/** Which artifact sheet or recorded outcome is open over the artifact preview. */
export type ArtifactSheet =
  | "download"
  | "revise"
  | "file"
  | "progress"
  | "filed"
  | "download-ready";

/**
 * Local open state for one artifact's sheets; only one is open at a time.
 * Dialogs restore focus themselves; the recorded-download toast returns it here.
 */
export function useArtifactSheet() {
  const [sheet, setSheet] = useState<ArtifactSheet | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const open = (next: ArtifactSheet) => {
    const active = document.activeElement;
    opener.current = active instanceof HTMLElement ? active : null;
    setSheet(next);
  };
  const close = () => {
    if (sheet === "download-ready") opener.current?.focus();
    setSheet(null);
  };
  return { sheet, open, close };
}

/**
 * ArtifactActions row for an artifact with revise and filing sheets: download,
 * revise and file open their sheets; the recorded-activity group reopens
 * results the trusted service has already recorded for this artifact.
 */
export function ArtifactFlowActions({
  flow,
  onOpen,
}: {
  flow: ArtifactFlowView;
  onOpen: (sheet: ArtifactSheet) => void;
}) {
  const sheetButton = (sheet: ArtifactSheet) => ({
    type: "button" as const,
    "aria-haspopup": "dialog" as const,
    onClick: () => onOpen(sheet),
  });
  return (
    <div className={styles.flowBar}>
      <div className={ui.row} role="group" aria-label="Artifact actions">
        <button className={ui.outline} {...sheetButton("download")}>
          <ChevronDown aria-hidden /> Download
        </button>
        <button className={ui.outline} {...sheetButton("revise")}>
          <Sparkle aria-hidden /> Revise
        </button>
        <button className={ui.primary} {...sheetButton("file")}>
          <FileText aria-hidden /> File to client
        </button>
      </div>
      <div className={ui.row} role="group" aria-label="Recorded activity">
        <button className={ui.ghost} {...sheetButton("progress")}>
          <Clock aria-hidden /> {`Revising v${flow.version + 1}`}
        </button>
        <button className={ui.ghost} {...sheetButton("filed")}>
          <Check aria-hidden /> {`Filed v${flow.version}`}
        </button>
        <button
          type="button"
          className={ui.ghost}
          onClick={() => onOpen("download-ready")}
        >
          <ChevronDown aria-hidden /> Last download
        </button>
      </div>
    </div>
  );
}

/** The artifact's download, revise, file, revision-progress and filed sheets, plus the recorded download toast. */
export function ArtifactFlowSheets({
  flow,
  sheet,
  onClose,
  unavailable,
}: {
  flow: ArtifactFlowView;
  sheet: ArtifactSheet | null;
  onClose: () => void;
  unavailable: string;
}) {
  const shared = { flow, onClose, unavailable };
  return (
    <>
      <DownloadDialog
        open={sheet === "download"}
        onOpenChange={(next) => (next ? undefined : onClose())}
        view={flow.download}
        unavailable={unavailable}
        footer={
          <button type="button" className={ui.ghost} onClick={onClose}>
            Cancel
          </button>
        }
      />
      <ReviseSheet open={sheet === "revise"} {...shared} />
      <FileSheet open={sheet === "file"} {...shared} />
      <RevisionProgressSheet
        flow={flow}
        open={sheet === "progress"}
        onClose={onClose}
      />
      <FiledOutcomeSheet open={sheet === "filed"} {...shared} />
      {sheet === "download-ready" ? (
        <ReceiptToasts
          toasts={[
            {
              id: "download",
              title: "Download ready",
              detail: `${flow.fileName} · Exact version ${flow.recorded.downloadedVersion}`,
            },
          ]}
          unavailable={unavailable}
          onEmpty={onClose}
        />
      ) : null}
    </>
  );
}

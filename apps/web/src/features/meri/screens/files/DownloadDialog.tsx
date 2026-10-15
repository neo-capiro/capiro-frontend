"use client";
import type { ReactNode, RefObject } from "react";
import { ChevronDown, FileText } from "lucide-react";
import { MeriDialog } from "../../ui/MeriDialog";
import ui from "../../ui/meri-ui.module.css";
import type { DownloadView } from "./types";
import styles from "./files.module.css";

/**
 * Exact-version download dialog (04.05 and the per-artifact download overlays).
 * Each format is offered for the displayed immutable version only; delivering
 * bytes needs the trusted download service, so the format actions stay disabled.
 */
export function DownloadDialog({
  open,
  onOpenChange,
  view,
  unavailable,
  returnFocus,
  footer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  view: DownloadView;
  unavailable: string;
  returnFocus?: RefObject<HTMLElement | null>;
  /** Closing action, e.g. "Back to preview". */
  footer: ReactNode;
}) {
  return (
    <MeriDialog
      open={open}
      onOpenChange={onOpenChange}
      title={view.title}
      description={view.description}
      placement="top"
      {...(returnFocus ? { returnFocus } : {})}
    >
      <ul className={styles.optionList} aria-label="Download formats">
        {view.options.map((option) => (
          <li key={option.id} className={styles.option}>
            <FileText aria-hidden className={styles.rowIcon} />
            <div className={styles.rowCopy}>
              <p className={styles.rowTitle}>{option.label}</p>
              <p className={styles.rowDetail}>{option.detail}</p>
            </div>
            <button
              type="button"
              className={ui.outline}
              disabled
              title={unavailable}
              aria-label={`Download ${option.label}`}
            >
              <ChevronDown aria-hidden /> Download
            </button>
          </li>
        ))}
      </ul>
      {view.note ? (
        <>
          <hr className={styles.divider} />
          <p className={styles.small}>{view.note}</p>
        </>
      ) : null}
      <div className={ui.row}>{footer}</div>
    </MeriDialog>
  );
}

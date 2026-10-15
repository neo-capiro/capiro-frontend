import { FileText, X } from "lucide-react";
import { LinkAction } from "../../ui/LinkAction";
import { MeriPageHeading } from "../../ui/MeriPageHeading";
import { StatusPill } from "../../ui/StatusPill";
import ui from "../../ui/meri-ui.module.css";
import type { Heading } from "./types";
import styles from "./files.module.css";

export type ExtractionItem = {
  id: string;
  name: string;
  detail: string;
  /** Share of extraction completed, 0–100, as reported by the trusted service. */
  progress: number;
  status: "Ready" | "Processing";
};
export type ExtractionView = {
  heading: Heading;
  items: readonly ExtractionItem[];
};

function ExtractionCard({
  item,
  unavailable,
}: {
  item: ExtractionItem;
  unavailable: string;
}) {
  const ready = item.status === "Ready";
  return (
    <article className={styles.card} aria-label={item.name}>
      <div className={styles.cardHeader}>
        <FileText aria-hidden className={styles.fileIcon} />
        <div className={styles.rowCopy}>
          <h2 className={styles.lede}>{item.name}</h2>
          <p className={styles.small}>{item.detail}</p>
        </div>
        <span className={styles.pillSlot}>
          <StatusPill tone={ready ? "success" : "neutral"}>
            {item.status}
          </StatusPill>
        </span>
      </div>
      <div
        className={styles.track}
        role="progressbar"
        aria-label={`${item.name} extraction`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={item.progress}
      >
        <span style={{ width: `${item.progress}%` }} />
      </div>
      {ready ? null : (
        <button type="button" className={ui.ghost} disabled title={unavailable}>
          <X aria-hidden /> Cancel processing
        </button>
      )}
    </article>
  );
}

/** 04.03 Upload and extraction progress: per-file extraction state reported by the trusted service. */
export function ExtractionScreen({
  view,
  unavailable,
}: {
  view: ExtractionView;
  unavailable: string;
}) {
  return (
    <div className={`${ui.page} ${styles.screen}`}>
      <MeriPageHeading
        title={view.heading.title}
        description={view.heading.description}
      />
      <div className={ui.row}>
        <LinkAction variant="outline" unavailable={unavailable}>
          Extraction details
        </LinkAction>
      </div>
      {view.items.map((item) => (
        <ExtractionCard key={item.id} item={item} unavailable={unavailable} />
      ))}
      <div className={ui.row} role="group" aria-label="Upload outcome">
        <button
          type="button"
          className={ui.primary}
          disabled
          title={unavailable}
        >
          Continue with ready files
        </button>
        <LinkAction variant="outline" unavailable={unavailable}>
          View processing issues
        </LinkAction>
      </div>
    </div>
  );
}

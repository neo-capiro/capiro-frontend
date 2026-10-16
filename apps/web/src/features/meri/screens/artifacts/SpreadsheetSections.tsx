import { StatusPill } from "../../ui/StatusPill";
import ui from "../../ui/meri-ui.module.css";
import shared from "./artifacts.module.css";
import styles from "./previews.module.css";

export type ComparisonChartView = {
  title: string;
  bars: readonly { label: string; value: number }[];
};

/** Workbook explanation shown on the References tab (Figma 03.04B). */
export type WorkbookNote = { title: string; status: string; detail: string };

/** FY26 to FY27 bar comparison, with the values repeated for assistive technology. */
export function ComparisonChart({ chart }: { chart: ComparisonChartView }) {
  const max = Math.max(...chart.bars.map((bar) => bar.value), 1);
  return (
    <figure className={styles.chart}>
      <figcaption className={shared.panelTitle}>{chart.title}</figcaption>
      <div className={styles.bars} aria-hidden>
        {chart.bars.map((bar) => (
          <div key={bar.label} className={styles.bar}>
            <span style={{ height: `${(bar.value / max) * 138}px` }} />
            <span>{`${bar.label} · ${bar.value}`}</span>
          </div>
        ))}
      </div>
      <ul className="sr-only">
        {chart.bars.map((bar) => (
          <li key={bar.label}>{`Program ${bar.label}: ${bar.value}`}</li>
        ))}
      </ul>
    </figure>
  );
}

/** 03.04B References: what the workbook's inputs are, and a way back to the summary. */
export function WorkbookReferences({
  note,
  onBack,
}: {
  note: WorkbookNote;
  onBack: () => void;
}) {
  return (
    <section
      className={`${shared.card} ${styles.workbookNote}`}
      aria-label={note.title}
    >
      <h2 className={shared.panelTitle}>{note.title}</h2>
      <StatusPill>{note.status}</StatusPill>
      <p className={`${shared.body} ${styles.muted}`}>{note.detail}</p>
      <button type="button" className={ui.outline} onClick={onBack}>
        Back to Summary
      </button>
    </section>
  );
}

"use client";
import { useState } from "react";
import { Sparkle } from "lucide-react";
import { MeriPageHeading } from "../../ui/MeriPageHeading";
import { SegmentedTabs } from "../../ui/SegmentedTabs";
import { StatusPill } from "../../ui/StatusPill";
import ui from "../../ui/meri-ui.module.css";
import {
  ArtifactFlowActions,
  ArtifactFlowSheets,
  useArtifactSheet,
} from "../files/ArtifactFlows";
import type { ArtifactFlowView } from "../files/types";
import { DetailList } from "./DetailList";
import {
  cellReference,
  SheetGrid,
  type CellPosition,
  type SheetCell,
} from "./SheetGrid";
import type { DetailItem, Heading } from "./types";
import shared from "./artifacts.module.css";
import styles from "./previews.module.css";

export type SpreadsheetView = {
  heading: Heading;
  sheetLabel: string;
  columns: readonly string[];
  rows: readonly (readonly SheetCell[])[];
  initialCell: CellPosition;
  chart: { title: string; bars: readonly { label: string; value: number }[] };
  checks: readonly DetailItem[];
  sourceData: readonly DetailItem[];
  references: readonly DetailItem[];
};
type Tab = "summary" | "source" | "references";
const tabs = [
  { id: "summary", label: "Summary" },
  { id: "source", label: "Source data" },
  { id: "references", label: "References" },
] as const;

function ComparisonChart({ chart }: { chart: SpreadsheetView["chart"] }) {
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

/** 03.04 Spreadsheet preview: formula bar, read-only grid, chart and workbook checks. */
export function SpreadsheetPreviewScreen({
  view,
  flow,
  unavailable,
}: {
  view: SpreadsheetView;
  /** Revise, file and download sheets for this workbook. */
  flow: ArtifactFlowView;
  unavailable: string;
}) {
  const sheets = useArtifactSheet();
  const [cell, setCell] = useState(view.initialCell);
  const [tab, setTab] = useState<Tab>("summary");
  const current = view.rows[cell.row]?.[cell.col];
  return (
    <div className={`${ui.page} ${shared.screen}`}>
      <MeriPageHeading
        title={view.heading.title}
        description={view.heading.description}
      />
      <ArtifactFlowActions flow={flow} onOpen={sheets.open} />
      <div
        className={styles.formulaBar}
        role="status"
        aria-label="Selected cell"
      >
        <StatusPill>{cellReference(cell)}</StatusPill>
        <span>{`ƒx   ${current?.formula ?? current?.value ?? ""}`}</span>
      </div>
      <SheetGrid
        label={view.sheetLabel}
        columns={view.columns}
        rows={view.rows}
        selected={cell}
        onSelect={setCell}
      />
      <SegmentedTabs
        label="Workbook details"
        options={tabs}
        value={tab}
        onChange={setTab}
      />
      {tab === "summary" ? (
        <div className={`${shared.columns} ${shared.wideGap}`}>
          <ComparisonChart chart={view.chart} />
          <section
            className={`${shared.panel} ${shared.grow}`}
            aria-label="Workbook validation"
          >
            <DetailList label="Workbook checks" items={view.checks} tight />
            <button
              type="button"
              className={ui.outline}
              onClick={() => setTab("references")}
            >
              View source references
            </button>
            <button
              type="button"
              className={ui.primary}
              aria-haspopup="dialog"
              onClick={() => sheets.open("revise")}
            >
              <Sparkle aria-hidden /> Revise workbook
            </button>
          </section>
        </div>
      ) : (
        <DetailList
          label={tab === "source" ? "Source data" : "References"}
          items={tab === "source" ? view.sourceData : view.references}
          variant="references"
        />
      )}
      <ArtifactFlowSheets
        flow={flow}
        sheet={sheets.sheet}
        onClose={sheets.close}
        unavailable={unavailable}
      />
    </div>
  );
}

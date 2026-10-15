"use client";
import { useRef, useState } from "react";
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
import {
  ComparisonChart,
  WorkbookReferences,
  type ComparisonChartView,
  type WorkbookNote,
} from "./SpreadsheetSections";
import type { DetailItem, Heading } from "./types";
import shared from "./artifacts.module.css";
import styles from "./previews.module.css";

export type SpreadsheetTab = "summary" | "source" | "references";
export type SpreadsheetView = {
  /** Page heading for each workbook tab (03.04, 03.04A and 03.04B). */
  headings: Readonly<Record<SpreadsheetTab, Heading>>;
  sheetLabel: string;
  columns: readonly string[];
  rows: readonly (readonly SheetCell[])[];
  initialCell: CellPosition;
  chart: ComparisonChartView;
  checks: readonly DetailItem[];
  /** Formula bar caption on the Source data tab. */
  sourceCaption: string;
  references: WorkbookNote;
};
const tabs = [
  { id: "summary", label: "Summary" },
  { id: "source", label: "Source data" },
  { id: "references", label: "References" },
] as const;

/** Summary tab: comparison chart beside the workbook checks and revision entry point. */
function SummaryDetails({
  view,
  onReferences,
  onRevise,
}: {
  view: SpreadsheetView;
  onReferences: () => void;
  onRevise: () => void;
}) {
  return (
    <div className={`${shared.columns} ${shared.wideGap}`}>
      <ComparisonChart chart={view.chart} />
      <section
        className={`${shared.panel} ${shared.grow}`}
        aria-label="Workbook validation"
      >
        <DetailList label="Workbook checks" items={view.checks} tight />
        <button type="button" className={ui.outline} onClick={onReferences}>
          View source references
        </button>
        <button
          type="button"
          className={ui.primary}
          aria-haspopup="dialog"
          onClick={onRevise}
        >
          <Sparkle aria-hidden /> Revise workbook
        </button>
      </section>
    </div>
  );
}

/**
 * 03.04 Spreadsheet preview with its Source data (03.04A) and References (03.04B) tabs:
 * formula bar, read-only grid, chart, workbook checks and the inputs note.
 */
export function SpreadsheetPreviewScreen({
  view,
  flow,
  unavailable,
  initialTab = "summary",
}: {
  view: SpreadsheetView;
  /** Revise, file and download sheets for this workbook. */
  flow: ArtifactFlowView;
  unavailable: string;
  initialTab?: SpreadsheetTab;
}) {
  const sheets = useArtifactSheet();
  const [cell, setCell] = useState(view.initialCell);
  const [tab, setTab] = useState(initialTab);
  const tabsArea = useRef<HTMLDivElement>(null);
  const current = view.rows[cell.row]?.[cell.col];
  const heading = view.headings[tab];
  const grid = tab !== "references";
  const backToSummary = () => {
    setTab("summary");
    requestAnimationFrame(() =>
      tabsArea.current
        ?.querySelector<HTMLElement>('[aria-selected="true"]')
        ?.focus(),
    );
  };
  return (
    <div className={`${ui.page} ${shared.screen}`}>
      <MeriPageHeading
        title={heading.title}
        description={heading.description}
      />
      {grid ? <ArtifactFlowActions flow={flow} onOpen={sheets.open} /> : null}
      {grid ? (
        <div
          className={styles.formulaBar}
          role="status"
          aria-label="Selected cell"
        >
          <StatusPill>{cellReference(cell)}</StatusPill>
          <span>
            {tab === "source"
              ? view.sourceCaption
              : `ƒx   ${current?.formula ?? current?.value ?? ""}`}
          </span>
        </div>
      ) : null}
      {grid ? (
        <SheetGrid
          label={view.sheetLabel}
          columns={view.columns}
          rows={view.rows}
          selected={cell}
          onSelect={setCell}
        />
      ) : null}
      <div ref={tabsArea}>
        <SegmentedTabs
          label="Workbook details"
          options={tabs}
          value={tab}
          onChange={setTab}
        />
      </div>
      {tab === "summary" ? (
        <SummaryDetails
          view={view}
          onReferences={() => setTab("references")}
          onRevise={() => sheets.open("revise")}
        />
      ) : null}
      {tab === "references" ? (
        <WorkbookReferences note={view.references} onBack={backToSummary} />
      ) : null}
      <ArtifactFlowSheets
        flow={flow}
        sheet={sheets.sheet}
        onClose={sheets.close}
        unavailable={unavailable}
      />
    </div>
  );
}

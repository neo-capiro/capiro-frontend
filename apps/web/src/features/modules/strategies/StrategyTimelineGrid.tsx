"use client";

import type { StrategyReferenceRow } from "../../../shared/capiro/operations/strategies-reference";
import type {
  FirmPhase,
  StrategyDetail,
  StrategyNode,
} from "../../../shared/capiro/operations/strategies-schemas";
import styles from "./strategies.module.css";
import { quarterDate, timelineBar } from "./strategy-model";

type TimelineRow = {
  id: string;
  label: string;
  detail?: string;
  startsOn?: string;
  endsOn?: string | null;
  group?: boolean;
  tone?: "phase" | "reference" | "milestone" | "completed";
  node?: StrategyNode;
  editCalendar?: boolean;
};
function referenceRows(rows: StrategyReferenceRow[]): TimelineRow[] {
  return rows.map((row) => ({
    id: row.id,
    label: row.label,
    detail: row.startsOn
      ? `${row.startsOn.slice(0, 10)} – ${row.endsOn?.slice(0, 10) ?? "Ongoing"}`
      : row.fy
        ? `FY${row.fy}`
        : undefined,
    startsOn: row.startsOn ?? (row.fy ? quarterDate(row.fy, 1) : undefined),
    endsOn: row.endsOn ?? (row.fy ? quarterDate(row.fy + 1, 1) : null),
    tone: "reference",
    editCalendar: row.kind === "congress_milestone",
  }));
}
export function timelineRows(
  strategy: StrategyDetail,
  phases: FirmPhase[],
  congress: StrategyReferenceRow[],
  ppbe: StrategyReferenceRow[],
  flags: { ppbe: boolean; congress: boolean },
): TimelineRow[] {
  return [
    ...(flags.ppbe
      ? [
          { id: "ppbe", label: "PPBE · Read only", group: true },
          ...referenceRows(ppbe),
        ]
      : []),
    ...(flags.congress
      ? [
          { id: "congress", label: "Legislative", group: true },
          ...referenceRows(congress),
        ]
      : []),
    { id: "phases", label: "Firm phases", group: true },
    ...phases.map((phase) => ({
      id: phase.id,
      label: phase.label,
      detail: `FY${phase.startFy} Q${phase.startQ} – FY${phase.endFy} Q${phase.endQ}`,
      startsOn: quarterDate(phase.startFy, phase.startQ),
      endsOn: quarterDate(phase.endFy, phase.endQ),
      tone: "phase" as const,
    })),
    { id: "steps", label: "Strategy steps", group: true },
    ...strategy.nodes.map((node) => ({
      id: node.id,
      label: node.title,
      detail: `${node.startsOn.slice(0, 10)} · ${node.ownerUserId ? "Assigned" : "Unassigned"}`,
      startsOn: node.startsOn,
      endsOn: node.openEnded ? null : node.endsOn,
      tone:
        node.status === "completed"
          ? ("completed" as const)
          : ("milestone" as const),
      node,
    })),
  ];
}

export function TimelineGrid({
  rows,
  startFy,
  years,
  onNode,
  onCalendar,
}: {
  rows: TimelineRow[];
  startFy: number;
  years: number;
  onNode: (node: StrategyNode) => void;
  onCalendar: () => void;
}) {
  const months = [
    "Oct",
    "Nov",
    "Dec",
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
  ];
  return (
    <div className={styles.timeline}>
      <div className={styles.labels}>
        <div className={styles.timelineHeader}>
          FISCAL WINDOW
          <small>
            October {startFy - 1} – September {startFy + years - 1}
          </small>
        </div>
        {rows.map((row) =>
          row.group ? (
            <div className={styles.groupLabel} key={row.id}>
              {row.label}
            </div>
          ) : (
            <button
              className={styles.laneLabel}
              key={row.id}
              disabled={!row.node && !row.editCalendar}
              onClick={() => (row.node ? onNode(row.node) : onCalendar())}
            >
              {row.label}
              <small>{row.detail}</small>
            </button>
          ),
        )}
      </div>
      <div className={styles.timelineScroll}>
        <div className={styles.timelineCanvas} style={{ width: years * 552 }}>
          <div className={styles.years}>
            {Array.from({ length: years }, (_, index) => (
              <div className={styles.year} key={index}>
                FY{startFy + index}
              </div>
            ))}
          </div>
          <div
            className={styles.months}
            style={{ gridTemplateColumns: `repeat(${years * 12},46px)` }}
          >
            {Array.from({ length: years * 12 }, (_, index) => (
              <span key={index}>{months[index % 12]}</span>
            ))}
          </div>
          {rows.map((row) => {
            const bar = row.startsOn
              ? timelineBar(row.startsOn, row.endsOn ?? null, startFy, years)
              : undefined;
            return row.group ? (
              <div className={styles.laneGroup} key={row.id} />
            ) : (
              <div className={styles.lane} key={row.id}>
                {bar &&
                  (row.node || row.editCalendar ? (
                    <button
                      className={`${styles.bar} ${row.tone ? styles[row.tone] : ""}`}
                      style={bar}
                      onClick={() =>
                        row.node ? onNode(row.node) : onCalendar()
                      }
                      title={row.label}
                    >
                      {row.label}
                    </button>
                  ) : (
                    <span
                      className={`${styles.bar} ${row.tone ? styles[row.tone] : ""}`}
                      style={bar}
                    >
                      {row.label}
                    </span>
                  ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

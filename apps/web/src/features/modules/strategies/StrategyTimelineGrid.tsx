"use client";

import type { StrategyReferenceRow } from "../../../shared/capiro/operations/strategies-reference";
import type { FirmPhase } from "../../../shared/capiro/operations/strategies-schemas";
import styles from "./strategies.module.css";
import { quarterDate, timelineBar } from "./strategy-model";

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

export type TimelineNode = {
  id: string;
  title: string;
  startsOn: string;
  endsOn: string | null;
  openEnded?: boolean;
  ownerUserId?: string | null;
  status?: string;
};
type TimelineRow<Node extends TimelineNode = TimelineNode> = {
  id: string;
  label: string;
  detail?: string;
  startsOn?: string;
  endsOn?: string | null;
  group?: boolean;
  tone?: "phase" | "reference" | "milestone" | "completed";
  node?: Node;
  editCalendar?: boolean;
};
function referenceRows<Node extends TimelineNode>(
  rows: StrategyReferenceRow[],
): TimelineRow<Node>[] {
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
export function strategyStepRows<Node extends TimelineNode>(
  nodes: readonly Node[],
): TimelineRow<Node>[] {
  return [
    { id: "steps", label: "Strategy steps", group: true },
    ...nodes.map((node) => ({
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
export function timelineRows<Node extends TimelineNode>(
  strategy: { nodes: readonly Node[] },
  phases: FirmPhase[],
  congress: StrategyReferenceRow[],
  ppbe: StrategyReferenceRow[],
  flags: { ppbe: boolean; congress: boolean },
): TimelineRow<Node>[] {
  return [
    ...(flags.ppbe
      ? [
          { id: "ppbe", label: "PPBE · Read only", group: true },
          ...referenceRows<Node>(ppbe),
        ]
      : []),
    ...(flags.congress
      ? [
          { id: "congress", label: "Legislative", group: true },
          ...referenceRows<Node>(congress),
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
    ...strategyStepRows(strategy.nodes),
  ];
}

type TimelineActions<Node extends TimelineNode> = {
  onNode?: (node: Node) => void;
  onCalendar?: () => void;
};
function rowAction<Node extends TimelineNode>(
  row: TimelineRow<Node>,
  { onNode, onCalendar }: TimelineActions<Node>,
) {
  if (row.node && onNode) return () => onNode(row.node!);
  return row.editCalendar ? onCalendar : undefined;
}
function TimelineLane<Node extends TimelineNode>({
  row,
  startFy,
  years,
  ...actions
}: TimelineActions<Node> & {
  row: TimelineRow<Node>;
  startFy: number;
  years: number;
}) {
  if (row.group) return <div className={styles.laneGroup} />;
  const bar = row.startsOn
    ? timelineBar(row.startsOn, row.endsOn ?? null, startFy, years)
    : undefined;
  const onClick = rowAction(row, actions);
  const className = `${styles.bar} ${row.tone ? styles[row.tone] : ""}`;
  return (
    <div className={styles.lane}>
      {bar &&
        (onClick ? (
          <button
            className={className}
            style={bar}
            onClick={onClick}
            title={row.label}
          >
            {row.label}
          </button>
        ) : (
          <span className={className} style={bar}>
            {row.label}
          </span>
        ))}
    </div>
  );
}

export function TimelineGrid<Node extends TimelineNode>({
  rows,
  startFy,
  years,
  onNode,
  onCalendar,
}: {
  rows: TimelineRow<Node>[];
  startFy: number;
  years: number;
} & TimelineActions<Node>) {
  return (
    <div className={styles.timeline}>
      <div className={styles.labels}>
        <div className={styles.timelineHeader}>
          FISCAL WINDOW
          <small>
            October {startFy - 1} – September {startFy + years - 1}
          </small>
        </div>
        {rows.map((row) => {
          const onClick = rowAction(row, { onNode, onCalendar });
          return row.group ? (
            <div className={styles.groupLabel} key={row.id}>
              {row.label}
            </div>
          ) : onClick ? (
            <button className={styles.laneLabel} key={row.id} onClick={onClick}>
              {row.label}
              <small>{row.detail}</small>
            </button>
          ) : (
            <div className={styles.laneLabel} key={row.id}>
              {row.label}
              <small>{row.detail}</small>
            </div>
          );
        })}
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
          {rows.map((row) => (
            <TimelineLane
              key={row.id}
              row={row}
              startFy={startFy}
              years={years}
              onNode={onNode}
              onCalendar={onCalendar}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

import type { StrategySummary } from "../../../shared/capiro/operations/strategies-schemas";

export { STRATEGY_INTAKE_TYPE_LABELS as objectiveLabels } from "@capiro/shared/strategy-intake";
export function fiscalYear(date: Date) {
  return date.getUTCFullYear() + (date.getUTCMonth() >= 9 ? 1 : 0);
}
export function quarterDate(fy: number, quarter: number) {
  return new Date(Date.UTC(fy - 1, 9 + (quarter - 1) * 3, 1))
    .toISOString()
    .slice(0, 10);
}
export function monthOffset(date: string, startFy: number) {
  const parsed = new Date(date);
  return (
    (parsed.getUTCFullYear() - (startFy - 1)) * 12 +
    parsed.getUTCMonth() -
    9 +
    (parsed.getUTCDate() - 1) / 31
  );
}
export function timelineBar(
  startsOn: string,
  endsOn: string | null,
  startFy: number,
  years: number,
) {
  const start = monthOffset(startsOn, startFy);
  const end = endsOn ? monthOffset(endsOn, startFy) : start + 0.5;
  if (end < 0 || start >= years * 12) return undefined;
  const left = Math.max(0, start);
  const right = Math.min(years * 12, Math.max(start + 0.3, end));
  return {
    left: `${left * 46}px`,
    width: `${Math.max(12, (right - left) * 46)}px`,
  };
}
export function planStatistics(strategies: StrategySummary[]) {
  const nodes = strategies.reduce(
    (total, strategy) => total + strategy.nodeCount,
    0,
  );
  const assigned = strategies.reduce(
    (total, strategy) => total + strategy.summary.assignedCount,
    0,
  );
  return {
    withSteps: strategies.filter((strategy) => strategy.nodeCount > 0).length,
    unassigned: strategies.reduce(
      (total, strategy) => total + strategy.summary.unassignedCount,
      0,
    ),
    coverage: nodes ? Math.round((100 * assigned) / nodes) : 0,
  };
}
export function validPhaseRows(
  rows: {
    label: string;
    startFy: number;
    startQ: number;
    endFy: number;
    endQ: number;
  }[],
) {
  const labels = new Set<string>();
  return rows.every((row, index) => {
    const label = row.label.trim().toLowerCase();
    const start = row.startFy * 4 + row.startQ;
    const end = row.endFy * 4 + row.endQ;
    if (!label || labels.has(label) || start >= end) return false;
    labels.add(label);
    const previous = rows[index - 1];
    return !previous || start >= previous.startFy * 4 + previous.startQ;
  });
}

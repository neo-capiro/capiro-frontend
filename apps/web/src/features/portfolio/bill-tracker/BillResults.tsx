import { ActionButton, Badge, DataTable } from "@/shared/module-ui";
import type { ImpactRow } from "@/shared/capiro/operations/legiwatch-impact-schemas";
import { billActionDate } from "./hearings";
import styles from "./impact-tracker.module.css";

export const impactRowKey = (row: ImpactRow) =>
  JSON.stringify([row.clientId, row.billId]);
const directionLabel = {
  positive: "Positive",
  negative: "Negative",
  mixed: "Mixed",
  uncertain: "Uncertain",
};
export function ImpactBadge({ row }: { row: ImpactRow }) {
  const impact = row.impact;
  if (impact.stale) return <Badge tone="warning">Needs refresh</Badge>;
  if (impact.status !== "ready")
    return (
      <Badge>
        {impact.status === "needs_evidence" ? "Needs evidence" : "Unavailable"}
      </Badge>
    );
  return (
    <Badge
      tone={
        impact.direction === "negative"
          ? "danger"
          : impact.direction === "positive"
            ? "success"
            : "neutral"
      }
    >
      {directionLabel[impact.direction]}
    </Badge>
  );
}
export function BillResults({
  rows,
  view,
  showClient,
  onOpen,
}: {
  rows: ImpactRow[];
  view: "table" | "board";
  showClient: boolean;
  onOpen: (row: ImpactRow) => void;
}) {
  if (view === "board")
    return (
      <div className={styles.board}>
        {(["introduced", "committee", "passed", "enacted", null] as const).map(
          (stage) => (
            <section className={styles.lane} key={stage ?? "unknown"}>
              <h3>
                {stage
                  ? stage[0]!.toUpperCase() + stage.slice(1)
                  : "Stage unavailable"}
              </h3>
              {rows
                .filter((row) => row.stage === stage)
                .map((row) => (
                  <button
                    type="button"
                    className={styles.billCard}
                    key={impactRowKey(row)}
                    onClick={() => onOpen(row)}
                  >
                    <strong>{row.displayNum}</strong>
                    <span>{row.title}</span>
                    {showClient && <small>{row.clientName}</small>}
                    <ImpactBadge row={row} />
                    <small>
                      {row.position ?? "No position"} ·{" "}
                      {row.priority ?? "No priority"}
                    </small>
                  </button>
                ))}
              {!rows.some((row) => row.stage === stage) && (
                <p className={styles.muted}>No loaded bills</p>
              )}
            </section>
          ),
        )}
      </div>
    );
  return (
    <DataTable
      rows={rows}
      rowKey={impactRowKey}
      caption="Tracked bills and client impact"
      scrollRegion
      emptyMessage="No tracked bills match this view."
      columns={[
        {
          key: "bill",
          label: "Bill",
          render: (row) => (
            <ActionButton onClick={() => onOpen(row)}>
              {row.displayNum}
            </ActionButton>
          ),
        },
        ...(showClient
          ? [
              {
                key: "client",
                label: "Client",
                render: (row: ImpactRow) => row.clientName,
              },
            ]
          : []),
        {
          key: "title",
          label: "Title / latest action",
          render: (row) => (
            <div className={styles.titleCell}>
              <strong>{row.title}</strong>
              <small>
                {row.latestActionText ?? "No latest action available"}
                {row.latestActionDate
                  ? ` · ${billActionDate(row.latestActionDate) ?? row.latestActionDate}`
                  : ""}
              </small>
            </div>
          ),
        },
        {
          key: "status",
          label: "Status",
          render: (row) => row.status ?? "Unavailable",
        },
        {
          key: "position",
          label: "Position / priority",
          render: (row) => (
            <div className={styles.titleCell}>
              <span>{row.position ?? "Not set"}</span>
              <small>
                {row.priority === "med"
                  ? "Medium"
                  : (row.priority ?? "Not set")}
              </small>
            </div>
          ),
        },
        {
          key: "impact",
          label: "Client impact",
          render: (row) => (
            <div className={styles.titleCell}>
              <ImpactBadge row={row} />
              <small>
                {row.impact.status === "ready" && !row.impact.stale
                  ? `${row.impact.confidence} confidence`
                  : "Review sources"}
              </small>
            </div>
          ),
        },
      ]}
    />
  );
}

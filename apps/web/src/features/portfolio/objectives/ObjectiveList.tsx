"use client";

import { ArrowUpRight, Pencil, Trash2 } from "lucide-react";
import { statusLabels, type Objective } from "./contracts";
import styles from "./objectives.module.css";

const filters = [
  ["", "All"],
  ["draft", statusLabels.draft],
  ["in_review", statusLabels.in_review],
  ["ready", statusLabels.ready],
] as const;

export function ObjectiveStats({ records }: { records: Objective[] }) {
  const stats = [
    ["Objectives", records.length],
    // These operational totals are not present in the objective list response.
    ["Active", "—"],
    ["Strategy ready", "—"],
    ["Decisions waiting", "—"],
    ["Next cycle", "—"],
  ] as const;
  return (
    <dl className={styles.stats} aria-label="Objective summary">
      {stats.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ObjectiveList({
  records,
  filter,
  onFilter,
  busy,
  ownerNames,
  onEdit,
  onWork,
  onDelete,
}: {
  records: Objective[];
  filter: string;
  onFilter: (value: string) => void;
  busy: boolean;
  ownerNames?: Map<string, string>;
  onEdit: (id: string) => void;
  onWork: (id: string) => void;
  onDelete: (objective: Objective) => void;
}) {
  const visible = records.filter((row) => !filter || row.status === filter);
  return (
    <section className={styles.catalog} aria-label="Current objectives">
      <header className={styles.catalogHead}>
        <h2>Current objectives</h2>
      </header>
      <div className={styles.catalogFilters}>
        <div
          className={styles.filterPills}
          role="group"
          aria-label="Filter objectives"
        >
          {filters.map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={styles.filterPill}
              aria-pressed={filter === value}
              onClick={() => onFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {visible.map((objective) => (
        <ObjectiveRow
          key={objective.id}
          objective={objective}
          busy={busy}
          ownerName={
            objective.ownerUserId
              ? ownerNames?.get(objective.ownerUserId)
              : "Unassigned"
          }
          onEdit={() => onEdit(objective.id)}
          onWork={() => onWork(objective.id)}
          onDelete={() => onDelete(objective)}
        />
      ))}
      {!records.length && (
        <div className={styles.empty}>
          <h3>No current objectives</h3>
          <p>Create a draft to define the client&apos;s next outcome.</p>
        </div>
      )}
      {Boolean(records.length) && !visible.length && (
        <div className={styles.empty}>
          <h3>No objectives match this status</h3>
          <button className="button" onClick={() => onFilter("")}>
            Clear status filter
          </button>
        </div>
      )}
    </section>
  );
}

function ObjectiveRow({
  objective,
  busy,
  ownerName,
  onEdit,
  onWork,
  onDelete,
}: {
  objective: Objective;
  busy: boolean;
  ownerName?: string;
  onEdit: () => void;
  onWork: () => void;
  onDelete: () => void;
}) {
  return (
    <article className={styles.objectiveRow}>
      <div className={styles.objectiveTop}>
        <button className={styles.titleButton} disabled={busy} onClick={onEdit}>
          {objective.outcome || "Untitled objective"}
        </button>
        <span className={styles.objectiveStatus} data-status={objective.status}>
          {statusLabels[objective.status]}
        </span>
        <small
          className={styles.objectiveOwner}
          aria-label={ownerName ?? "Owner unavailable"}
          title={ownerName ?? "Owner unavailable"}
        >
          {ownerName ?? "—"}
        </small>
      </div>
      <div className={styles.objectiveFacts}>
        <span>
          <strong>Government problem</strong>
          {objective.governmentProblem || "Not defined"}
        </span>
        <span>
          <strong>Minimum win</strong>
          {objective.minimumWin || "Not defined"}
        </span>
      </div>
      <div className={styles.objectiveFoot}>
        <p>
          <strong>Readiness</strong>
          {objective.readiness.completedFields}/4 required fields
        </p>
        <div className={styles.objectiveActions}>
          <button
            type="button"
            disabled={busy}
            aria-label="Open objective"
            title="Edit objective"
            onClick={onEdit}
          >
            <Pencil size={14} aria-hidden="true" />
          </button>
          <button
            type="button"
            disabled={busy}
            aria-label="View linked work"
            title="View linked work"
            onClick={onWork}
          >
            <ArrowUpRight size={15} aria-hidden="true" />
          </button>
          <button
            type="button"
            disabled={busy}
            aria-label={`Delete ${objective.outcome || "untitled objective"}`}
            title="Delete objective"
            onClick={onDelete}
          >
            <Trash2 size={14} aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  );
}

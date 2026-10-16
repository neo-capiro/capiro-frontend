"use client";
import { FileText, Users } from "lucide-react";
import { Task, TaskContent, TaskItem, TaskTrigger } from "@capiro/ui/task";
import { MeriPageHeading } from "../../ui/MeriPageHeading";
import { DataTable, type DataColumn } from "../../ui/DataTable";
import { LinkAction } from "../../ui/LinkAction";
import { Notice } from "../../ui/Notice";
import { StatusPill, type StatusTone } from "../../ui/StatusPill";
import ui from "../../ui/meri-ui.module.css";
import styles from "./run-progress.module.css";

type Specialist = {
  id: string;
  name: string;
  status: { label: string; tone: StatusTone };
  task: string;
  progress: string;
  details: readonly string[];
};
type SharedOutput = {
  id: string;
  name: string;
  owner: string;
  status: string;
};
export type SpecialistView = {
  context: string;
  specialists: readonly Specialist[];
  limit: { title: string; detail: string };
  outputs: readonly SharedOutput[];
};

const columns: readonly DataColumn<SharedOutput>[] = [
  {
    key: "name",
    label: "Output",
    width: 1,
    render: (row) => <code className={styles.mono}>{row.name}</code>,
  },
  { key: "owner", label: "Owner", width: 1, render: (row) => row.owner },
  { key: "status", label: "Status", width: 1, render: (row) => row.status },
];

/** 02.02 Parallel specialist activity: delegated work within one run and its shared outputs. */
export function SpecialistActivityScreen({
  view,
  unavailable,
}: {
  view: SpecialistView;
  unavailable: string;
}) {
  return (
    <div className={ui.page}>
      <MeriPageHeading title="Specialists" description={view.context} />
      <div className={styles.specialists}>
        {view.specialists.map((specialist) => (
          <SpecialistCard key={specialist.id} specialist={specialist} />
        ))}
      </div>
      <Notice tone="success" title={view.limit.title}>
        {view.limit.detail}
      </Notice>
      <section className={styles.panel} aria-labelledby="shared-outputs">
        <h2 id="shared-outputs" className={styles.panelTitle}>
          Shared evidence and files
        </h2>
        <DataTable
          caption="Shared evidence and files"
          columns={columns}
          rows={view.outputs}
        />
        <LinkAction variant="outline" unavailable={unavailable}>
          <FileText aria-hidden /> Open workspace files
        </LinkAction>
      </section>
    </div>
  );
}

function SpecialistCard({ specialist }: { specialist: Specialist }) {
  return (
    <Task defaultOpen={false} className={styles.specialist}>
      <div className={styles.cardTop}>
        <Users aria-hidden className={styles.cardIcon} />
        <TaskTrigger title={`${specialist.name} details`}>
          <button
            type="button"
            className={`${ui.ghost} ${styles.details}`}
            aria-label={`${specialist.name} details`}
          >
            Details
          </button>
        </TaskTrigger>
      </div>
      <h2 className={styles.specialistName}>{specialist.name}</h2>
      <StatusPill tone={specialist.status.tone}>
        {specialist.status.label}
      </StatusPill>
      <p className={styles.body}>{specialist.task}</p>
      <p className={styles.caption}>{specialist.progress}</p>
      <TaskContent className={styles.taskContent}>
        {specialist.details.map((detail) => (
          <TaskItem key={detail} className={styles.taskItem}>
            {detail}
          </TaskItem>
        ))}
      </TaskContent>
    </Task>
  );
}

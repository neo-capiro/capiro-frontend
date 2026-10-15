"use client";
import type {
  PlannerPerson,
  PlannerProject,
  PlannerTask,
} from "../../../shared/capiro/operations/planner-schemas";
import { assigneeName, minutesLabel, statuses } from "./task-presentation";
import styles from "./task-detail.module.css";
import { MarkdownContent } from "../../../shared/markdown/MarkdownContent";
type Props = {
  task: PlannerTask;
  people: PlannerPerson[];
  projects: PlannerProject[];
};
export function TaskDetailFields({ task, people, projects }: Props) {
  return (
    <div className={styles.fields} data-slot="task-detail-fields">
      <dl className={styles.name}>
        <DetailValue label="Task name" value={task.name} />
      </dl>
      <dl className={styles.grid}>
        <DetailValue label="Assignee" value={assigneeName(task, people)} />
        <DetailValue
          label="Status"
          value={
            statuses.find((status) => status.id === task.status)?.label ??
            task.status
          }
        />
        <DetailValue label="Priority" value={task.priority} />
        <DetailValue label="Task type" value={task.subtype} />
        {task.subtype === "approval" && (
          <DetailValue
            label="Approval"
            value={task.approval.replaceAll("_", " ")}
          />
        )}
      </dl>
      <section className={styles.schedule} aria-label="Schedule">
        <h3>Schedule</h3>
        <dl className={styles.grid}>
          <DetailValue label="Start date" value={task.startOn ?? "Not set"} />
          <DetailValue label="Due date" value={task.dueOn ?? "Not set"} />
          <DetailValue label="Start time" value={task.startTime ?? "Not set"} />
          <DetailValue label="Due time" value={task.dueTime ?? "Not set"} />
          <DetailValue label="Time zone" value={task.timeZone ?? "Not set"} />
          <DetailValue
            label="Repeat"
            value={
              task.recurrence
                ? `${task.recurrence.frequency} · interval ${task.recurrence.interval}`
                : "Does not repeat"
            }
          />
          <TaskRepeatValues recurrence={task.recurrence} />
        </dl>
      </section>
      <section aria-label="Description">
        <h3>Description</h3>
        <MarkdownContent source={task.description || "No description"} />
      </section>
      <section aria-label="Projects and sections">
        <h3>Projects &amp; sections</h3>
        <dl className={styles.memberships}>
          {task.memberships.map((membership) => {
            const project = projects.find(
              (item) => item.id === membership.projectId,
            );
            const section = project?.sections.find(
              (item) => item.id === membership.sectionId,
            );
            return (
              <DetailValue
                key={membership.projectId}
                label={project?.name ?? "Saved project unavailable"}
                value={
                  membership.sectionId
                    ? (section?.name ?? "Saved section unavailable")
                    : "Unsectioned"
                }
              />
            );
          })}
        </dl>
        {!task.memberships.length && <p>No project memberships</p>}
      </section>
      <dl className={styles.grid}>
        <DetailValue
          label="Time"
          value={`${minutesLabel(task.actualMinutes)} / ${minutesLabel(task.estimateMinutes)}`}
        />
        <DetailValue
          label="Dependencies"
          value={String(task.dependencies.length)}
        />
        <DetailValue
          label="Collaborators"
          value={String(task.collaborators.length)}
        />
        <DetailValue label="Tags" value={task.tags.join(", ") || "None"} />
      </dl>
      <p className={styles.note}>
        Task details are read-only here. Use Edit task to update permitted
        fields.
      </p>
    </div>
  );
}

export function TaskRepeatValues({
  recurrence,
}: {
  recurrence: PlannerTask["recurrence"];
}) {
  return (
    <>
      {recurrence?.basedOn && (
        <DetailValue
          label="Repeat from"
          value={
            recurrence.basedOn === "due_date" ? "Due date" : "Completion date"
          }
        />
      )}
      {recurrence?.weekdays && (
        <DetailValue
          label="Repeat on"
          value={
            recurrence.weekdays.length
              ? recurrence.weekdays
                  .map((day) =>
                    new Intl.DateTimeFormat("en-US", {
                      weekday: "long",
                      timeZone: "UTC",
                    }).format(new Date(Date.UTC(2000, 0, 2 + day))),
                  )
                  .join(", ")
              : "Not specified"
          }
        />
      )}
      {recurrence?.endsOn !== undefined && (
        <DetailValue
          label="Repeat ends"
          value={recurrence.endsOn ?? "No end date"}
        />
      )}
      {recurrence?.anchorOn && (
        <DetailValue label="Repeat anchor" value={recurrence.anchorOn} />
      )}
    </>
  );
}

function DetailValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

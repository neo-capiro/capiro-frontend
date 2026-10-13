"use client";
import type { PlannerPerson } from "../../../shared/capiro/operations/planner-schemas";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import { DataTable, Panel, StatusPanel } from "../../../shared/module-ui";
import styles from "./planner.module.css";
import { minutesLabel } from "./task-presentation";
export function WorkloadView({ people }: { people: PlannerPerson[] }) {
  const tasks = useCapiroQuery("planner.tasks", {});
  const rows = people.map((person) => ({
    person,
    work: (tasks.data?.items ?? []).filter(
      (task) => task.assigneeId === person.id && task.status !== "done",
    ),
  }));
  return (
    <Panel
      title="Team workload"
      description="Open assigned work and estimated effort in the current task page."
    >
      <StatusPanel
        loading={tasks.loading}
        error={tasks.error}
        onRetry={tasks.reload}
      >
        <DataTable
          rows={rows}
          rowKey={(row) => row.person.id}
          caption="Team workload"
          columns={[
            {
              key: "person",
              label: "Team member",
              render: (row) => row.person.name,
            },
            {
              key: "count",
              label: "Open tasks",
              render: (row) => row.work.length,
            },
            {
              key: "effort",
              label: "Estimated time",
              render: (row) =>
                minutesLabel(
                  row.work.reduce((sum, task) => sum + task.estimateMinutes, 0),
                ),
            },
            {
              key: "due",
              label: "Next due",
              render: (row) =>
                row.work
                  .map((task) => task.dueOn)
                  .filter(Boolean)
                  .sort()[0] ?? "Unscheduled",
            },
          ]}
        />
        {tasks.data?.nextCursor && (
          <p className={styles.note}>
            More tasks are available. These totals cover the first 100 tasks;
            use Capacity for stored staffing allocations.
          </p>
        )}
      </StatusPanel>
    </Panel>
  );
}

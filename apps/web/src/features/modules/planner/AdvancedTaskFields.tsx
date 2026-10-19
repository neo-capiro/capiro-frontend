"use client";
import type { PlannerPerson } from "../../../shared/capiro/operations/planner-schemas";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import { StatusPanel } from "../../../shared/module-ui";
import styles from "./planner.module.css";
import {
  TaskTypeFields,
  TaskTagField,
  TaskRepeatFields,
} from "./TaskDefinitionFields";
import type { TaskFormModel } from "./task-editor-data";
type Props = TaskFormModel & { people: PlannerPerson[]; taskId?: string };
export function AdvancedTaskFields({
  compact = false,
  ...props
}: Props & { compact?: boolean }) {
  return (
    <details>
      <summary>
        {compact
          ? "More task options"
          : "Task type, repeat, collaborators and dependencies"}
      </summary>
      <div className={styles.stack}>
        {compact ? <TaskTagField {...props} /> : <TaskDefinition {...props} />}
        <TaskRelationships {...props} />
      </div>
    </details>
  );
}
function TaskDefinition(props: TaskFormModel) {
  return (
    <div className={styles.form}>
      <TaskTypeFields {...props} />
      <TaskTagField {...props} />
      <TaskRepeatFields {...props} />
    </div>
  );
}
function TaskRelationships({ data, setData, people, taskId }: Props) {
  const tasks = useCapiroQuery("planner.tasks", {});
  return (
    <>
      <fieldset>
        <legend>Collaborators</legend>
        {people.map((person) => (
          <label key={person.id} className={styles.checkbox}>
            <input
              type="checkbox"
              checked={data.collaborators.includes(person.id)}
              onChange={(event) =>
                setData({
                  ...data,
                  collaborators: event.target.checked
                    ? [...data.collaborators, person.id]
                    : data.collaborators.filter((id) => id !== person.id),
                })
              }
            />
            {person.name}
          </label>
        ))}
      </fieldset>
      <fieldset>
        <legend>Depends on</legend>
        <StatusPanel
          loading={tasks.loading}
          error={tasks.error}
          onRetry={tasks.reload}
        >
          {tasks.data?.items
            .filter((task) => task.id !== taskId)
            .map((task) => (
              <label key={task.id} className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={data.dependencies.includes(task.id)}
                  onChange={(event) =>
                    setData({
                      ...data,
                      dependencies: event.target.checked
                        ? [...data.dependencies, task.id]
                        : data.dependencies.filter((id) => id !== task.id),
                    })
                  }
                />
                {task.name}
              </label>
            ))}
          {tasks.data?.nextCursor && (
            <p className={styles.note}>
              This selector shows the first 100 permitted tasks. Existing
              dependencies remain selected in the saved task.
            </p>
          )}
        </StatusPanel>
      </fieldset>
    </>
  );
}

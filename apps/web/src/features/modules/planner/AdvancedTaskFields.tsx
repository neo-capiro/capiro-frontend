"use client";
import type { PlannerPerson } from "../../../shared/capiro/operations/planner-schemas";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import {
  Field,
  SelectInput,
  StatusPanel,
  TextInput,
} from "../../../shared/module-ui";
import styles from "./planner.module.css";
import type { TaskFormModel } from "./task-editor-data";
type Props = TaskFormModel & { people: PlannerPerson[]; taskId?: string };
export function AdvancedTaskFields(props: Props) {
  return (
    <details>
      <summary>Task type, repeat, collaborators and dependencies</summary>
      <div className={styles.stack}>
        <TaskDefinition {...props} />
        <TaskRelationships {...props} />
      </div>
    </details>
  );
}
function TaskDefinition({ data, setData, disabled }: TaskFormModel) {
  return (
    <div className={styles.form}>
      <Field label="Task type" htmlFor="task-type">
        <SelectInput
          disabled={disabled}
          id="task-type"
          value={data.subtype}
          onValueChange={(value) =>
            setData({ ...data, subtype: value as typeof data.subtype })
          }
          options={["task", "milestone", "approval"].map((value) => ({
            value,
            label: value,
          }))}
        />
      </Field>
      {data.subtype === "approval" && (
        <Field label="Approval" htmlFor="task-approval">
          <SelectInput
            disabled={disabled}
            id="task-approval"
            value={data.approval}
            onValueChange={(value) =>
              setData({ ...data, approval: value as typeof data.approval })
            }
            options={[
              "pending",
              "approved",
              "rejected",
              "changes_requested",
            ].map((value) => ({
              value,
              label: value.replaceAll("_", " "),
            }))}
          />
        </Field>
      )}
      <Field label="Tags (comma separated)" htmlFor="task-tags">
        <TextInput
          id="task-tags"
          value={data.tags.join(", ")}
          onChange={(event) =>
            setData({
              ...data,
              tags: event.target.value
                .split(",")
                .map((value) => value.trim())
                .filter(Boolean),
            })
          }
        />
      </Field>
      <Field label="Repeat" htmlFor="task-repeat">
        <SelectInput
          disabled={disabled}
          id="task-repeat"
          value={data.recurrence?.frequency ?? "none"}
          onValueChange={(value) =>
            setData({
              ...data,
              recurrence:
                value === "none"
                  ? null
                  : {
                      frequency: value as NonNullable<
                        typeof data.recurrence
                      >["frequency"],
                      interval: 1,
                    },
            })
          }
          options={[
            "none",
            "daily",
            "weekly",
            "monthly",
            "yearly",
            "periodically",
          ].map((value) => ({ value, label: value }))}
        />
      </Field>
      {data.recurrence && (
        <Field label="Repeat interval" htmlFor="task-interval">
          <TextInput
            type="number"
            id="task-interval"
            min={1}
            max={365}
            value={data.recurrence.interval}
            onChange={(event) =>
              setData({
                ...data,
                recurrence: {
                  ...data.recurrence!,
                  interval: Number(event.target.value),
                },
              })
            }
          />
        </Field>
      )}
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

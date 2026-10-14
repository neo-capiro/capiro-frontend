"use client";
import { Field, SelectInput, TextInput } from "../../../shared/module-ui";
import type { TaskFormModel } from "./task-editor-data";
export function TaskTypeFields({ data, setData, disabled }: TaskFormModel) {
  return (
    <>
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
    </>
  );
}
export function TaskTagField({ data, setData }: TaskFormModel) {
  return (
    <>
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
    </>
  );
}
export function TaskRepeatFields({ data, setData, disabled }: TaskFormModel) {
  return (
    <>
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
    </>
  );
}

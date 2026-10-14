"use client";
import type { PlannerPerson } from "../../../shared/capiro/operations/planner-schemas";
import {
  Field,
  SelectInput,
  TextArea,
  TextInput,
} from "../../../shared/module-ui";
import type { Draft, TaskFormModel } from "./task-editor-data";
import { statuses } from "./task-presentation";
export function TaskNameField({ data, setData }: TaskFormModel) {
  return (
    <>
      <Field label="Task name" htmlFor="task-name">
        <TextInput
          id="task-name"
          required
          maxLength={500}
          value={data.name}
          onChange={(event) => setData({ ...data, name: event.target.value })}
        />
      </Field>
    </>
  );
}
export function TaskDescriptionField({ data, setData }: TaskFormModel) {
  return (
    <>
      <Field label="Description" htmlFor="task-description">
        <TextArea
          id="task-description"
          maxLength={50000}
          value={data.description}
          onChange={(event) =>
            setData({ ...data, description: event.target.value })
          }
        />
      </Field>
    </>
  );
}
export function TaskPriorityField({ data, setData, disabled }: TaskFormModel) {
  return (
    <>
      <Field label="Priority" htmlFor="task-priority">
        <SelectInput
          disabled={disabled}
          id="task-priority"
          value={data.priority}
          onValueChange={(value) =>
            setData({ ...data, priority: value as Draft["priority"] })
          }
          options={["none", "low", "medium", "high"].map((value) => ({
            value,
            label: value,
          }))}
        />
      </Field>
    </>
  );
}
export function TaskStatusField({ data, setData, disabled }: TaskFormModel) {
  return (
    <>
      <Field label="Status" htmlFor="task-status">
        <SelectInput
          disabled={disabled}
          id="task-status"
          value={data.status}
          onValueChange={(value) =>
            setData({ ...data, status: value as Draft["status"] })
          }
          options={statuses.map((item) => ({
            value: item.id,
            label: item.label,
          }))}
        />
      </Field>
    </>
  );
}
export function TaskEstimateField({ data, setData }: TaskFormModel) {
  return (
    <>
      <Field label="Estimated minutes" htmlFor="task-estimate">
        <TextInput
          id="task-estimate"
          type="number"
          min={0}
          max={1000000}
          value={data.estimateMinutes}
          onChange={(event) =>
            setData({ ...data, estimateMinutes: Number(event.target.value) })
          }
        />
      </Field>
    </>
  );
}
export function TaskAssigneeField({
  data,
  setData,
  disabled,
  people,
}: TaskFormModel & { people: PlannerPerson[] }) {
  return (
    <>
      <Field label="Assignee" htmlFor="task-assignee">
        <SelectInput
          disabled={disabled}
          id="task-assignee"
          value={data.assigneeId ?? "unassigned"}
          onValueChange={(id) =>
            setData({ ...data, assigneeId: id === "unassigned" ? null : id })
          }
          options={[
            { value: "unassigned", label: "Unassigned" },
            ...people.map((person) => ({
              value: person.id,
              label: person.name,
            })),
          ]}
        />
      </Field>
    </>
  );
}

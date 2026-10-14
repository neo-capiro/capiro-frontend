"use client";
import { Field, TextInput } from "../../../shared/module-ui";
import type { TaskFormModel } from "./task-editor-data";
export function TaskScheduleFields({ data, setData }: TaskFormModel) {
  return (
    <>
      <Field label="Start date" htmlFor="task-start">
        <TextInput
          id="task-start"
          type="date"
          value={data.startOn ?? ""}
          onChange={(event) =>
            setData({
              ...data,
              startOn: event.target.value || null,
              startTime: event.target.value ? data.startTime : null,
            })
          }
        />
      </Field>
      <Field label="Due date" htmlFor="task-due">
        <TextInput
          id="task-due"
          type="date"
          min={data.startOn ?? undefined}
          value={data.dueOn ?? ""}
          onChange={(event) =>
            setData({
              ...data,
              dueOn: event.target.value || null,
              dueTime: event.target.value ? data.dueTime : null,
            })
          }
        />
      </Field>
      <Field label="Start time" htmlFor="task-start-time">
        <TextInput
          id="task-start-time"
          type="time"
          disabled={!data.startOn}
          value={data.startTime ?? ""}
          onChange={(event) =>
            setData({ ...data, startTime: event.target.value || null })
          }
        />
      </Field>
      <Field label="Due time" htmlFor="task-due-time">
        <TextInput
          id="task-due-time"
          type="time"
          disabled={!data.dueOn}
          value={data.dueTime ?? ""}
          onChange={(event) =>
            setData({ ...data, dueTime: event.target.value || null })
          }
        />
      </Field>
      <Field label="Time zone" htmlFor="task-zone">
        <TextInput
          id="task-zone"
          required={!!data.startTime || !!data.dueTime}
          value={data.timeZone ?? ""}
          placeholder="America/New_York"
          onChange={(event) =>
            setData({ ...data, timeZone: event.target.value || null })
          }
        />
      </Field>
    </>
  );
}

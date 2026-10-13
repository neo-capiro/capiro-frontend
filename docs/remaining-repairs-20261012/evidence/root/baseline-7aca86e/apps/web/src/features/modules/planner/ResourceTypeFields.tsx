"use client";
import type { PlannerPerson } from "../../../shared/capiro/operations/planner-schemas";
import { Field, TextInput } from "../../../shared/module-ui";
import styles from "./planner.module.css";
export function GoalFields({
  data,
  update,
  people,
}: {
  data: Record<string, unknown>;
  update: (key: string, value: unknown) => void;
  people: PlannerPerson[];
}) {
  return (
    <div className={styles.form}>
      <Field label="Owner" htmlFor="goal-owner">
        <select
          id="goal-owner"
          className={styles.select}
          value={String(data.ownerId ?? "")}
          onChange={(event) => update("ownerId", event.target.value || null)}
        >
          <option value="">Unassigned</option>
          {people.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Due date" htmlFor="goal-due">
        <TextInput
          id="goal-due"
          type="date"
          value={String(data.dueOn ?? "")}
          onChange={(event) => update("dueOn", event.target.value || null)}
        />
      </Field>
      <Field label="Status" htmlFor="goal-status">
        <select
          id="goal-status"
          className={styles.select}
          value={String(data.status)}
          onChange={(event) => update("status", event.target.value)}
        >
          {[
            "on_track",
            "at_risk",
            "off_track",
            "achieved",
            "partial",
            "missed",
            "dropped",
          ].map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </Field>
      <Field label="Progress measurement" htmlFor="goal-progress">
        <select
          id="goal-progress"
          className={styles.select}
          value={String(data.progress)}
          onChange={(event) => update("progress", event.target.value)}
        >
          {[
            "manual",
            "project_task_completion",
            "project_milestone_completion",
          ].map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </Field>
      <Field label="Current value" htmlFor="goal-current">
        <TextInput
          type="number"
          id="goal-current"
          value={Number(data.current ?? 0)}
          disabled={data.progress !== "manual"}
          onChange={(event) => update("current", Number(event.target.value))}
        />
      </Field>
      <Field label="Target" htmlFor="goal-target">
        <TextInput
          id="goal-target"
          type="number"
          min={1}
          value={Number(data.target ?? 100)}
          onChange={(event) => update("target", Number(event.target.value))}
        />
      </Field>
      <Field label="Unit" htmlFor="goal-unit">
        <TextInput
          id="goal-unit"
          required
          value={String(data.unit ?? "%")}
          onChange={(event) => update("unit", event.target.value)}
        />
      </Field>
    </div>
  );
}
export function RuleFields({
  data,
  update,
}: {
  data: Record<string, unknown>;
  update: (key: string, value: unknown) => void;
}) {
  return (
    <div className={styles.form}>
      <label className={styles.checkbox}>
        <input
          type="checkbox"
          checked={Boolean(data.enabled)}
          onChange={(event) => update("enabled", event.target.checked)}
        />
        Enabled
      </label>
      <Field label="When" htmlFor="rule-trigger">
        <select
          id="rule-trigger"
          className={styles.select}
          value={String(data.trigger)}
          onChange={(event) => update("trigger", event.target.value)}
        >
          {[
            "created",
            "status_changed",
            "section_changed",
            "priority_changed",
          ].map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </Field>
      <Field label="Then set status" htmlFor="rule-action">
        <select
          id="rule-action"
          className={styles.select}
          value={String(
            (data.actions as Record<string, unknown>)?.status ?? "",
          )}
          onChange={(event) =>
            update("actions", {
              ...(data.actions as Record<string, unknown>),
              status: event.target.value,
            })
          }
        >
          <option value="">No change</option>
          {["todo", "in_progress", "blocked", "done"].map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </Field>
      <label className={styles.checkbox}>
        <input
          type="checkbox"
          checked={Boolean((data.actions as Record<string, unknown>)?.notify)}
          onChange={(event) =>
            update("actions", {
              ...(data.actions as Record<string, unknown>),
              notify: event.target.checked,
            })
          }
        />
        Notify collaborators
      </label>
    </div>
  );
}

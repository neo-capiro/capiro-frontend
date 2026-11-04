"use client";
import { useRef, useState } from "react";
import type { PlannerProject } from "../../../shared/capiro/operations/planner-schemas";
import {
  useCapiroMutation,
  useCapiroQuery,
} from "../../../shared/capiro/queries";
import {
  ActionButton,
  Field,
  Modal,
  TextArea,
  TextInput,
} from "../../../shared/module-ui";
import styles from "./planner.module.css";
export function AddTimeDialog(props: {
  open: boolean;
  onClose: () => void;
  taskId: string;
  projectId: string | null;
  projects: PlannerProject[];
  onSaved: () => void;
}) {
  const pending = useRef<object | null>(null);
  return (
    <Modal
      open={props.open}
      onOpenChange={(open) => {
        if (!open && !pending.current) props.onClose();
      }}
      title="Add time"
      description="Time is recorded against permitted work in the service."
    >
      {props.open && (
        <AddTimeForm
          {...props}
          key={JSON.stringify([props.taskId, props.projectId])}
          onPendingChange={(owner, value) => {
            if (value) pending.current = owner;
            else if (pending.current === owner) pending.current = null;
          }}
        />
      )}
    </Modal>
  );
}
function AddTimeForm({
  taskId,
  projectId,
  projects,
  onSaved,
  onClose,
  onPendingChange,
}: {
  taskId: string;
  projectId: string | null;
  projects: PlannerProject[];
  onSaved: () => void;
  onClose: () => void;
  onPendingChange: (owner: object, value: boolean) => void;
}) {
  const {
    project,
    setProject,
    workedOn,
    setWorkedOn,
    minutes,
    setMinutes,
    billable,
    setBillable,
    text,
    setText,
    busy,
    error,
    submit,
    isPending,
  } = useAddTime(taskId, projectId, onSaved, onClose, onPendingChange);
  return (
    <form aria-busy={busy} onSubmit={(event) => void submit(event)}>
      <fieldset
        disabled={busy}
        className={styles.form}
        style={{ margin: 0, padding: 0, border: 0, minWidth: 0 }}
      >
        <TimeDuration
          workedOn={workedOn}
          onWorkedOn={setWorkedOn}
          minutes={minutes}
          onMinutes={setMinutes}
        />
        <div className={styles.wide}>
          <Field label="Project" htmlFor="time-project">
            <select
              id="time-project"
              className={styles.select}
              value={project}
              onChange={(event) => setProject(event.target.value)}
            >
              <option value="">Personal work</option>
              {projects
                .filter(
                  (item) =>
                    !item.archived && ["admin", "editor"].includes(item.access),
                )
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
            </select>
          </Field>
        </div>
        <label className={styles.checkbox}>
          <input
            type="checkbox"
            checked={billable}
            onChange={(event) => setBillable(event.target.checked)}
          />
          Billable
        </label>
        <div className={styles.wide}>
          <Field label="Description" htmlFor="time-description">
            <TextArea
              id="time-description"
              required
              maxLength={20000}
              value={text}
              onChange={(event) => setText(event.target.value)}
            />
          </Field>
        </div>
        {error && (
          <p role="alert" className={`${styles.error} ${styles.wide}`}>
            {error}
          </p>
        )}
        <div className={`${styles.footer} ${styles.wide}`}>
          <ActionButton
            type="button"
            onClick={() => {
              if (!isPending()) onClose();
            }}
          >
            Cancel
          </ActionButton>
          <ActionButton primary type="submit" disabled={busy}>
            Add time
          </ActionButton>
        </div>
      </fieldset>
    </form>
  );
}
function TimeDuration({
  workedOn,
  onWorkedOn: setWorkedOn,
  minutes,
  onMinutes: setMinutes,
}: {
  workedOn: string;
  onWorkedOn: (value: string) => void;
  minutes: number;
  onMinutes: (value: number) => void;
}) {
  return (
    <>
      {" "}
      <Field label="Worked on" htmlFor="time-date">
        <TextInput
          id="time-date"
          type="date"
          required
          value={workedOn}
          onChange={(event) => setWorkedOn(event.target.value)}
        />
      </Field>
      <Field label="Minutes" htmlFor="time-minutes">
        <TextInput
          id="time-minutes"
          type="number"
          min={1}
          max={1440}
          required
          value={minutes}
          onChange={(event) => setMinutes(Number(event.target.value))}
        />
      </Field>
    </>
  );
}

function useAddTime(
  taskId: string,
  projectId: string | null,
  onSaved: () => void,
  onClose: () => void,
  onPendingChange: (owner: object, value: boolean) => void,
) {
  const taskMutation = useCapiroMutation("planner.time.add");
  const pending = useRef(false);
  const owner = useRef({});
  const [project, setProject] = useState(projectId ?? ""),
    [workedOn, setWorkedOn] = useState(() =>
      new Date().toLocaleDateString("en-CA"),
    ),
    [minutes, setMinutes] = useState(60),
    [billable, setBillable] = useState(false),
    [text, setText] = useState("");
  const settings = useCapiroQuery("planner.time.settings", {});
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (pending.current) return;

    pending.current = true;
    onPendingChange(owner.current, true);
    taskMutation.reset();
    try {
      const body = {
        kind: "time" as const,
        text,
        minutes,
        time: {
          workedOn,
          timeZone:
            settings.data?.options.timeZone ??
            Intl.DateTimeFormat().resolvedOptions().timeZone,
          billable,
          projectId: project || null,
          category: "",
        },
      };
      await taskMutation.run({ params: { id: taskId }, body });
      onSaved();
      onClose();
    } catch {
      // Canonical mutation state owns errors and retires replaced-view callbacks; never replay writes.
    } finally {
      pending.current = false;
      onPendingChange(owner.current, false);
    }
  };
  return {
    project,
    setProject,
    workedOn,
    setWorkedOn,
    minutes,
    setMinutes,
    billable,
    setBillable,
    text,
    setText,
    busy: taskMutation.pending,
    error: taskMutation.error?.message,
    submit,
    isPending: () => pending.current,
  };
}

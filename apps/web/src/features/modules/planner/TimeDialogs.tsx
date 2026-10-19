"use client";
import { useRef, useState } from "react";
import { useCapiro } from "../../../shared/capiro/CapiroBoundary";
import type { PlannerProject } from "../../../shared/capiro/operations/planner-schemas";
import {
  useCapiroMutation,
  useCapiroQuery,
} from "../../../shared/capiro/queries";
import {
  ActionButton,
  Field,
  Modal,
  StatusPanel,
  TextArea,
  TextInput,
} from "../../../shared/module-ui";
import styles from "./planner.module.css";
export function AddTimeDialog(props: {
  open: boolean;
  onClose: () => void;
  taskId?: string;
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
  taskId?: string;
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
              required={!taskId}
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
export function PersonalTimeSettings({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const api = useCapiro();
  const query = useCapiroQuery(
    "planner.time.preferences",
    {},
    { enabled: open },
  );
  const [selected, setSelected] = useState<boolean | null>(null),
    [error, setError] = useState<string>(),
    [busy, setBusy] = useState(false);
  const save = async () => {
    if (!query.data) return;
    setBusy(true);
    setError(undefined);
    try {
      await api.request("planner.time.preferences.update", {
        body: {
          version: query.data.version,
          autoAddDueTasks: selected ?? query.data.autoAddDueTasks,
        },
      });
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to save preferences.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title="My timesheet settings"
    >
      <StatusPanel
        loading={query.loading}
        error={query.error}
        onRetry={query.reload}
      >
        <div className={styles.stack}>
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={selected ?? query.data?.autoAddDueTasks ?? false}
              onChange={(event) => setSelected(event.target.checked)}
            />
            Automatically add tasks assigned and due this week
          </label>
          {error && (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          )}
          <ActionButton
            primary
            disabled={busy || !query.data}
            onClick={() => void save()}
          >
            Save
          </ActionButton>
        </div>
      </StatusPanel>
    </Modal>
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
  taskId: string | undefined,
  projectId: string | null,
  onSaved: () => void,
  onClose: () => void,
  onPendingChange: (owner: object, value: boolean) => void,
) {
  const taskMutation = useCapiroMutation("planner.time.add");
  const projectMutation = useCapiroMutation("planner.time.project.add");
  const pending = useRef(false);
  const owner = useRef({});
  const [project, setProject] = useState(projectId ?? ""),
    [workedOn, setWorkedOn] = useState(() =>
      new Date().toLocaleDateString("en-CA"),
    ),
    [minutes, setMinutes] = useState(60),
    [billable, setBillable] = useState(false),
    [text, setText] = useState(""),
    [error, setError] = useState<string>();
  const settings = useCapiroQuery("planner.time.settings", {});
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (pending.current) return;
    if (!taskId && !project) {
      setError("Choose a project.");
      return;
    }
    pending.current = true;
    onPendingChange(owner.current, true);
    taskMutation.reset();
    projectMutation.reset();
    setError(undefined);
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
      if (taskId) await taskMutation.run({ params: { id: taskId }, body });
      else if (project)
        await projectMutation.run({
          params: { id: project },
          body,
        });
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
    busy: taskMutation.pending || projectMutation.pending,
    error:
      error ?? taskMutation.error?.message ?? projectMutation.error?.message,
    submit,
    isPending: () => pending.current,
  };
}

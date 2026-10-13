"use client";
import { useState } from "react";
import { useCapiro } from "../../../shared/capiro/CapiroBoundary";
import type { PlannerProject } from "../../../shared/capiro/operations/planner-schemas";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import {
  ActionButton,
  Field,
  Modal,
  StatusPanel,
} from "../../../shared/module-ui";
import styles from "./planner.module.css";
export function TimesheetWorkDialog({
  open,
  sheet,
  projects,
  onClose,
  onSaved,
}: {
  open: boolean;
  sheet: { weekOn: string; userId: string; version: number; revision: string };
  projects: PlannerProject[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const api = useCapiro();
  const query = useCapiroQuery("planner.tasks", {}, { enabled: open });
  const [taskId, setTask] = useState(""),
    [projectId, setProject] = useState(""),
    [error, setError] = useState<string>(),
    [busy, setBusy] = useState(false);
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      await api.request("planner.timesheet.work", {
        body: {
          week: sheet.weekOn,
          userId: sheet.userId,
          version: sheet.version,
          revision: sheet.revision,
          action: "add",
          work: { taskId: taskId || null, projectId: projectId || null },
        },
      });
      onSaved();
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to add work.");
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
      title="Add work to timesheet"
    >
      <StatusPanel
        loading={query.loading}
        error={query.error}
        onRetry={query.reload}
      >
        <form onSubmit={(event) => void save(event)} className={styles.stack}>
          <Field label="Task" htmlFor="timesheet-task">
            <select
              id="timesheet-task"
              className={styles.select}
              value={taskId}
              onChange={(event) => {
                setTask(event.target.value);
                setProject(
                  query.data?.items.find(
                    (task) => task.id === event.target.value,
                  )?.memberships[0]?.projectId ?? "",
                );
              }}
            >
              <option value="">General project work</option>
              {query.data?.items.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Project" htmlFor="timesheet-project">
            <select
              id="timesheet-project"
              className={styles.select}
              value={projectId}
              onChange={(event) => setProject(event.target.value)}
              required={!taskId}
            >
              <option value="">Personal work</option>
              {projects
                .filter((project) => !project.archived)
                .map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
            </select>
          </Field>
          {query.data?.nextCursor && (
            <p className={styles.note}>
              The task selector displays the first 100 permitted tasks.
            </p>
          )}
          {error && (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          )}
          <div className={styles.footer}>
            <ActionButton type="button" onClick={onClose}>
              Cancel
            </ActionButton>
            <ActionButton
              primary
              type="submit"
              disabled={busy || (!taskId && !projectId)}
            >
              Add work
            </ActionButton>
          </div>
        </form>
      </StatusPanel>
    </Modal>
  );
}

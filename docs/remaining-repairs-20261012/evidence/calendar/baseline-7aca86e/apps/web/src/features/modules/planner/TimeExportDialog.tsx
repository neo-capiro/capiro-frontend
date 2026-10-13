"use client";
import { useEffect, useRef, useState } from "react";
import { useCapiro } from "../../../shared/capiro/CapiroBoundary";
import type { PlannerProject } from "../../../shared/capiro/operations/planner-schemas";
import {
  ActionButton,
  Field,
  Modal,
  TextInput,
} from "../../../shared/module-ui";
import styles from "./planner.module.css";
function csvCell(value: string | number) {
  const raw = String(value);
  const safe = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replaceAll('"', '""')}"`;
}
export function TimeExportDialog({
  open,
  onClose,
  week,
  userId,
  timeAdmin,
  projects,
}: {
  open: boolean;
  onClose: () => void;
  week: string;
  userId: string;
  timeAdmin: boolean;
  projects: PlannerProject[];
}) {
  const api = useCapiro();
  const [scope, setScope] = useState<
      "personal" | "review" | "project" | "organization"
    >("personal"),
    [projectId, setProject] = useState(""),
    [fromOn, setFrom] = useState(week),
    [throughOn, setThrough] = useState(week),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string>();
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => active.current?.abort(), []);
  const run = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    const controller = new AbortController();
    active.current = controller;
    try {
      let cursor: string | undefined, revision: string | undefined;
      const rows: (string | number)[][] = [
        [
          "Worked on",
          "Submitter",
          "Task",
          "Project",
          "Minutes",
          "Billable",
          "Description",
        ],
      ];
      for (let pages = 0; pages < 100; pages++) {
        const result = await api.request(
          "planner.time.export",
          {
            query: {
              scope,
              fromOn,
              throughOn,
              ...(scope === "personal" ? { userId } : {}),
              ...(scope === "project" ? { projectId } : {}),
              cursor,
              revision,
            },
          },
          { signal: controller.signal },
        );
        if (result.unavailableEntries)
          throw new Error(
            "Some entries became unavailable. Review access before exporting.",
          );
        rows.push(
          ...result.items.map((item) => [
            item.time.workedOn,
            item.submitterName,
            item.taskName ?? "",
            item.projectName ?? "",
            item.minutes ?? 0,
            item.time.billable ? "Yes" : "No",
            item.text,
          ]),
        );
        revision = result.revision;
        cursor = result.nextCursor ?? undefined;
        if (!cursor) break;
        if (pages === 99)
          throw new Error("Choose a smaller date range to export this work.");
      }
      const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
      const url = URL.createObjectURL(
        new Blob([csv], { type: "text/csv;charset=utf-8" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `capiro-time-${fromOn}-${throughOn}.csv`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
      onClose();
    } catch (cause) {
      if (!controller.signal.aborted)
        setError(
          cause instanceof Error ? cause.message : "Unable to export time.",
        );
    } finally {
      if (!controller.signal.aborted) setBusy(false);
      active.current = null;
    }
  };
  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          active.current?.abort();
          setBusy(false);
          onClose();
        }
      }}
      title="Export time entries"
      description="Export all pages at one authorized data revision."
    >
      <form className={styles.form} onSubmit={(event) => void run(event)}>
        <Field label="Scope" htmlFor="export-scope">
          <select
            id="export-scope"
            className={styles.select}
            value={scope}
            onChange={(event) => setScope(event.target.value as typeof scope)}
          >
            <option value="personal">Personal</option>
            <option value="review">Assigned review</option>
            <option value="project">Project</option>
            {timeAdmin && <option value="organization">Organization</option>}
          </select>
        </Field>
        {scope === "project" && (
          <Field label="Project" htmlFor="export-project">
            <select
              id="export-project"
              className={styles.select}
              value={projectId}
              onChange={(event) => setProject(event.target.value)}
              required
            >
              <option value="">Choose project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="From" htmlFor="export-from">
          <TextInput
            type="date"
            id="export-from"
            required
            value={fromOn}
            onChange={(event) => setFrom(event.target.value)}
          />
        </Field>
        <Field label="Through" htmlFor="export-through">
          <TextInput
            type="date"
            id="export-through"
            min={fromOn}
            required
            value={throughOn}
            onChange={(event) => setThrough(event.target.value)}
          />
        </Field>
        {error && (
          <p role="alert" className={`${styles.error} ${styles.wide}`}>
            {error}
          </p>
        )}
        <div className={`${styles.footer} ${styles.wide}`}>
          <ActionButton
            type="button"
            onClick={() => {
              active.current?.abort();
              onClose();
            }}
          >
            Cancel
          </ActionButton>
          <ActionButton primary type="submit" disabled={busy}>
            {busy ? "Exporting…" : "Download CSV"}
          </ActionButton>
        </div>
      </form>
    </Modal>
  );
}

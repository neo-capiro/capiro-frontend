"use client";
import { useState } from "react";
import { useCapiro } from "../../../shared/capiro/CapiroBoundary";
import {
  ActionButton,
  DataTable,
  Field,
  Modal,
  TextArea,
} from "../../../shared/module-ui";
import styles from "./planner.module.css";
export function parseTaskCsv(value: string) {
  const lines = value.trim().split(/\r?\n/);
  const header = lines
    .shift()
    ?.split(",")
    .map((item) => item.trim().toLowerCase());
  if (!header || header[0] !== "name")
    throw new Error(
      "The first column must be name. Supported columns: name,dueOn,estimateMinutes.",
    );
  return lines.filter(Boolean).map((line, index) => {
    if (line.includes('"'))
      throw new Error(
        "Quoted CSV rows require an import parser; use unquoted plain values here.",
      );
    const columns = line.split(",");
    const name = columns[0]?.trim();
    const dueOn = columns[header.indexOf("dueon")]?.trim() || null;
    const estimateMinutes = Number(
      columns[header.indexOf("estimateminutes")] || 0,
    );
    if (
      !name ||
      !Number.isInteger(estimateMinutes) ||
      estimateMinutes < 0 ||
      estimateMinutes > 1000000
    )
      throw new Error(`Invalid row ${index + 2}.`);
    return { importKey: crypto.randomUUID(), name, dueOn, estimateMinutes };
  });
}
export function ImportTasks({
  open,
  onClose,
  projectId,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string | null;
  onImported: () => void;
}) {
  const { csv, setCsv, rows, setRows, error, busy, completed, review, submit } =
    useImportTasks(projectId, onImported, onClose);
  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title="Import tasks"
      description="Review plain CSV rows before creating tasks. Each row has an idempotency key for safe retry."
    >
      <div className={styles.stack}>
        <Field label="CSV content" htmlFor="task-csv">
          <TextArea
            id="task-csv"
            value={csv}
            onChange={(event) => {
              setCsv(event.target.value);
              setRows([]);
            }}
          />
        </Field>
        <ActionButton onClick={review}>Review rows</ActionButton>
        <ImportPreview rows={rows} completed={completed} />
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
        <div className={styles.footer}>
          <ActionButton onClick={onClose}>Cancel</ActionButton>
          <ActionButton
            primary
            disabled={busy || !rows.length}
            onClick={() => void submit()}
          >
            {busy ? "Importing…" : `Import ${rows.length} tasks`}
          </ActionButton>
        </div>
      </div>
    </Modal>
  );
}

function ImportPreview({
  rows,
  completed,
}: {
  rows: ReturnType<typeof parseTaskCsv>;
  completed: Set<string>;
}) {
  return (
    <>
      {rows.length > 0 && (
        <DataTable
          rows={rows}
          rowKey={(row) => row.importKey}
          caption="Import preview"
          columns={[
            { key: "name", label: "Task", render: (row) => row.name },
            { key: "due", label: "Due", render: (row) => row.dueOn ?? "None" },
            {
              key: "estimate",
              label: "Minutes",
              render: (row) => row.estimateMinutes,
            },
            {
              key: "state",
              label: "State",
              render: (row) =>
                completed.has(row.importKey) ? "Created" : "Ready",
            },
          ]}
        />
      )}{" "}
    </>
  );
}

function useImportTasks(
  projectId: string | null,
  onImported: () => void,
  onClose: () => void,
) {
  const api = useCapiro();
  const [csv, setCsv] = useState("name,dueOn,estimateMinutes\n"),
    [rows, setRows] = useState<ReturnType<typeof parseTaskCsv>>([]),
    [error, setError] = useState<string>(),
    [busy, setBusy] = useState(false),
    [completed, setCompleted] = useState(new Set<string>());
  const review = () => {
    try {
      setRows(parseTaskCsv(csv));
      setCompleted(new Set());
      setError(undefined);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Invalid CSV.");
    }
  };
  const submit = async () => {
    setBusy(true);
    setError(undefined);
    try {
      for (const row of rows) {
        if (completed.has(row.importKey)) continue;
        await api.request("planner.task.import", {
          body: {
            importKey: row.importKey,
            actualMinutes: 0,
            data: {
              name: row.name,
              dueOn: row.dueOn,
              estimateMinutes: row.estimateMinutes,
              memberships: projectId
                ? [{ projectId, sectionId: null, position: 0 }]
                : [],
            },
          },
        });
        setCompleted((old) => new Set(old).add(row.importKey));
      }
      onImported();
      onClose();
    } catch (cause) {
      onImported();
      setError(
        cause instanceof Error
          ? cause.message
          : "Import stopped. Completed rows retain their idempotency keys.",
      );
    } finally {
      setBusy(false);
    }
  };
  return { csv, setCsv, rows, setRows, error, busy, completed, review, submit };
}

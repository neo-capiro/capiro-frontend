"use client";
import { useState } from "react";
import type { z } from "zod";
import type { ResearchDetail } from "../../../shared/capiro/operations/research-schemas";
import {
  researchImportDetail,
  type researchImportOperations,
} from "../../../shared/capiro/operations/research-imports";
import { CapiroApiError } from "../../../shared/capiro/http";
import {
  useCapiroMutation,
  useCapiroQuery,
} from "../../../shared/capiro/queries";
import {
  ActionButton,
  DataTable,
  Panel,
  StatusPanel,
  TextInput,
} from "../../../shared/module-ui";
import styles from "./research.module.css";
type ImportDetail = z.infer<typeof researchImportDetail>;
type ImportActionRequest = z.infer<
  (typeof researchImportOperations)["research.imports.action"]["request"]
>;
export function ImportWorksheet({
  portfolio,
  jobId,
  onReload,
}: {
  portfolio: ResearchDetail;
  jobId: string;
  onReload: () => void;
}) {
  const query = useCapiroQuery("research.imports.detail", {
    params: { id: portfolio.id, jobId },
  });
  const action = useCapiroMutation("research.imports.action");
  const [selected, setSelected] = useState<string[] | null>(null);
  const [repairs, setRepairs] = useState<
    Record<string, Record<string, string>>
  >({});
  const [receipt, setReceipt] = useState<ImportDetail>();
  const [retained, setRetained] = useState<{
    identity: string;
    request: ImportActionRequest;
  }>();
  const job = receipt ?? query.data;
  const editable =
    portfolio.myRole !== "viewer" && portfolio.lifecycle === "active";
  const selectedIds =
    selected ??
    job?.rows.filter((row) => row.selected).map((row) => row.id) ??
    [];
  const compensation = job?.compensationReceipts.findLast(
    (item) => item.status === "previewed",
  );
  const allowed = (name: string) => {
    if (
      !job ||
      portfolio.myRole === "viewer" ||
      (!editable && !["cancel", "reconcile", "compensate"].includes(name))
    )
      return false;
    if (name === "preview")
      return ["mapped", "previewed", "failed", "partial"].includes(job.status);
    if (name === "apply")
      return (
        ["previewed", "applying"].includes(job.status) &&
        !Object.keys(repairs).length &&
        selected === null
      );
    if (name === "pause") return job.status === "applying";
    if (name === "resume") return job.status === "paused";
    if (name === "retry") return ["failed", "partial"].includes(job.status);
    if (name === "reconcile")
      return ["unknown", "needs_reconciliation"].includes(job.status);
    if (name === "compensate")
      return ["completed", "partial"].includes(job.status);
    return !["completed", "compensated", "cancelled"].includes(job.status);
  };
  async function run(
    name:
      | "preview"
      | "apply"
      | "pause"
      | "resume"
      | "cancel"
      | "retry"
      | "reconcile"
      | "compensate",
    confirmCompensation = false,
  ) {
    if (!allowed(name)) return;
    const params = { id: portfolio.id, jobId, action: name };
    const body = {
      expectedRevision: portfolio.revision,
      selectedRowIds: selectedIds,
      ...(name === "preview" ? { repairs } : {}),
      ...(confirmCompensation && compensation
        ? { compensationPreviewHash: compensation.previewHash }
        : {}),
    };
    const identity = JSON.stringify({ params, body });
    const request =
      retained?.identity === identity
        ? retained.request
        : {
            params,
            body: { operationKey: crypto.randomUUID(), ...body },
          };
    setRetained({ identity, request });
    try {
      const next = await action.run(request);
      setRetained(undefined);
      setReceipt(next);
      setSelected(null);
      setRepairs({});
      onReload();
    } catch {
      /* Inspect the retained receipt or refresh; never auto-retry. */
    }
  }
  return (
    <Panel
      title="Import receipt"
      description={`Keep this import ID to reopen it: ${jobId}`}
      actions={
        <ActionButton
          disabled={action.pending}
          onClick={() => {
            setReceipt(undefined);
            action.reset();
            query.reload();
            onReload();
          }}
        >
          Refresh status
        </ActionButton>
      }
    >
      <StatusPanel
        loading={query.loading}
        error={query.error || action.error}
        onRetry={query.reload}
      />
      {retained && action.error && (
        <p className={styles.content}>
          {action.error instanceof CapiroApiError &&
          action.error.status >= 400 &&
          action.error.status < 500 &&
          action.error.status !== 408
            ? "The action was refused. Refresh its status or change the selected action or input before trying a corrected request."
            : "The response is uncertain. Repeating this unchanged action sends the same request key; refresh its status before choosing another action."}
        </p>
      )}
      {job && (
        <>
          <p className={styles.content} role="status">
            {job.status} · {job.appliedCount} of {job.rowCount} rows applied ·
            Original file {job.fileName}
          </p>
          <DataTable
            rows={job.rows}
            rowKey={(row) => row.id}
            caption="Every import row and its outcome"
            columns={[
              {
                key: "select",
                label: "Select",
                render: (row) => (
                  <input
                    type="checkbox"
                    aria-label={`Select row ${row.rowNumber}`}
                    checked={selectedIds.includes(row.id)}
                    disabled={!editable || action.pending}
                    onChange={(e) =>
                      setSelected(
                        e.target.checked
                          ? [...selectedIds, row.id]
                          : selectedIds.filter((id) => id !== row.id),
                      )
                    }
                  />
                ),
              },
              { key: "row", label: "Row", render: (row) => row.rowNumber },
              {
                key: "original",
                label: "Original",
                render: (row) =>
                  Object.entries(row.rawCells)
                    .map(([key, value]) => `${key}: ${String(value)}`)
                    .join(" · "),
              },
              {
                key: "repair",
                label: "Mapped values and repairs",
                render: (row) => (
                  <details>
                    <summary>Edit row {row.rowNumber}</summary>
                    {Object.entries(row.parsedData).map(([field, value]) => (
                      <label key={field}>
                        {field.replaceAll("_", " ")}
                        <TextInput
                          aria-label={`Row ${row.rowNumber} ${field}`}
                          disabled={!editable || action.pending}
                          value={
                            repairs[row.id]?.[field] ??
                            (typeof value === "string"
                              ? value
                              : JSON.stringify(value))
                          }
                          onChange={(e) =>
                            setRepairs((current) => ({
                              ...current,
                              [row.id]: {
                                ...current[row.id],
                                [field]: e.target.value,
                              },
                            }))
                          }
                        />
                      </label>
                    ))}
                  </details>
                ),
              },
              {
                key: "result",
                label: "Result",
                render: (row) =>
                  [
                    row.finalOutcome ?? row.previewClassification,
                    row.finalReason ?? row.previewReason,
                    ...row.validationIssues,
                  ]
                    .filter(Boolean)
                    .join(" · "),
              },
            ]}
          />
          <div className={styles.actions}>
            {(
              [
                "preview",
                "apply",
                "pause",
                "resume",
                "cancel",
                "retry",
                "reconcile",
              ] as const
            ).map((name) => (
              <ActionButton
                key={name}
                disabled={!allowed(name) || action.pending}
                onClick={() => void run(name)}
              >
                {name === "preview"
                  ? "Preview selected rows"
                  : name.charAt(0).toUpperCase() + name.slice(1)}
              </ActionButton>
            ))}
            <ActionButton
              disabled={
                !allowed("compensate") || action.pending || !job.appliedCount
              }
              onClick={() => void run("compensate")}
            >
              Preview compensation
            </ActionButton>
          </div>
          {compensation && (
            <div className={styles.content}>
              <p>
                Compensation preview: {compensation.effects.length} effects.
                Later edits can prevent compensation.
              </p>
              <pre>{JSON.stringify(compensation.effects, null, 2)}</pre>
              <ActionButton
                disabled={!allowed("compensate") || action.pending}
                onClick={() => void run("compensate", true)}
              >
                Confirm reviewed compensation
              </ActionButton>
            </div>
          )}
          <DataTable
            rows={job.attempts}
            rowKey={(row) => row.id}
            caption="Import attempt history"
            columns={[
              { key: "action", label: "Action", render: (row) => row.action },
              {
                key: "outcome",
                label: "Outcome",
                render: (row) => row.outcome,
              },
              {
                key: "error",
                label: "Error",
                render: (row) => row.errorCode ?? "—",
              },
            ]}
          />
        </>
      )}
    </Panel>
  );
}

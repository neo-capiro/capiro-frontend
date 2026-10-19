"use client";
import { useState } from "react";
import type { z } from "zod";
import {
  workflowTemplates,
  type workflow,
} from "../../../../../shared/capiro/operations/legiwatch-workflows";
import {
  useCapiroMutation,
  useCapiroQuery,
} from "../../../../../shared/capiro/queries";
import {
  ActionButton,
  Field,
  Modal,
  StatusPanel,
  TextInput,
} from "../../../../../shared/module-ui";
import { SelectField } from "../components";
import styles from "../legiwatch.module.css";
import { FolderTargets } from "./ScopeControls";
type Workflow = z.infer<typeof workflow>;
export function WorkflowEditor({
  row,
  scope,
  canEdit,
  onClose,
  onSaved,
}: {
  row?: Workflow;
  scope: Workflow["config"];
  canEdit: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(row?.name ?? ""),
    [template, setTemplate] = useState<Workflow["template"]>(
      row?.template ?? "hearing_preparation",
    ),
    [config, setConfig] = useState(row?.config ?? scope),
    [changed, setChanged] = useState(!row);
  const create = useCapiroMutation("legiwatch.workflow.create"),
    update = useCapiroMutation("legiwatch.workflow.save");
  const reports = useCapiroQuery(
    "legiwatch.reports",
    {},
    { enabled: template === "report_review" },
  );
  const pending = create.pending || update.pending;
  const save = async () => {
    const body = {
      name,
      template,
      config: {
        folderIds: config.folderIds,
        jurisdiction: config.jurisdiction,
        sessionKey: config.sessionKey,
        ...(template === "report_review" ? { reportId: config.reportId } : {}),
      },
    };
    try {
      if (row)
        await update.run({
          params: { id: row.id },
          body: { ...body, expectedVersion: row.version },
        });
      else await create.run({ body });
      onSaved();
    } catch {
      /* Preserve scope on conflict. */
    }
  };
  return (
    <Modal
      open
      title="Internal workflow"
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
    >
      <div className={styles.form}>
        <fieldset
          disabled={!canEdit || pending}
          className={styles.form}
          onChange={() => setChanged(true)}
        >
          <Field label="Workflow name" htmlFor="workflow-name">
            <TextInput
              id="workflow-name"
              value={name}
              maxLength={200}
              onChange={(event) => setName(event.target.value)}
            />
          </Field>
          <SelectField
            id="workflow-template"
            label="Trigger"
            value={template}
            onChange={(value) => {
              const next = workflowTemplates.find((item) => item === value);
              if (next) setTemplate(next);
            }}
          >
            {workflowTemplates.map((item) => (
              <option key={item} value={item}>
                {item.replaceAll("_", " ")}
              </option>
            ))}
          </SelectField>
          <FolderTargets
            values={config.folderIds}
            onChange={(folderIds) =>
              setConfig((current) => ({ ...current, folderIds }))
            }
          />
          <Field label="Jurisdiction" htmlFor="workflow-jurisdiction">
            <TextInput
              id="workflow-jurisdiction"
              maxLength={2}
              value={config.jurisdiction}
              onChange={(event) =>
                setConfig((current) => ({
                  ...current,
                  jurisdiction: event.target.value.toUpperCase(),
                }))
              }
            />
          </Field>
          <Field label="Session" htmlFor="workflow-session">
            <TextInput
              id="workflow-session"
              value={config.sessionKey}
              maxLength={60}
              onChange={(event) =>
                setConfig((current) => ({
                  ...current,
                  sessionKey: event.target.value,
                }))
              }
            />
          </Field>
          {template === "report_review" && (
            <StatusPanel
              loading={reports.loading}
              error={reports.error}
              onRetry={reports.reload}
            >
              <SelectField
                id="workflow-report"
                label="Report"
                value={config.reportId ?? ""}
                onChange={(reportId) =>
                  setConfig((current) => ({ ...current, reportId }))
                }
              >
                <option value="">Choose a report</option>
                {reports.data
                  ?.filter(
                    (report) =>
                      !report.archived &&
                      report.canEdit &&
                      report.folderIds.every((id) =>
                        config.folderIds.includes(id),
                      ),
                  )
                  .map((report) => (
                    <option key={report.id} value={report.id}>
                      {report.name}
                    </option>
                  ))}
              </SelectField>
            </StatusPanel>
          )}
          <ActionButton
            primary
            disabled={
              !changed ||
              !name.trim() ||
              !config.folderIds.length ||
              (template === "report_review" && !config.reportId)
            }
            onClick={() => void save()}
          >
            Save paused workflow
          </ActionButton>
        </fieldset>
        {(create.error || update.error) && (
          <p role="alert">{(create.error ?? update.error)?.message}</p>
        )}
        {row && !changed && (
          <WorkflowActivation row={row} canEdit={canEdit} onSaved={onSaved} />
        )}
      </div>
    </Modal>
  );
}
function WorkflowActivation({
  row,
  canEdit,
  onSaved,
}: {
  row: Workflow;
  canEdit: boolean;
  onSaved: () => void;
}) {
  const mutation = useCapiroMutation("legiwatch.workflow.activation"),
    [reviewed, setReviewed] = useState(false);
  const activate = async (enabled: boolean) => {
    try {
      await mutation.run({
        params: { id: row.id },
        body: {
          expectedVersion: row.version,
          enabled,
          ...(enabled
            ? { baseline: "from_now" as const, reviewed: true as const }
            : {}),
        },
      });
      onSaved();
    } catch {
      /* Backend owns activation and current owner checks. */
    }
  };
  return (
    <fieldset disabled={!canEdit || mutation.pending} className={styles.form}>
      <legend>Future triggers · {row.state}</legend>
      <label className={styles.check}>
        <input
          type="checkbox"
          checked={reviewed}
          onChange={(event) => setReviewed(event.target.checked)}
        />
        I reviewed this template and folder scope. Activate for new events from
        now.
      </label>
      <div className={styles.actions}>
        <ActionButton
          disabled={!reviewed || row.state === "active"}
          onClick={() => void activate(true)}
        >
          Activate workflow
        </ActionButton>
        <ActionButton
          disabled={row.state !== "active"}
          onClick={() => void activate(false)}
        >
          Pause workflow
        </ActionButton>
      </div>
      {mutation.error && <p role="alert">{mutation.error.message}</p>}
    </fieldset>
  );
}

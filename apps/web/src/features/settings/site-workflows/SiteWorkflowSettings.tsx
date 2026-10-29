"use client";
import { useState } from "react";
import type { SiteWorkflowConfiguration } from "@capiro/shared/site-workflows";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import { StatusPanel } from "../../../shared/module-ui";
import { SettingField, SettingsButton, SettingsNotice } from "../components";
import { SettingsMutationNotice } from "../SettingsMutationNotice";
import styles from "../styles";
import { workflowKey } from "./form";
import { WorkflowIdentityFields } from "./WorkflowIdentityFields";
import { WorkflowPolicyFields } from "./WorkflowPolicyFields";
import { useWorkflowForm } from "./useWorkflowForm";
export function SiteWorkflowSettings({
  readOnlyPreview = false,
}: {
  readOnlyPreview?: boolean;
}) {
  const query = useCapiroQuery("settings.siteWorkflows.list", {}),
    [selected, select] = useState("");
  const current = query.data?.workflows.find(
    (row) => workflowKey(row) === selected,
  );
  return (
    <StatusPanel
      loading={query.loading}
      error={query.error}
      onRetry={query.reload}
    >
      <SettingsButton small onClick={query.reload}>Refresh workflows</SettingsButton>
      <SettingsNotice title="Website workflows for this workspace">
        Configure the websites and named tasks Meri may use. Enabling a workflow
        requires recorded terms review and website qualification. Browser host
        readiness and the platform's destination restrictions still apply.
      </SettingsNotice>
      <SettingField label="Workflow">
        <select
          className={styles.input}
          value={selected}
          onChange={(e) => select(e.target.value)}
        >
          <option value="">Create a workflow</option>
          {query.data?.workflows.map((row) => (
            <option key={workflowKey(row)} value={workflowKey(row)}>
              {row.manifest.taskSummary} · version {row.manifest.version} ·{" "}
              {row.enabled ? "Enabled" : "Disabled"}
            </option>
          ))}
        </select>
      </SettingField>
      {query.data && (!selected || current) && (
        <WorkflowForm
          key={selected + ":" + (current?.manifest.version ?? 0)}
          initial={current}
          readOnly={readOnlyPreview}
          saved={(row) => {
            select(workflowKey(row));
            query.reload();
          }}
        />
      )}
    </StatusPanel>
  );
}
function WorkflowForm({
  initial,
  saved,
  readOnly,
}: {
  initial?: SiteWorkflowConfiguration;
  saved: (row: SiteWorkflowConfiguration) => void;
  readOnly: boolean;
}) {
  const state = useWorkflowForm(initial, saved, readOnly),
    { mutation, action, locked, value, change } = state;
  return (
    <form className={styles.stack} onSubmit={state.submit}>
      <fieldset disabled={locked} className={styles.stack}>
        <WorkflowIdentityFields
          value={value}
          change={change}
          existing={!!initial}
        />
        <WorkflowPolicyFields
          value={value}
          change={change}
          existing={!!initial}
        />
        <WorkflowConfirmation state={state} />
      </fieldset>
      {action.error && (
        <SettingsNotice error title="Workflow was not confirmed">
          {action.error}
        </SettingsNotice>
      )}
      {action.message && <SettingsNotice title={action.message} />}
      <SettingsMutationNotice
        pending={mutation.pending}
        busy={action.busy}
        reconcile={mutation.reconcile}
      />
    </form>
  );
}
function WorkflowConfirmation({
  state,
}: {
  state: ReturnType<typeof useWorkflowForm>;
}) {
  return (
    <>
      <label className={styles.row}>
        <input
          type="checkbox"
          checked={state.enabled}
          onChange={(e) => state.changeEnabled(e.target.checked)}
        />
        Enable this workflow
      </label>
      <p>
        Saving creates version {state.value.version}. Existing sessions must use
        the current enabled version.
      </p>
      <label className={styles.row}>
        <input
          type="checkbox"
          checked={state.reviewed}
          onChange={(e) => state.setReviewed(e.target.checked)}
        />
        I reviewed the sites, actions, session limits and enablement choice.
      </label>
      <SettingsButton
        primary
        type="submit"
        disabled={!state.reviewed || state.locked}
      >
        {state.action.busy ? "Saving…" : "Save workflow version"}
      </SettingsButton>
    </>
  );
}

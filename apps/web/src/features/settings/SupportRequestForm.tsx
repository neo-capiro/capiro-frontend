"use client";

import { useState } from "react";
import { TextInput, TextArea } from "../../shared/module-ui";
import {
  SettingField,
  SettingsButton,
  SettingsCard,
  SettingsNotice,
  SettingsSwitch,
} from "./components";
import { SettingsMutationNotice } from "./SettingsMutationNotice";
import { useSettingsMutation } from "./useSettingsMutation";
import styles from "./styles";

/** The only submitted content is the text reviewed in this form. */
export function SupportRequestForm() {
  const { api, action, pending, reconcile, locked } =
    useSettingsMutation("support-request");
  const [summary, setSummary] = useState("");
  const [detail, setDetail] = useState("");
  const [includeRun, setIncludeRun] = useState(false);
  const [runReference, setRunReference] = useState("");
  return (
    <SettingsCard
      title="Report a problem"
      description="Save a report for Capiro HQ review."
    >
      <form
        className={styles.stack}
        onSubmit={(event) => {
          event.preventDefault();
          const body = {
            id: crypto.randomUUID(),
            summary: summary.trim(),
            detail: detail.trim(),
            runReference: includeRun ? runReference.trim() : null,
          };
          void action.run(
            (signal) =>
              api.request("settings.support.create", { body }, { signal }),
            (receipt) => `Report saved for HQ review. Request ${receipt.id}.`,
            () => {
              setSummary("");
              setDetail("");
              setIncludeRun(false);
              setRunReference("");
            },
          );
        }}
      >
        <SettingField label="Summary">
          <TextInput
            required
            maxLength={200}
            value={summary}
            disabled={locked}
            onChange={(event) => setSummary(event.target.value)}
          />
        </SettingField>
        <SettingField label="What happened?">
          <TextArea
            required
            maxLength={5000}
            value={detail}
            disabled={locked}
            onChange={(event) => setDetail(event.target.value)}
          />
        </SettingField>
        <SettingsSwitch
          label="Include a run reference"
          checked={includeRun}
          disabled={locked}
          onChange={setIncludeRun}
        />
        {includeRun && (
          <SettingField label="Run reference">
            <TextInput
              required
              maxLength={200}
              value={runReference}
              disabled={locked}
              onChange={(event) => setRunReference(event.target.value)}
            />
          </SettingField>
        )}
        <p className={styles.description}>
          Only the text you enter is included. A run reference does not attach
          or retrieve its content. Attachments are unavailable.
        </p>
        <SettingsButton
          type="submit"
          primary
          disabled={
            locked ||
            !summary.trim() ||
            !detail.trim() ||
            (includeRun && !runReference.trim())
          }
        >
          {action.busy ? "Saving report…" : "Submit report"}
        </SettingsButton>
      </form>
      <SettingsMutationNotice
        pending={pending}
        busy={action.busy}
        reconcile={reconcile}
      />
      {action.error && (
        <SettingsNotice title="Report result not confirmed" error>
          {action.error}
        </SettingsNotice>
      )}
      {action.message && <SettingsNotice title={action.message} />}
    </SettingsCard>
  );
}

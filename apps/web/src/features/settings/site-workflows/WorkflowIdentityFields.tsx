"use client";
import { SettingField, SettingsCard } from "../components";
import styles from "../styles";
import type { WorkflowFieldsProps } from "./form";
export function WorkflowIdentityFields({
  value,
  change,
  existing,
}: WorkflowFieldsProps) {
  return (
    <SettingsCard title="Website and task">
      <WorkflowBasics value={value} change={change} existing={existing} />
      <SettingField label="Sign-in URL">
        <input
          className={styles.input}
          type="url"
          required
          value={value.signInUrl}
          onChange={(e) => change({ ...value, signInUrl: e.target.value })}
        />
      </SettingField>
      <SignedInProbe value={value} change={change} existing={existing} />
      <LinesField
        label="Sensitive element selectors (one per line)"
        values={value.sensitiveSelectors}
        onChange={(sensitiveSelectors) =>
          change({ ...value, sensitiveSelectors })
        }
      />
      <SettingField label="Logout URL (optional)">
        <input
          className={styles.input}
          type="url"
          value={value.logoutUrl ?? ""}
          onChange={(e) =>
            change({ ...value, logoutUrl: e.target.value || null })
          }
        />
      </SettingField>
    </SettingsCard>
  );
}
function LinesField({
  label,
  values,
  onChange,
}: {
  label: string;
  values: string[];
  onChange: (value: string[]) => void;
}) {
  // Preserve a trailing empty line while typing; empty entries are removed only when saving.
  return (
    <SettingField label={label}>
      <textarea
        className={styles.input}
        rows={3}
        value={values.join("\n")}
        onChange={(e) => onChange(e.target.value.split("\n"))}
      />
    </SettingField>
  );
}

function WorkflowBasics({ value, change, existing }: WorkflowFieldsProps) {
  return (
    <>
      <div className={styles.grid}>
        <SettingField label="Website identifier">
          <input
            className={styles.input}
            required
            value={value.siteId}
            disabled={existing}
            placeholder="records-site"
            pattern="[a-z][a-z0-9-]{1,63}"
            onChange={(e) => change({ ...value, siteId: e.target.value })}
          />
        </SettingField>
        <SettingField label="Task identifier">
          <input
            className={styles.input}
            required
            value={value.workflowId}
            disabled={existing}
            placeholder="find-record"
            pattern="[a-z][a-z0-9-]{1,63}"
            onChange={(e) => change({ ...value, workflowId: e.target.value })}
          />
        </SettingField>
      </div>
      <SettingField label="Task description">
        <textarea
          className={styles.input}
          required
          maxLength={500}
          value={value.taskSummary}
          onChange={(e) => change({ ...value, taskSummary: e.target.value })}
        />
      </SettingField>
      <LinesField
        label="Website origins (one HTTPS origin per line)"
        values={value.origins}
        onChange={(origins) => change({ ...value, origins })}
      />
      <LinesField
        label="Sign-in provider origins (one per line)"
        values={value.idpOrigins}
        onChange={(idpOrigins) => change({ ...value, idpOrigins })}
      />
    </>
  );
}

function SignedInProbe({ value, change }: WorkflowFieldsProps) {
  return (
    <>
      <SettingField label="How to detect a signed-in page">
        <select
          className={styles.input}
          value={value.signedInProbe.kind}
          onChange={(e) =>
            change({
              ...value,
              signedInProbe: {
                ...value.signedInProbe,
                kind: e.target.value as "url" | "selector",
              },
            })
          }
        >
          <option value="selector">Page element selector</option>
          <option value="url">Page URL</option>
        </select>
      </SettingField>
      <SettingField
        label={
          value.signedInProbe.kind === "url"
            ? "Signed-in URL"
            : "Signed-in element selector"
        }
      >
        <input
          className={styles.input}
          required
          maxLength={512}
          value={value.signedInProbe.value}
          onChange={(e) =>
            change({
              ...value,
              signedInProbe: { ...value.signedInProbe, value: e.target.value },
            })
          }
        />
      </SettingField>
    </>
  );
}

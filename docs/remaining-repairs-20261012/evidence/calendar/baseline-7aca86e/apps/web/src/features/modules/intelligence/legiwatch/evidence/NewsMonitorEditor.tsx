"use client";
import { useState } from "react";
import {
  ActionButton,
  Field,
  TextInput,
} from "../../../../../shared/module-ui";
import { SelectField } from "../components";
import styles from "../legiwatch.module.css";
import type { EvidenceScope } from "./EvidenceActions";
import {
  useNewsMonitor,
  type MonitorConfig,
  type NewsMonitor,
} from "./use-news-monitor";

export function NewsMonitorEditor({
  monitor,
  scope,
  onSaved,
}: {
  monitor: NewsMonitor;
  scope: EvidenceScope;
  onSaved: () => void;
}) {
  const model = useNewsMonitor(monitor, scope, onSaved),
    pending = model.save.pending || model.scan.pending;
  return (
    <article className={styles.listItem}>
      <strong>
        {monitor.config.name || monitor.source?.raw || "Imported news monitor"}
      </strong>
      <fieldset disabled={pending} className={styles.form}>
        <MonitorFields
          id={monitor.id}
          config={model.config}
          update={model.update}
        />
        <SelectField
          id={`monitor-state-${monitor.id}`}
          label="State"
          value={model.state}
          onChange={(value) => {
            if (
              value === "active" ||
              value === "paused" ||
              value === "excluded"
            )
              model.setState(value);
          }}
        >
          <option value="paused">Paused</option>
          <option value="active">Active</option>
          <option value="excluded">Excluded</option>
        </SelectField>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={model.config.scopeAccepted}
            onChange={(event) =>
              model.update({ scopeAccepted: event.target.checked })
            }
          />
          Accept this query revision, text coverage and selected publishers
          before activation.
        </label>
      </fieldset>
      <div className={styles.actions}>
        <ActionButton
          primary
          disabled={
            pending ||
            !model.config.query ||
            (model.state === "active" && !model.config.scopeAccepted)
          }
          onClick={() => void model.submit()}
        >
          Save configuration
        </ActionButton>
        <ActionButton
          disabled={pending || monitor.state !== "active"}
          onClick={() => void model.runScan()}
        >
          Run saved monitor scan
        </ActionButton>
      </div>
      <SavedMonitorStatus monitor={monitor} />
      {model.save.error && (
        <p role="alert" className={styles.error}>
          {model.save.error.message}
        </p>
      )}
      {model.scan.error && (
        <p role="alert" className={styles.error}>
          {model.scan.error.message} Retained evidence remains available.
        </p>
      )}
      {model.scan.data && (
        <p className={styles.banner}>
          Scan {model.scan.data.state.replaceAll("_", " ")} ·{" "}
          {model.scan.data.matches} matches
          {model.scan.data.reason ? ` · ${model.scan.data.reason}` : ""}
        </p>
      )}
    </article>
  );
}
function MonitorFields({
  id,
  config,
  update,
}: {
  id: string;
  config: MonitorConfig;
  update: (patch: Partial<MonitorConfig>) => void;
}) {
  const [sourceText, setSourceText] = useState(config.sources.join(", "));
  return (
    <>
      <Field label="Name" htmlFor={`monitor-name-${id}`}>
        <TextInput
          id={`monitor-name-${id}`}
          value={config.name}
          maxLength={200}
          onChange={(event) => update({ name: event.target.value })}
        />
      </Field>
      <Field label="Query" htmlFor={`monitor-query-${id}`}>
        <TextInput
          id={`monitor-query-${id}`}
          value={config.query}
          maxLength={2000}
          onChange={(event) => update({ query: event.target.value })}
        />
      </Field>
      <SelectField
        id={`monitor-provider-${id}`}
        label="Provider"
        value={config.provider}
        onChange={(value) => {
          if (value === "rss" || value === "newscatcher")
            update({ provider: value });
        }}
      >
        <option value="newscatcher">NewsCatcher</option>
        <option value="rss">Retained RSS feeds</option>
      </SelectField>
      <SelectField
        id={`monitor-fields-${id}`}
        label="Text coverage"
        value={config.fields}
        onChange={(value) => {
          if (
            value === "title" ||
            value === "title_summary" ||
            value === "available_text"
          )
            update({ fields: value });
        }}
      >
        <option value="title">Title</option>
        <option value="title_summary">Title and summary</option>
        <option value="available_text">
          Available text (partial bodies may limit matching)
        </option>
      </SelectField>
      <Field
        label="Selected publisher domains, separated by commas"
        htmlFor={`monitor-sources-${id}`}
      >
        <TextInput
          id={`monitor-sources-${id}`}
          value={sourceText}
          onChange={(event) => {
            setSourceText(event.target.value);
            update({
              sources: event.target.value
                .split(",")
                .map((source) => source.trim())
                .filter(Boolean),
            });
          }}
        />
      </Field>
    </>
  );
}
function SavedMonitorStatus({ monitor }: { monitor: NewsMonitor }) {
  return (
    <div className={styles.banner}>
      <strong>Saved monitor status</strong>
      <p>
        Version {monitor.version} · {monitor.state} · Baseline{" "}
        {monitor.baseline_at ?? "not established"} · Checkpoint{" "}
        {monitor.checkpoint ?? "not established"}
      </p>
      {monitor.interpretation && (
        <p>
          {monitor.interpretation.interpretation ??
            monitor.interpretation.providerQuery ??
            monitor.interpretation.status}
          {monitor.interpretation.reasons?.length
            ? ` · ${monitor.interpretation.reasons.join(", ")}`
            : ""}
        </p>
      )}
      {monitor.last_error && <p>Last scan issue: {monitor.last_error}</p>}
      <p>
        Edited queries are compiled and validated when saved. No separate
        scan-history endpoint is available.
      </p>
    </div>
  );
}

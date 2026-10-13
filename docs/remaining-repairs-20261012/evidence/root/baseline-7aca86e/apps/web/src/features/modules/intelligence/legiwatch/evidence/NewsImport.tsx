"use client";
import {
  ActionButton,
  DataTable,
  Field,
  Panel,
} from "../../../../../shared/module-ui";
import styles from "../legiwatch.module.css";
import { useNewsImport } from "./use-news-import";

export function NewsImport({ onStaged }: { onStaged: () => void }) {
  const { capture, error, preview, stage, pending, load, review, apply } =
    useNewsImport(onStaged);
  return (
    <Panel
      title="Source capture import"
      description="Review source changes, then stage inactive definitions. Existing local edits are preserved; this does not activate alerts or delivery."
    >
      <div className={styles.form}>
        <Field label="Captured source file" htmlFor="news-capture">
          <input
            id="news-capture"
            type="file"
            accept="application/json,.json"
            disabled={pending}
            onChange={(event) => void load(event.target.files?.[0])}
          />
        </Field>
        {capture && (
          <p className={styles.description}>
            {capture.capture} · {capture.keywords.length} keywords ·{" "}
            {capture.alerts.length} alert families
          </p>
        )}
        <div className={styles.actions}>
          <ActionButton
            disabled={!capture || pending}
            onClick={() => void review()}
          >
            Review import
          </ActionButton>
          <ActionButton
            primary
            disabled={!preview.data || pending || Boolean(stage.data)}
            onClick={() => void apply()}
          >
            Stage inactive definitions
          </ActionButton>
        </div>
        {preview.data && (
          <NewsImportDecisions decisions={preview.data.decisions} />
        )}
        {(error || preview.error || stage.error) && (
          <p className={styles.error} role="alert">
            {error || preview.error?.message || stage.error?.message}
          </p>
        )}
        {stage.data && (
          <p className={styles.success} role="status">
            Staged {stage.data.insertedDefinitions} keyword definitions and{" "}
            {stage.data.insertedFamilies} alert families. Monitoring and sending
            remain inactive.
          </p>
        )}
      </div>
    </Panel>
  );
}

function NewsImportDecisions({
  decisions,
}: {
  decisions: NonNullable<
    ReturnType<typeof useNewsImport>["preview"]["data"]
  >["decisions"];
}) {
  return (
    <DataTable
      caption="News import source decisions"
      rows={decisions}
      rowKey={(row) => row.sourceKey}
      columns={[
        { key: "query", label: "Source query", render: (row) => row.raw },
        {
          key: "decision",
          label: "Review outcome",
          render: (row) => row.decision.replaceAll("_", " "),
        },
        {
          key: "version",
          label: "Existing version",
          render: (row) => row.localVersion ?? "New",
        },
      ]}
    />
  );
}

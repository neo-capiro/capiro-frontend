"use client";
import Link from "next/link";
import { useState } from "react";
import {
  useCapiroMutation,
  useCapiroQuery,
} from "../../../../../shared/capiro/queries";
import {
  ActionButton,
  Modal,
  StatusPanel,
} from "../../../../../shared/module-ui";
import { SelectField } from "../components";
import styles from "../legiwatch.module.css";
import { KeywordPromotion } from "./KeywordPromotion";
export function ImportItem({
  runId,
  itemId,
  sourceAccount,
  onClose,
}: {
  runId: string;
  itemId: string;
  sourceAccount: string;
  onClose: () => void;
}) {
  const query = useCapiroQuery("legiwatch.import.item", {
    params: { id: runId, itemId },
  });
  const row = query.data,
    family = row?.payload.raw.family;
  const ruleFamily =
    family === "Tagged Bill Agenda"
      ? "agenda"
      : family === "Bill Action and Amendments Filed Alert"
        ? "record"
        : null;
  return (
    <Modal
      open
      title="Imported source evidence"
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <StatusPanel
        loading={query.loading}
        error={query.error}
        onRetry={query.reload}
      >
        {row && (
          <div className={styles.form}>
            <h3>{row.sourceId}</h3>
            <p>
              {row.kind} · {row.status}
            </p>
            {row.reason && <p className={styles.gap}>{row.reason}</p>}
            <details open>
              <summary>Captured source fields</summary>
              <pre className={styles.briefText}>
                {JSON.stringify(row.payload.raw, null, 2)}
              </pre>
            </details>
            <details>
              <summary>Reviewed mapping</summary>
              <pre className={styles.briefText}>
                {JSON.stringify(row.payload.resolved, null, 2)}
              </pre>
            </details>
            <p className={styles.description}>
              Source fingerprint: {row.payload.rawHash}
            </p>
            {row.targetId && family === "Bill Keyword Alert" && (
              <KeywordPromotion
                stagedId={row.targetId}
                sourceAccount={sourceAccount}
              />
            )}
            {(row.kind === "statute" || family === "Statute Alert") && (
              <Link
                className={styles.link}
                href="/modules/intelligence?view=legiwatch&lw=more&lwMore=research-imports"
              >
                Review captured statute sources and mappings
              </Link>
            )}
            {row.targetId && ruleFamily && (
              <RulePromotion id={row.targetId} family={ruleFamily} />
            )}
            {row.targetId && row.kind === "report" && (
              <ReportPromotion id={row.targetId} />
            )}
          </div>
        )}
      </StatusPanel>
    </Modal>
  );
}
function ReportPromotion({ id }: { id: string }) {
  const mutation = useCapiroMutation("legiwatch.import.report.promote");
  const promote = async () => {
    try {
      await mutation.run({ params: { id } });
    } catch {
      /* Preserve the staged definition. */
    }
  };
  return (
    <div className={styles.form}>
      <ActionButton disabled={mutation.pending} onClick={() => void promote()}>
        Promote report as an inactive draft
      </ActionButton>
      {mutation.data && (
        <p role="status">
          {mutation.data.state} ·{" "}
          {mutation.data.reason ??
            "Open Reports to review the promoted definition."}
        </p>
      )}
      {mutation.error && <p role="alert">{mutation.error.message}</p>}
    </div>
  );
}
function RulePromotion({
  id,
  family,
}: {
  id: string;
  family: "record" | "agenda";
}) {
  const mutation = useCapiroMutation(
    family === "agenda"
      ? "legiwatch.import.agenda.promote"
      : "legiwatch.import.record.promote",
  );
  const rules = useCapiroQuery(
    family === "agenda" ? "legiwatch.rules.agenda" : "legiwatch.rules.record",
    {},
  );
  const [existing, setExisting] = useState(""),
    [confirmed, setConfirmed] = useState(false);
  const promote = async () => {
    try {
      await mutation.run({
        params: { id },
        body: {
          ...(existing ? { existingRuleId: existing } : {}),
          confirmNewDefinition: confirmed,
          userMappings: {},
        },
      });
    } catch {
      /* Existing definitions are never overwritten. */
    }
  };
  return (
    <div className={styles.form}>
      <p className={styles.banner}>
        Promotion creates an inactive rule or links this capture to an existing
        rule while preserving its edits. Review staff channels in Monitoring
        before activation.
      </p>
      <SelectField
        id="import-existing-rule"
        label="Reconcile captured rule"
        value={existing}
        onChange={(value) => {
          setExisting(value);
          setConfirmed(false);
          mutation.reset();
        }}
      >
        <option value="">Create a new inactive definition</option>
        {rules.data?.map((rule) => (
          <option key={rule.id} value={rule.id}>
            {rule.name}
          </option>
        ))}
      </SelectField>
      {!existing && (
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
          />
          This capture represents a new definition.
        </label>
      )}
      <ActionButton
        disabled={mutation.pending || (!existing && !confirmed)}
        onClick={() => void promote()}
      >
        Promote reviewed definition
      </ActionButton>
      {mutation.data && (
        <p role="status">
          {mutation.data.state} ·{" "}
          {mutation.data.reason ?? "Review the resulting rule in Monitoring."}
          {mutation.data.sourceChanged
            ? " The source capture changed; review it again."
            : ""}
        </p>
      )}
      {mutation.error && <p role="alert">{mutation.error.message}</p>}
    </div>
  );
}

"use client";
import { useState } from "react";
import type { z } from "zod";
import type { keywordRule } from "../../../../../shared/capiro/operations/legiwatch-keyword-schemas";
import {
  useCapiroMutation,
  useCapiroQuery,
} from "../../../../../shared/capiro/queries";
import { ActionButton, StatusPanel } from "../../../../../shared/module-ui";
import styles from "../legiwatch.module.css";
import { KeywordMappings } from "./KeywordMappings";
export function KeywordDelivery({
  rule,
  onSaved,
}: {
  rule: z.infer<typeof keywordRule>;
  onSaved: () => void;
}) {
  const [inspect, setInspect] = useState(false),
    [confirmed, setConfirmed] = useState(false);
  const query = useCapiroQuery(
      "legiwatch.keyword.delivery.preview",
      { params: { id: rule.id } },
      { enabled: inspect },
    ),
    mutation = useCapiroMutation("legiwatch.keyword.delivery.activate");
  const setEnabled = async (enabled: boolean) => {
    try {
      await mutation.run({
        params: { id: rule.id },
        body: {
          expectedVersion: rule.version,
          enabled,
          ...(enabled ? { previewHash: query.data?.previewHash } : {}),
        },
      });
      onSaved();
    } catch {
      /* Channels remain subject to current backend qualification. */
    }
  };
  return (
    <div className={styles.form}>
      <KeywordMappings rule={rule} onSaved={onSaved} />
      <ActionButton
        disabled={mutation.pending}
        onClick={() => {
          setInspect(true);
          setConfirmed(false);
          query.reload();
        }}
      >
        Check staff delivery readiness
      </ActionButton>
      <StatusPanel
        loading={query.loading}
        error={query.error}
        onRetry={query.reload}
      >
        {query.data && (
          <>
            <p>
              {query.data.recipientCount} staff recipients in this saved
              version.
            </p>
            {query.data.issues.map((issue) => (
              <p className={styles.gap} key={issue}>
                {issue}
              </p>
            ))}
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={confirmed}
                disabled={query.data.issues.length > 0 || mutation.pending}
                onChange={(event) => setConfirmed(event.target.checked)}
              />
              Activate these reviewed staff channels and cadence.
            </label>
          </>
        )}
      </StatusPanel>
      <div className={styles.actions}>
        <ActionButton
          primary
          disabled={
            !confirmed ||
            !query.data ||
            query.data.issues.length > 0 ||
            mutation.pending
          }
          onClick={() => void setEnabled(true)}
        >
          Activate reviewed delivery
        </ActionButton>
        <ActionButton
          disabled={!rule.config.deliveryEnabled || mutation.pending}
          onClick={() => void setEnabled(false)}
        >
          Pause staff delivery
        </ActionButton>
      </div>
      {mutation.error && <p role="alert">{mutation.error.message}</p>}
    </div>
  );
}

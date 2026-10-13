"use client";
import { useState } from "react";
import {
  useCapiroMutation,
  useCapiroQuery,
} from "../../../../../shared/capiro/queries";
import {
  ActionButton,
  Field,
  StatusPanel,
  TextInput,
} from "../../../../../shared/module-ui";
import { SelectField } from "../components";
import styles from "../legiwatch.module.css";
export function KeywordPromotion({
  stagedId,
  sourceAccount,
}: {
  stagedId: string;
  sourceAccount: string;
}) {
  const query = useCapiroQuery("legiwatch.keyword.staged", {
      query: { sourceAccount },
    }),
    rules = useCapiroQuery("legiwatch.keywords", {});
  const row = query.data?.rules.find((item) => item.id === stagedId),
    mutation = useCapiroMutation("legiwatch.keyword.promote");
  const [jurisdiction, setJurisdiction] = useState("FL"),
    [sessionKey, setSession] = useState(""),
    [existing, setExisting] = useState(""),
    [reviewed, setReviewed] = useState(false);
  const promote = async () => {
    if (!row) return;
    try {
      await mutation.run({
        params: { id: row.id },
        body: {
          expectedVersion: row.version,
          sourceHash: row.sourceHash,
          scope: {
            jurisdiction,
            sessionKey,
            fields: ["title", "bill_text", "amendment_text"],
          },
          ...(existing ? { existingRuleId: existing } : {}),
        },
      });
    } catch {
      /* Conflicting captures require reconciliation. */
    }
  };
  return (
    <StatusPanel
      loading={query.loading || rules.loading}
      error={query.error ?? rules.error}
      onRetry={() => {
        query.reload();
        rules.reload();
      }}
    >
      {row ? (
        <fieldset disabled={mutation.pending} className={styles.form}>
          <p className={styles.banner}>
            Promotion retains exact captured keyword selections. The rule stays
            inactive until semantics, target folders, current staff and a
            complete preview scan are reviewed.
          </p>
          <SelectField
            id="keyword-import-existing"
            label="Reconcile keyword definition"
            value={existing}
            onChange={(value) => {
              setExisting(value);
              setReviewed(false);
            }}
          >
            <option value="">Create new inactive rule</option>
            {rules.data?.map((rule) => (
              <option key={rule.id} value={rule.id}>
                {rule.name}
              </option>
            ))}
          </SelectField>
          <Field label="Jurisdiction" htmlFor="keyword-import-jurisdiction">
            <TextInput
              id="keyword-import-jurisdiction"
              maxLength={2}
              value={jurisdiction}
              onChange={(event) => {
                setJurisdiction(event.target.value.toUpperCase());
                setReviewed(false);
              }}
            />
          </Field>
          <Field label="Session" htmlFor="keyword-import-session">
            <TextInput
              id="keyword-import-session"
              maxLength={60}
              value={sessionKey}
              onChange={(event) => {
                setSession(event.target.value);
                setReviewed(false);
              }}
            />
          </Field>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={reviewed}
              onChange={(event) => setReviewed(event.target.checked)}
            />
            I reviewed this capture and its intended jurisdiction and session.
          </label>
          <ActionButton
            disabled={
              !reviewed ||
              !sessionKey.trim() ||
              !/^[A-Z]{2}$/.test(jurisdiction) ||
              Boolean(mutation.data)
            }
            onClick={() => void promote()}
          >
            Promote inactive keyword rule
          </ActionButton>
          {mutation.data && (
            <p role="status">
              {mutation.data.state.replaceAll("_", " ")} · Continue in
              Monitoring → Keyword rules.
            </p>
          )}
          {mutation.error && <p role="alert">{mutation.error.message}</p>}
        </fieldset>
      ) : (
        <p>
          No current staged keyword definition was found. Refresh the import
          before promoting.
        </p>
      )}
    </StatusPanel>
  );
}

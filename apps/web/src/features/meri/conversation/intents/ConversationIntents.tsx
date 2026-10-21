"use client";
import { useState } from "react";
import { Button } from "@capiro/ui/button";
import type { IntentsAccess } from "../../../../shared/meri-intents/access";
import { StatusPill } from "../../ui/StatusPill";
import type { IntentField, IntentRow } from "./intent-view";
import {
  useConversationIntents,
  type Attempt,
  type Choice,
  type IntentScope,
} from "./useConversationIntents";
import styles from "./intents.module.css";

function FieldList({
  fields,
  label,
}: {
  fields: readonly IntentField[];
  label?: string;
}) {
  if (fields.length === 0) return null;
  return (
    <dl className={styles.fields} aria-label={label}>
      {fields.map((field) => (
        <div key={field.label}>
          <dt>{field.label}</dt>
          <dd
            className={field.label === "Command hash" ? styles.hash : undefined}
          >
            {field.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Two explicit steps for a decision; after an uncertain attempt only the identical request can be sent again. */
function DecisionControls({
  row,
  attempt,
  onDecide,
}: {
  row: IntentRow;
  attempt: Attempt | undefined;
  onDecide: (row: IntentRow, decision: Choice) => void;
}) {
  const [confirming, setConfirming] = useState<Choice | null>(null);
  const busy = attempt?.state === "pending";
  if (attempt?.state === "uncertain")
    return (
      <>
        <p role="status" className={styles.refusal}>
          We could not confirm whether your decision to{" "}
          {attempt.decision === "approved" ? "approve" : "reject"} this was
          recorded. Checking sends the same request again; nothing new is
          created.
        </p>
        <div className={styles.actions}>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => onDecide(row, attempt.decision)}
          >
            Check result
          </Button>
        </div>
      </>
    );
  if (row.decision !== "approvable") return null;
  if (!confirming)
    return (
      <div className={styles.actions}>
        <Button
          type="button"
          disabled={busy}
          onClick={() => setConfirming("approved")}
        >
          Approve…
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => setConfirming("rejected")}
        >
          Reject…
        </Button>
      </div>
    );
  return (
    <div
      className={styles.confirm}
      role="group"
      aria-label="Confirm your decision"
    >
      <p>
        {confirming === "approved"
          ? "Approve exactly this action? Meri will carry it out once."
          : "Reject this action? Nothing will be executed."}
      </p>
      <div className={styles.actions}>
        <Button
          type="button"
          disabled={busy}
          onClick={() => {
            setConfirming(null);
            onDecide(row, confirming);
          }}
        >
          {confirming === "approved" ? "Confirm approval" : "Confirm rejection"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => setConfirming(null)}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

/** One prepared action with its exact retained content and the person's decision controls. */
function IntentCard({
  row,
  attempt,
  onDecide,
}: {
  row: IntentRow;
  attempt: Attempt | undefined;
  onDecide: (row: IntentRow, decision: Choice) => void;
}) {
  const titleId = `intent-${row.deliveryId.slice(4, 16)}`;
  return (
    <article className={styles.card} aria-labelledby={titleId}>
      <header className={styles.header}>
        <h3 id={titleId}>{row.title}</h3>
        <StatusPill tone={row.tone}>{row.status}</StatusPill>
      </header>
      <p className={styles.muted}>{row.detail}</p>
      <FieldList fields={row.fields} />
      <FieldList fields={row.result} label="Recorded result" />
      {attempt?.state === "refused" && (
        <p role="status" className={styles.refusal}>
          {attempt.message}
        </p>
      )}
      <DecisionControls row={row} attempt={attempt} onDecide={onDecide} />
    </article>
  );
}

function Body({
  list,
  rows,
  attempts,
  retry,
  loadMore,
  decide,
}: ReturnType<typeof useConversationIntents>) {
  if (list.status === "disabled")
    return (
      <p className={styles.muted}>
        Approval decisions are not enabled for this deployment yet.
      </p>
    );
  if (list.status === "loading")
    return <p className={styles.muted}>Reading the actions Meri prepared…</p>;
  if (list.status === "unavailable")
    return (
      <p className={styles.muted} role="status">
        Prepared actions could not be read right now. Nothing was approved or
        executed.{" "}
        <Button type="button" variant="outline" onClick={retry}>
          Try again
        </Button>
      </p>
    );
  if (rows.length === 0)
    return (
      <p className={styles.muted}>
        Meri has not prepared any actions for your approval in this
        conversation.
      </p>
    );
  return (
    <>
      <ul className={styles.list}>
        {rows.map((row) => (
          <li key={row.deliveryId}>
            <IntentCard
              row={row}
              attempt={
                row.proposal ? attempts[row.proposal.proposalId] : undefined
              }
              onDecide={decide}
            />
          </li>
        ))}
      </ul>
      {list.next && (
        <Button
          type="button"
          variant="outline"
          disabled={list.loadingMore}
          onClick={loadMore}
        >
          Show more
        </Button>
      )}
    </>
  );
}

/**
 * The conversation's prepared actions. Everything shown is read from Meri's durable intent list; a
 * decision is recorded only by Meri's decision owner, and nothing here approves on its own.
 */
export function ConversationIntents({
  access,
  scope,
  refreshKey,
}: {
  access: IntentsAccess;
  scope: IntentScope;
  /** Changes when the conversation shows new approval or file activity, so the list is read again. */
  refreshKey?: string;
}) {
  const state = useConversationIntents(
    access,
    scope,
    refreshKey === undefined ? {} : { refreshKey },
  );
  return (
    <section className={styles.panel} aria-labelledby="conversation-actions">
      <div className={styles.panelHeader}>
        <h2 id="conversation-actions">Actions for your approval</h2>
        {state.list.status === "ready" && (
          <Button
            type="button"
            variant="outline"
            onClick={() => void state.refresh()}
          >
            Refresh
          </Button>
        )}
      </div>
      <Body {...state} />
    </section>
  );
}

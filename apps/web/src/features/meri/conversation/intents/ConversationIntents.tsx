"use client";
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { workspaceTaskHref } from "../../../modules/workspace/task-destination-public";
import type { IntentsItem } from "@capiro/meri-client/intents";
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
import { ConversationRoutine } from "../../routines/ConversationRoutine";
import { isClientRecordProposal } from "./client-record-view";
import { isLegiwatchProposal } from "./legiwatch-view";
import { isResearchShareProposal } from "./research-share-view";
import { isMailSendProposal } from "./mail-view";
import { ResearchShareReview } from "./ResearchShareReview";
import { ResearchShareResult } from "./ResearchShareResult";

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

/** Explicit confirmation; uncertain sharing actions read their owner status without another write. */
function DecisionControls({
  row,
  attempt,
  onDecide,
  onRefresh,
  disabled,
  approvalDisabled = false,
}: {
  row: IntentRow;
  attempt: Attempt | undefined;
  onDecide: (row: IntentRow, decision: Choice) => void;
  onRefresh: () => void;
  disabled: boolean;
  approvalDisabled?: boolean;
}) {
  const [confirming, setConfirming] = useState<Choice | null>(null);
  const busy = disabled || attempt?.state === "pending";
  const sharing = row.proposal && isResearchShareProposal(row.proposal);
  const legiwatch = row.proposal && isLegiwatchProposal(row.proposal);
  const clientRecord = row.proposal && isClientRecordProposal(row.proposal);
  const mail = row.proposal && isMailSendProposal(row.proposal);
  if (attempt?.state === "uncertain")
    return (
      <>
        <p role="status" className={styles.refusal}>
          {clientRecord
            ? "The client action outcome is not confirmed. Check the current recorded status; the action will not be sent again."
            : legiwatch
              ? "The suggestion action outcome is not confirmed. Check the current recorded status; the action will not be sent again."
              : sharing
                ? "The share action outcome is not confirmed. Check the current recorded status before any new action."
                : mail
                  ? "The message outcome is not confirmed. Check the current recorded status; the message will not be sent again."
                  : (attempt.message ?? (
                      <>
                        We could not confirm whether your decision to{" "}
                        {attempt.decision === "approved" ? "approve" : "reject"}{" "}
                        this was recorded. Checking sends the same request again
                        to recover its outcome.
                      </>
                    ))}
        </p>
        <div className={styles.actions}>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() =>
              sharing || legiwatch || clientRecord || mail
                ? onRefresh()
                : onDecide(row, attempt.decision)
            }
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
          disabled={busy || approvalDisabled}
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
          disabled={busy || (confirming === "approved" && approvalDisabled)}
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
  onRefresh,
  disabled,
}: {
  row: IntentRow;
  attempt: Attempt | undefined;
  onDecide: (row: IntentRow, decision: Choice) => void;
  onRefresh: () => void;
  disabled: boolean;
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
      {row.task && (
        <Button variant="outline" asChild>
          <Link prefetch={false} href={workspaceTaskHref(row.task)}>
            Open task in Workspace
          </Link>
        </Button>
      )}
      {row.proposal &&
      isResearchShareProposal(row.proposal) &&
      row.decision === "approvable" ? (
        <ResearchShareReview proposal={row.proposal}>
          {(ready) => (
            <DecisionControls
              row={row}
              attempt={attempt}
              onDecide={onDecide}
              onRefresh={onRefresh}
              disabled={disabled}
              approvalDisabled={!ready}
            />
          )}
        </ResearchShareReview>
      ) : (
        <DecisionControls
          row={row}
          attempt={attempt}
          onDecide={onDecide}
          onRefresh={onRefresh}
          disabled={disabled}
        />
      )}
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
  refresh,
  decisionsReady,
  recoveryError,
  access,
}: ReturnType<typeof useConversationIntents> & { access: IntentsAccess }) {
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
        Prepared actions could not be read right now. Their outcomes remain
        unconfirmed.{" "}
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
        {!decisionsReady && (
          <li role="status">
            {recoveryError ??
              "Checking saved decisions before another request…"}
          </li>
        )}
        {rows.map((row) => {
          const item = list.items.find(
            (item) => item.deliveryId === row.deliveryId,
          );
          const schedule =
            item?.state === "prepared" &&
            item.kind === "schedule_proposal" &&
            "proposal" in item
              ? item
              : null;
          return (
            <li key={row.deliveryId}>
              {schedule && access.routines ? (
                <ConversationRoutine
                  item={schedule}
                  connection={access.routines}
                />
              ) : (
                <IntentCard
                  row={row}
                  attempt={
                    row.proposal ? attempts[row.proposal.proposalId] : undefined
                  }
                  onDecide={decide}
                  onRefresh={() => void refresh()}
                  disabled={!decisionsReady}
                />
              )}
            </li>
          );
        })}
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
  onDecisionSettled,
  children,
}: {
  access: IntentsAccess;
  scope: IntentScope;
  /** Changes when the conversation shows new approval or file activity, so the list is read again. */
  refreshKey?: string;
  onDecisionSettled?: ((runId: string) => void) | undefined;
  /** Reuse this current, authorized list for adjacent file presentation. */
  children?: (items: readonly IntentsItem[]) => ReactNode;
}) {
  const state = useConversationIntents(access, scope, {
    ...(refreshKey === undefined ? {} : { refreshKey }),
    ...(onDecisionSettled ? { onDecisionSettled } : {}),
  });
  const key = JSON.stringify([
    scope.tenantId,
    scope.actorId,
    scope.conversationId,
  ]);
  const [retained, setRetained] = useState({ key, list: state.list });
  // Credential renewal rereads the same list. Keep adjacent file cards mounted only while it loads;
  // fresh refusal/removal still clears them, and decisions always use the current list above.
  if (
    retained.key !== key ||
    (state.list.status !== "loading" && retained.list !== state.list)
  )
    setRetained({ key, list: state.list });
  const displayed =
    state.list.status === "loading" && retained.key === key
      ? retained.list
      : state.list;
  return (
    <>
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
        <Body {...state} access={access} />
        {state.oneTimeResults.map((result) => (
          <ResearchShareResult
            key={`${result.proposalId}:${result.commandSha256}`}
            sharePath={result.sharePath}
            onDismiss={() => state.dismissOneTime(result.proposalId)}
          />
        ))}
      </section>
      {children?.(displayed.status === "ready" ? displayed.items : [])}
    </>
  );
}

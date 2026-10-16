"use client";

import { useState } from "react";
import type { StrategyRun } from "../../../../shared/capiro/operations/strategies-agents";
import { useCapiroMutation } from "../../../../shared/capiro/queries";
import {
  ActionButton,
  Field,
  Modal,
  TextArea,
} from "../../../../shared/module-ui";
import { policyAllows } from "./run-model";
import { RunPlanStepLink } from "./RunPlanStepLink";
import styles from "./runs.module.css";

type Action = "execute" | "resume" | "cancel" | "retry" | "mark_failed";
const descriptions: Record<
  Action,
  { title: string; confirm: string; text: string }
> = {
  execute: {
    title: "Execute this run?",
    confirm: "Execute run",
    text: "Create the planned internal Workspace drafts or Outreach records. External sending is handled in the destination workflow.",
  },
  resume: {
    title: "Resume this run?",
    confirm: "Resume run",
    text: "Recheck the blocker and continue this existing attempt. Linked outputs are retained.",
  },
  cancel: {
    title: "Cancel this run?",
    confirm: "Cancel run",
    text: "Stop this attempt. Any outputs already staged remain linked in its history.",
  },
  retry: {
    title: "Start another attempt?",
    confirm: "Retry run",
    text: "Create a new attempt with lineage to this run. The backend checks for existing artifacts before staging.",
  },
  mark_failed: {
    title: "Mark this run as failed?",
    confirm: "Mark failed",
    text: "Record that this recoverable run cannot continue. Add a reason to its audit history.",
  },
};
export function RunActions({
  run,
  policy,
  onReview,
  onUpdated,
}: {
  run: StrategyRun;
  policy: { state: string; actions: string[]; reason: string };
  onReview: () => void;
  onUpdated: (run: StrategyRun) => void;
}) {
  const [action, setAction] = useState<Action>();
  const [reason, setReason] = useState("");
  const execute = useCapiroMutation("strategies.run.execute");
  const resume = useCapiroMutation("strategies.run.resume");
  const cancel = useCapiroMutation("strategies.run.cancel");
  const retry = useCapiroMutation("strategies.run.retry");
  const failed = useCapiroMutation("strategies.run.mark-failed");
  const active =
    action === "execute"
      ? execute
      : action === "resume"
        ? resume
        : action === "cancel"
          ? cancel
          : action === "retry"
            ? retry
            : failed;
  const allowed = (value: string) =>
    policy.state === run.state && policyAllows(policy.actions, value);
  async function confirm() {
    if (!action || !allowed(action)) return;
    try {
      const input = { params: { id: run.id } };
      const updated =
        action === "mark_failed"
          ? await failed.run({
              ...input,
              body: { reason: reason.trim() || undefined },
            })
          : action === "execute"
            ? await execute.run(input)
            : action === "resume"
              ? await resume.run(input)
              : action === "cancel"
                ? await cancel.run(input)
                : await retry.run(input);
      setAction(undefined);
      onUpdated(updated);
    } catch {
      /* Keep the confirmation and backend error visible; never replay writes. */
    }
  }
  function select(value: Action) {
    [execute, resume, cancel, retry, failed].forEach((mutation) =>
      mutation.reset(),
    );
    setReason("");
    setAction(value);
  }
  const node = run.findings?.execution;
  return (
    <>
      <div className={styles.actions} aria-label="Allowed run actions">
        {allowed("approve") && (
          <ActionButton onClick={onReview}>Review exact content</ActionButton>
        )}
        {(["execute", "resume", "retry", "cancel", "mark_failed"] as const)
          .filter(allowed)
          .map((value) => (
            <ActionButton
              primary={value === "execute" || value === "resume"}
              key={value}
              onClick={() => select(value)}
            >
              {descriptions[value].confirm}
            </ActionButton>
          ))}
        {node && allowed("return_to_node") && <RunPlanStepLink run={run} />}
      </div>
      {policy.state !== run.state && (
        <p role="alert">
          The run changed while its policy loaded. Refresh before acting.
        </p>
      )}
      {allowed("reconcile") && (
        <p className={styles.muted}>
          Reconciliation is available in the backend policy. Reload the run
          after resolving artifact staging in its destination workflow.
        </p>
      )}
      <Modal
        open={Boolean(action)}
        onOpenChange={(open) => {
          if (!open && !active.pending) setAction(undefined);
        }}
        title={action ? descriptions[action].title : "Run action"}
        description={action ? descriptions[action].text : undefined}
        footer={
          <>
            <ActionButton
              disabled={active.pending}
              onClick={() => setAction(undefined)}
            >
              Keep run
            </ActionButton>
            <ActionButton
              primary
              disabled={active.pending || !action || !allowed(action)}
              onClick={confirm}
            >
              {active.pending
                ? "Saving…"
                : action
                  ? descriptions[action].confirm
                  : "Confirm"}
            </ActionButton>
          </>
        }
      >
        {action === "mark_failed" && (
          <Field label="Failure reason" htmlFor="run-failure-reason">
            <TextArea
              id="run-failure-reason"
              value={reason}
              maxLength={2000}
              onChange={(event) => setReason(event.target.value)}
            />
          </Field>
        )}
        {active.error && (
          <p role="alert" className={styles.error}>
            {active.error.message}
          </p>
        )}
      </Modal>
    </>
  );
}

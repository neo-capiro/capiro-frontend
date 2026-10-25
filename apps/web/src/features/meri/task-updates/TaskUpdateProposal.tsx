import { useState } from "react";
import { Button } from "@capiro/ui/button";
import type {
  TaskUpdateProposalView,
  TaskUpdateExecutionView,
} from "../../../shared/meri-task-commands/workflow-port";
import styles from "./workflow.module.css";

export function TaskUpdateProposal({
  proposal,
  execution,
  disabled,
  onExecute,
}: {
  proposal: TaskUpdateProposalView;
  execution: TaskUpdateExecutionView | null;
  disabled: boolean;
  onExecute: () => void;
}) {
  const [approved, setApproved] = useState(false);
  const observed = execution?.status === "observed" ? execution : null;
  return (
    <section
      className={styles.panel}
      aria-label="Immutable task update proposal"
    >
      <h2>{observed ? "Task update confirmed" : "Ready for your approval"}</h2>
      <p>
        Preparation did not execute this update. Review the changes below, then
        approve and execute them. The service checks your current authority.
      </p>
      <dl className={styles.details}>
        <dt>Task ID</dt>
        <dd>{proposal.taskId}</dd>
        <dt>Title change</dt>
        <dd>{proposal.patch.title ?? "Unchanged"}</dd>
        <dt>Status change</dt>
        <dd>{proposal.patch.status ?? "Unchanged"}</dd>
        <dt>Due date change</dt>
        <dd>{proposal.patch.dueDate ?? "Unchanged"}</dd>
        <dt>Proposal</dt>
        <dd>{proposal.reference}</dd>
        <dt>Command hash</dt>
        <dd>{proposal.commandHash}</dd>
        <dt>Required approver</dt>
        <dd>{proposal.approverLabel}</dd>
        <dt>Expires</dt>
        <dd>
          <time dateTime={proposal.expiresAt}>{proposal.expiresAt}</time>
        </dd>
      </dl>
      {execution?.status === "approval-pending" && (
        <p role="status">
          Current approval is still required. No execution result was released
          for this request.
        </p>
      )}
      {observed && (
        <div aria-label="Verified task update result">
          <h3>Recorded task</h3>
          <p>{observed.title}</p>
          <dl className={styles.details}>
            <dt>Status</dt>
            <dd>{observed.taskStatus}</dd>
            <dt>Due date</dt>
            <dd>{observed.dueDate ?? "None"}</dd>
            <dt>Execution reference</dt>
            <dd>{observed.receiptReference}</dd>
            <dt>Completed</dt>
            <dd>
              <time dateTime={observed.completedAt}>
                {observed.completedAt}
              </time>
            </dd>
          </dl>
        </div>
      )}
      {!observed && (
        <label>
          <input
            type="checkbox"
            checked={approved}
            disabled={disabled}
            onChange={(event) => setApproved(event.target.checked)}
          />
          I approve updating this task exactly as shown.
        </label>
      )}
      <Button
        type="button"
        variant="outline"
        disabled={disabled || (!observed && !approved)}
        onClick={onExecute}
      >
        {observed ? "Check recorded result" : "Approve and execute"}
      </Button>
      <p>
        Approve and execute records your approval for this exact proposal.
        Rechecking a recorded result uses the same proposal.
      </p>
    </section>
  );
}

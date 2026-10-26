import { useState } from "react";
import Link from "next/link";
import { workspaceTaskHref } from "../../modules/workspace/task-destination-public";
import { Button } from "@capiro/ui/button";
import type { ObservedExecution, ProposalView } from "./action-workflow-port";
import styles from "./workflow.module.css";

export function ProposalPanel({
  proposal,
  execution,
  refused,
  pending,
  disabled,
  onExecute,
}: {
  proposal: ProposalView;
  execution: ObservedExecution | null;
  refused: boolean;
  pending: boolean;
  disabled: boolean;
  onExecute: () => void;
}) {
  const [approved, setApproved] = useState(false);
  return (
    <section className={styles.panel} aria-label="Immutable approval proposal">
      <h2>
        {execution
          ? "Recorded execution"
          : pending
            ? "Ready for your approval"
            : "Prepared proposal"}
      </h2>
      <p className={styles.muted}>
        Preparing this proposal did not execute it. Review the task below, then
        approve and execute it. The service checks your current authority.
      </p>
      <dl className={styles.details}>
        <dt>Task</dt>
        <dd>{proposal.title}</dd>
        <dt>Due date</dt>
        <dd>{proposal.dueDate ?? "None"}</dd>
        <dt>Proposal</dt>
        <dd>{proposal.reference}</dd>
        <dt>Command hash</dt>
        <dd>{proposal.commandHash}</dd>
        <dt>Expires</dt>
        <dd>
          <time dateTime={proposal.expiresAt}>{proposal.expiresAt}</time>
        </dd>
        <dt>Required approver</dt>
        <dd>{proposal.approverLabel ?? "Not supplied"}</dd>
      </dl>
      {refused && (
        <p role="status" className={styles.notice}>
          Current approval is still required. No execution result was released
          for this request.
        </p>
      )}
      {execution && (
        <div className={styles.review} aria-label="Observed execution result">
          <h3>
            {execution.outcome === "succeeded"
              ? "Task creation confirmed"
              : "Execution failed"}
          </h3>
          {execution.taskTitle !== null && <p>{execution.taskTitle}</p>}
          {execution.outcome === "succeeded" && execution.task && (
            <Button variant="outline" asChild>
              <Link prefetch={false} href={workspaceTaskHref(execution.task)}>
                Open task in Workspace
              </Link>
            </Button>
          )}
          <dl className={styles.details}>
            <dt>Execution reference</dt>
            <dd>{execution.receiptReference}</dd>
            <dt>Completed</dt>
            <dd>
              <time dateTime={execution.completedAt}>
                {execution.completedAt}
              </time>
            </dd>
          </dl>
          <p className={styles.muted}>
            This record describes the service-observed outcome for this
            proposal.
          </p>
        </div>
      )}
      {!execution && (
        <label>
          <input
            type="checkbox"
            checked={approved}
            disabled={disabled}
            onChange={(event) => setApproved(event.target.checked)}
          />
          I approve creating this task exactly as shown.
        </label>
      )}
      <Button
        type="button"
        variant="outline"
        className={styles.button}
        disabled={disabled || (!execution && !approved)}
        onClick={onExecute}
      >
        {execution ? "Check recorded result" : "Approve and execute"}
      </Button>
      <p className={styles.muted}>
        Approve and execute records your approval for this exact proposal.
        Rechecking a recorded result uses the same proposal.
      </p>
    </section>
  );
}

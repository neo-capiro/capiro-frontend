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
  const observed = execution?.status === "observed" ? execution : null;
  return (
    <section
      className={styles.panel}
      aria-label="Immutable task update proposal"
    >
      <h2>
        {observed ? "Task update confirmed" : "Pending separate approval"}
      </h2>
      <p>
        Preparation did not execute this update. Approval is recorded through
        the separate trusted service.
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
          Separate approval is still required. No update was dispatched for this
          request.
        </p>
      )}
      {observed && (
        <div aria-label="Verified task update receipt">
          <h3>Recorded task</h3>
          <p>{observed.title}</p>
          <dl className={styles.details}>
            <dt>Status</dt>
            <dd>{observed.taskStatus}</dd>
            <dt>Due date</dt>
            <dd>{observed.dueDate ?? "None"}</dd>
            <dt>Receipt</dt>
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
      <Button
        type="button"
        variant="outline"
        disabled={disabled}
        onClick={onExecute}
      >
        {observed ? "Check recorded result" : "Check approval and execute"}
      </Button>
      <p>
        This checks current approval and authority for the same immutable
        proposal. It cannot approve the update.
      </p>
    </section>
  );
}

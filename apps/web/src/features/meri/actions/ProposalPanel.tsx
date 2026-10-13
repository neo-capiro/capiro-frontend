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
  return (
    <section className={styles.panel} aria-label="Immutable approval proposal">
      <h2>
        {execution
          ? "Execution receipt"
          : pending
            ? "Pending separate approval"
            : "Prepared proposal"}
      </h2>
      <p className={styles.muted}>
        Preparing this immutable proposal did not execute it. Approval must be
        recorded through the separate trusted service.
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
          <dl className={styles.details}>
            <dt>Receipt</dt>
            <dd>{execution.receiptReference}</dd>
            <dt>Completed</dt>
            <dd>
              <time dateTime={execution.completedAt}>
                {execution.completedAt}
              </time>
            </dd>
          </dl>
          <p className={styles.muted}>
            This receipt describes the service-observed outcome for this
            proposal.
          </p>
        </div>
      )}
      <Button
        type="button"
        variant="outline"
        className={styles.button}
        disabled={disabled}
        onClick={onExecute}
      >
        {execution ? "Check recorded result" : "Request execution"}
      </Button>
      <p className={styles.muted}>
        This request cannot approve the proposal. The service checks current
        approval and authority. Rechecking uses the same immutable proposal.
      </p>
    </section>
  );
}

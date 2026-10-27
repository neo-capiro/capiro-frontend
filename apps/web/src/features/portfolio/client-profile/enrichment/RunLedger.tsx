import { previewOnlyDependency, type FillRun } from "./contracts";
import { SourceOutcome, sourceName } from "./SourceOutcome";
import styles from "./enrichment.module.css";
export function RunLedger({
  run,
  busy,
  onCancel,
}: {
  run: FillRun;
  busy: boolean;
  onCancel: () => void;
}) {
  return (
    <section className={styles.ledger} aria-label="Task ledger">
      <div className="row between">
        <h3>{run.stage?.replaceAll("_", " ") ?? run.status}</h3>
        <span className={styles.badge}>{run.status}</span>
      </div>
      <p className="muted">
        Started{" "}
        <time dateTime={run.startedAt} title={run.startedAt}>
          {new Date(run.startedAt).toLocaleString()}
        </time>
      </p>
      {run.error && (
        <p role="alert">
          This saved run reported a problem. Review the task statuses and
          available findings.
        </p>
      )}
      {run.tasks?.map((task) => (
        <div className={styles.task} key={task.id}>
          <span aria-hidden="true">
            {task.status === "completed"
              ? "✓"
              : task.status === "running"
                ? "●"
                : "○"}
          </span>
          <div>
            {sourceName(task.taskType)}
            <small>
              Attempt {task.attempt} of {task.maxAttempts}
              {task.errorMessage
                ? task.status === "failed"
                  ? " · This task could not complete."
                  : " · An earlier attempt reported a problem."
                : ""}
            </small>
          </div>
          <span>{task.status}</span>
          {task.status === "failed" && (
            <button className="button" disabled title={previewOnlyDependency}>
              Retry unavailable
            </button>
          )}
        </div>
      ))}
      {!run.tasks?.length && (
        <p className="muted">
          This saved run has no task ledger. Source outcomes remain available
          below.
        </p>
      )}
      {(run.error ||
        run.tasks?.some(
          (task) => task.status === "failed" || task.errorMessage,
        )) && (
        <p className="muted">
          Contact support with this run’s start time if you need help. Technical
          details remain in the saved run.
        </p>
      )}
      <details>
        <summary>Saved scope and source outcomes</summary>
        <p>
          Sources:{" "}
          {run.requestedSources.map(sourceName).join(", ") ||
            "No connected sources"}
        </p>
        <p>
          Documents:{" "}
          {(run.attachmentIds ?? run.setup?.attachmentIds ?? []).length}; saved
          LDA identities:{" "}
          {(run.selectedLdaIds ?? run.setup?.selectedLdaIds ?? []).join(", ") ||
            "None recorded"}
        </p>
        {Object.entries(run.sourceStates).map(([source, state]) => (
          <div key={source}>
            <h4>{sourceName(source)}</h4>
            <SourceOutcome value={state} />
          </div>
        ))}
      </details>
      {run.status === "running" && (
        <button className="button" disabled={busy} onClick={onCancel}>
          Cancel run
        </button>
      )}
    </section>
  );
}

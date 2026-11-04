import type { FillRun } from "./contracts";
import { SourceOutcome, sourceName } from "./SourceOutcome";
import { ProfileBuildProgress } from "@/features/portfolio/profile-build/public";
export function RunLedger({
  run,
  busy,
  onCancel,
  onRetry,
}: {
  run: FillRun;
  busy: boolean;
  onCancel: () => void;
  onRetry?: (task: NonNullable<FillRun["tasks"]>[number]) => void;
}) {
  return (
    <ProfileBuildProgress
      status={run.status}
      tasks={(run.tasks ?? []).map((task) => ({
        id: task.id,
        label: sourceName(task.taskType) ?? "Unrecognized source",
        status: task.status,
        attempt: task.attempt,
        maxAttempts: task.maxAttempts,
        reportedError: Boolean(task.errorMessage),
        retryAllowed: (run.workflowVersion ?? 1) >= 2,
      }))}
      busy={busy}
      onCancel={onCancel}
      onRetry={
        onRetry
          ? (id) => {
              const task = run.tasks?.find((candidate) => candidate.id === id);
              if (task) onRetry(task);
            }
          : undefined
      }
    >
      {run.stage && <p>Current stage: {run.stage.replaceAll("_", " ")}</p>}
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
    </ProfileBuildProgress>
  );
}

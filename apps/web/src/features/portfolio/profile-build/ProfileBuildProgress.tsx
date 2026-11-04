import type { ReactNode } from "react";
import { Button } from "@capiro/ui/button";
import { ProfileBuildCard } from "./ProfileBuildCard";
import {
  buildProgressCopy,
  type ProfileBuildStatus,
  type ProfileBuildTask,
} from "./build-progress";
import styles from "./profile-build.module.css";

export function ProfileBuildProgress({
  status,
  tasks,
  busy,
  onRetry,
  onCancel,
  children,
}: {
  status: ProfileBuildStatus;
  tasks: readonly ProfileBuildTask[];
  busy: boolean;
  onRetry?: (taskId: string) => void;
  onCancel?: () => void;
  children?: ReactNode;
}) {
  const copy = buildProgressCopy[status];
  return (
    <ProfileBuildCard
      state={status}
      title={copy.title}
      description={<p role="status">{copy.description}</p>}
      actions={
        status === "running" && onCancel ? (
          <Button
            type="button"
            variant="outline"
            className={styles.button}
            disabled={busy}
            onClick={onCancel}
          >
            Cancel run
          </Button>
        ) : undefined
      }
    >
      <ul className={styles.taskList} aria-label="Task ledger">
        {tasks.map((task) => (
          <li key={task.id} className={styles.task}>
            <div>
              <strong>{task.label}</strong>
              <span> · {task.status}</span>
              <small>
                Attempt {task.attempt} of {task.maxAttempts}
              </small>
              {task.reportedError && (
                <small>
                  {task.status === "failed"
                    ? "This task could not complete."
                    : "An earlier attempt reported a problem."}
                </small>
              )}
            </div>
            {task.status === "failed" && (
              <Button
                type="button"
                variant="outline"
                className={styles.button}
                disabled={
                  busy ||
                  !onRetry ||
                  !task.retryAllowed ||
                  status === "cancelled"
                }
                onClick={() => onRetry?.(task.id)}
              >
                Retry task
              </Button>
            )}
          </li>
        ))}
      </ul>
      {tasks.length === 0 && (
        <p>
          This saved run has no task ledger. Source outcomes remain available
          below.
        </p>
      )}
      {children}
    </ProfileBuildCard>
  );
}

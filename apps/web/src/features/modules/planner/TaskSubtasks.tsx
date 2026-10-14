"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import {
  ActionButton,
  Badge,
  Panel,
  StatusPanel,
} from "../../../shared/module-ui";
import styles from "./planner.module.css";
type Props = {
  taskId: string;
  writable: boolean;
  busy: boolean;
  isPending: () => boolean;
  onAdd: () => void;
  onNavigate: () => void;
};
export function TaskSubtasks(props: Props) {
  const params = useSearchParams();
  const [cursor, setCursor] = useState<string>();
  const query = useCapiroQuery("planner.tasks", {
    query: { parentId: props.taskId, cursor },
  });
  const wrongParent = query.data?.items.some(
    (task) => task.id === props.taskId || task.parentId !== props.taskId,
  );
  const repeatedCursor = !!cursor && query.data?.nextCursor === cursor;
  const error =
    query.error ??
    (wrongParent
      ? "Subtasks could not be verified for this task."
      : repeatedCursor
        ? "The subtask page cursor could not be verified."
        : undefined);
  const href = (taskId: string) => {
    const next = new URLSearchParams(params.toString());
    next.delete("create");
    next.set("task", taskId);
    return `/modules/planner?${next}`;
  };
  return (
    <Panel
      title="Subtasks"
      actions={
        <ActionButton
          disabled={!props.writable || props.busy}
          onClick={() => {
            if (!props.isPending()) props.onAdd();
          }}
        >
          + Subtask
        </ActionButton>
      }
    >
      <StatusPanel
        loading={query.loading}
        error={error}
        onRetry={query.reload}
        empty={
          query.data?.items.length === 0
            ? "No subtasks on this page"
            : undefined
        }
      >
        <div className={styles.detail}>
          {query.data?.items.map((task) => (
            <div key={task.id} className={styles.inline}>
              <Badge>{task.status.replaceAll("_", " ")}</Badge>
              <Link
                href={href(task.id)}
                aria-disabled={props.busy || undefined}
                tabIndex={props.busy ? -1 : undefined}
                onClick={(event) => {
                  if (props.isPending()) event.preventDefault();
                  else props.onNavigate();
                }}
              >
                {task.name}
              </Link>
            </div>
          ))}
        </div>
      </StatusPanel>
      <div className={styles.tools}>
        {cursor && (
          <ActionButton
            disabled={query.loading}
            onClick={() => setCursor(undefined)}
          >
            First subtask page
          </ActionButton>
        )}
        {!query.loading && !error && query.data?.nextCursor && (
          <ActionButton onClick={() => setCursor(query.data!.nextCursor!)}>
            Next subtask page
          </ActionButton>
        )}
      </div>
      {!query.loading && !error && query.data?.nextCursor && (
        <p className={styles.note}>
          More subtasks are available. This view shows the current page.
        </p>
      )}
    </Panel>
  );
}

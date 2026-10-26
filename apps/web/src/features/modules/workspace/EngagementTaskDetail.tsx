"use client";
import Link from "next/link";
import { engagementTaskId } from "../../../shared/capiro/operations/engagement-tasks";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import { StatusPanel } from "../../../shared/module-ui";
import { workspaceHref } from "./workspace-route";

/** The receipt chooses an exact current read; it never supplies current task content or access. */
export function EngagementTaskDetail({
  taskId,
  clientId,
}: {
  taskId: string;
  clientId?: string;
}) {
  const valid =
    engagementTaskId.safeParse(taskId).success &&
    (clientId === undefined || engagementTaskId.safeParse(clientId).success);
  const query = useCapiroQuery(
    "engagement.task",
    {
      params: { id: taskId },
      ...(clientId ? { query: { clientId } } : {}),
    },
    { enabled: valid },
  );
  const task = query.data;
  const mismatch =
    task &&
    (task.id !== taskId ||
      (clientId !== undefined && task.clientId !== clientId));
  const error = !valid
    ? "This task link is invalid."
    : (query.error ??
      (mismatch
        ? "This task is unavailable in the selected scope."
        : undefined));
  return (
    <section aria-label="Current Workspace task">
      <Link href={workspaceHref({ kind: "view", view: "documents", clientId })}>
        Back to Workspace
      </Link>
      <StatusPanel
        loading={query.loading}
        error={error}
        onRetry={valid ? query.reload : undefined}
      />
      {!query.loading && !error && task && (
        <>
          <h1>{task.title}</h1>
          <p>
            This is the task’s current record. The execution receipt remains a
            record of the earlier action.
          </p>
          <dl>
            <dt>Status</dt>
            <dd>{task.status.replaceAll("_", " ")}</dd>
            <dt>Due date</dt>
            <dd>{task.dueDate?.slice(0, 10) ?? "None"}</dd>
            <dt>Client</dt>
            <dd>{task.client?.name ?? "General"}</dd>
            <dt>Updated</dt>
            <dd>
              <time dateTime={task.updatedAt}>{task.updatedAt}</time>
            </dd>
          </dl>
        </>
      )}
    </section>
  );
}

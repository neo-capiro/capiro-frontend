import { workspaceHref } from "./workspace-route";

/** Receipt identities select the current task reader; they do not supply its authority. */
export function workspaceTaskHref(task: {
  id: string;
  clientId: string | null;
}) {
  return workspaceHref({
    kind: "task",
    taskId: task.id,
    clientId: task.clientId ?? undefined,
  });
}

"use client";
import { useRouter, useSearchParams } from "next/navigation";
import {
  plannerId,
  type PlannerPerson,
  type PlannerProject,
} from "../../../shared/capiro/operations/planner-schemas";
import { useCapiroQuery } from "../../../shared/capiro/queries";
import { ActionButton, StatusPanel } from "../../../shared/module-ui";
import { taskMatchesClient } from "./task-client-scope";
import { TaskDetail } from "./TaskDetail";

type Props = {
  requestedId: string;
  clientId?: string;
  people: PlannerPerson[];
  projects: PlannerProject[];
  onSaved: () => void;
};

/** Resolve a link independently of list pagination and accept only its current receipt. */
export function LinkedTaskDetail({
  requestedId,
  clientId,
  people,
  projects,
  onSaved,
}: Props) {
  const params = useSearchParams();
  const router = useRouter();
  const valid = plannerId.safeParse(requestedId).success;
  const query = useCapiroQuery(
    "planner.task",
    { params: { id: requestedId } },
    { enabled: valid },
  );
  const task = query.data;
  const mismatch =
    task &&
    (task.id !== requestedId || !taskMatchesClient(task, clientId, projects));
  const error = !valid
    ? "This task link is invalid."
    : (query.error ??
      (mismatch
        ? "This task is unavailable in the selected scope."
        : undefined));
  const close = () => {
    const next = new URLSearchParams(params.toString());
    next.delete("task");
    router.replace(`/modules/planner${next.size ? `?${next}` : ""}`);
  };
  return (
    <>
      <StatusPanel
        loading={query.loading}
        error={error}
        onRetry={valid ? query.reload : undefined}
      />
      {error && <ActionButton onClick={close}>Dismiss task link</ActionButton>}
      {!query.loading && !error && task && (
        <TaskDetail
          key={`${task.id}:${task.version}`}
          task={task}
          people={people}
          projects={projects}
          onClose={close}
          onSaved={onSaved}
        />
      )}
    </>
  );
}

import { useEffect, useState } from "react";
import { TaskDetail } from "../../src/features/modules/planner/TaskDetail";
import { plannerTask } from "../../src/shared/capiro/operations/planner-schemas";
import { bootstrap, nextTask } from "./next-modules-fixtures";
/** Test-only current-receipt replacement; no production hook or transport. */
export function TaskDetailRefreshProbe() {
  const [task, setTask] = useState(() => plannerTask.parse(nextTask));
  const [saved, setSaved] = useState(0),
    [closed, setClosed] = useState(0);
  useEffect(() => {
    const refresh = (event: Event) =>
      setTask(plannerTask.parse((event as CustomEvent).detail));
    window.addEventListener("capiro-task-receipt-refresh", refresh);
    return () =>
      window.removeEventListener("capiro-task-receipt-refresh", refresh);
  }, []);
  return (
    <>
      <p data-testid="task-saved">Saved callbacks: {saved}</p>
      <p data-testid="task-closed">Closed callbacks: {closed}</p>
      <TaskDetail
        task={task}
        people={bootstrap.people}
        projects={[]}
        onSaved={() => setSaved((value) => value + 1)}
        onClose={() => setClosed((value) => value + 1)}
      />
    </>
  );
}

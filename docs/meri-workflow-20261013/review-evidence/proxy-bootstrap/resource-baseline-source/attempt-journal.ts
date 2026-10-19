import type { WorkflowProblem } from "./workflow-port";

/** Non-secret uncertainty metadata retained by the application's scoped cache. */
export type ActionAttempt = Readonly<
  | { status: "idle" }
  | { status: "pending" }
  | { status: "unresolved"; problem: WorkflowProblem }
>;
export interface ActionAttemptJournal {
  read(): ActionAttempt;
  write(attempt: ActionAttempt): void;
}

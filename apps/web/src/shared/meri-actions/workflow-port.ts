/** Shared presentation contract. A separately governed adapter owns all wire validation. */
export type TaskEdits = Readonly<{ title: string; dueDate: string | null }>;

export type RecommendationView = Readonly<{
  key: string;
  selection: object;
  title: string;
  description: string;
  dueDate: string | null;
}>;

export type RecommendationPage = Readonly<{
  items: readonly RecommendationView[];
  coverageNotes: readonly string[];
}>;

export type DraftView = TaskEdits & Readonly<{ handle: object }>;

export type ProposalView = TaskEdits &
  Readonly<{
    handle: object;
    reference: string;
    commandHash: string;
    expiresAt: string;
    approverLabel: string | null;
  }>;

export type ObservedExecution = Readonly<{
  status: "observed";
  outcome: "succeeded" | "failed";
  receiptReference: string;
  completedAt: string;
  taskTitle: string | null;
  task?: Readonly<{ id: string; clientId: string | null }>;
}>;

export type ExecutionView =
  | ObservedExecution
  | Readonly<{ status: "not-executed"; checkedAt: string }>
  | Readonly<{ status: "approval-pending" }>
  | Readonly<{ status: "indeterminate" }>;

/** Deliberate display dispositions; these are not an HTTP error validator. */
export type WorkflowProblem =
  | "not-dispatched"
  | "unknown"
  | "result-withheld"
  | "stored-withheld"
  | "not-stored"
  | "read-unavailable"
  | "access-lost"
  | "invalid-response";

export type WorkflowReply<T> =
  | Readonly<{ ok: true; value: T }>
  | Readonly<{ ok: false; problem: WorkflowProblem }>;

export type TaskRecoveryView<P, E> =
  | { phase: "empty" }
  | { phase: "prepare"; fields: readonly { label: string; value: string }[] }
  | { phase: "proposal" | "execute"; proposal: P }
  | { phase: "not-executed"; proposal: P; checkedAt: string }
  | { phase: "observed"; execution: E };

/**
 * Handles retain exact validated objects in the adapter; the feature never inspects them.
 * No credential, approval decision, policy or execution authority belongs in this port.
 * A host must replace the feature lifetime whenever its trusted context/port changes.
 */
export interface ActionWorkflowPort {
  /** Retire local handles only after the exact observed request is acknowledged. */
  startNew?(handle: object, signal: AbortSignal): Promise<WorkflowReply<void>>;
  discardSaved?(
    signal: AbortSignal,
  ): Promise<WorkflowReply<TaskRecoveryView<ProposalView, ObservedExecution>>>;
  /** Local encrypted recovery only; never dispatches. */
  restore?(
    signal: AbortSignal,
  ): Promise<WorkflowReply<TaskRecoveryView<ProposalView, ObservedExecution>>>;
  /** Explicit exact saved request only. */
  retrySaved?(
    signal: AbortSignal,
  ): Promise<WorkflowReply<TaskRecoveryView<ProposalView, ObservedExecution>>>;
  query(signal: AbortSignal): Promise<WorkflowReply<RecommendationPage>>;
  draft(
    selection: object,
    edits: TaskEdits,
    signal: AbortSignal,
  ): Promise<WorkflowReply<DraftView>>;
  prepare(
    draft: object,
    signal: AbortSignal,
  ): Promise<WorkflowReply<ProposalView>>;
  execute(
    proposal: object,
    signal: AbortSignal,
  ): Promise<WorkflowReply<ExecutionView>>;
}

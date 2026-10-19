import type { TaskUpdateRaw } from "@capiro/meri-client/task-commands";
import type {
  WorkflowProblem,
  WorkflowReply,
} from "../meri-actions/workflow-port";

export type { WorkflowProblem, WorkflowReply };
export type TaskUpdateInput = TaskUpdateRaw;
export type TaskUpdateProposalView = Readonly<{
  handle: object;
  reference: string;
  commandHash: string;
  taskId: string;
  patch: Readonly<{ title?: string; status?: string; dueDate?: string }>;
  expiresAt: string;
  approverLabel: string;
}>;
export type TaskUpdateExecutionView = Readonly<
  | { status: "approval-pending" }
  | {
      status: "observed";
      receiptReference: string;
      completedAt: string;
      title: string;
      taskStatus: string;
      dueDate: string | null;
    }
>;

/** Display handles retain exact public received proposals inside the adapter. */
export interface TaskUpdateWorkflowPort {
  prepare(
    input: TaskUpdateInput,
    signal: AbortSignal,
  ): Promise<WorkflowReply<TaskUpdateProposalView>>;
  execute(
    handle: object,
    signal: AbortSignal,
  ): Promise<WorkflowReply<TaskUpdateExecutionView>>;
}

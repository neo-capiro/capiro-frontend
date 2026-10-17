import type {
  TaskCommandErrorResponse,
  TaskUpdateApprovalProposal,
} from "@capiro/meri-client/task-commands";
import type { ActionSessionReceipt } from "../meri-actions/session-receipt";
import type { ActionAttemptJournal } from "../meri-actions/attempt-journal";
import {
  TaskCommandAccessUnavailable,
  TaskCommandNotDispatched,
  type TaskCommandTransport,
} from "./transport";
import type {
  TaskUpdateWorkflowPort,
  TaskUpdateInput,
  TaskUpdateProposalView,
  TaskUpdateExecutionView,
  WorkflowProblem,
  WorkflowReply,
} from "./workflow-port";

type Options = {
  session: Pick<ActionSessionReceipt, "context" | "expiresAtMs">;
  transport: TaskCommandTransport;
  journal: ActionAttemptJournal;
  onAccessLost: () => void;
  isCurrent: () => boolean;
  now?: () => number;
};
const refused = <T>(problem: WorkflowProblem): WorkflowReply<T> => ({
  ok: false,
  problem,
});
const dispositions: Record<
  TaskCommandErrorResponse["error"]["outcome"],
  WorkflowProblem
> = {
  NOT_DISPATCHED: "not-dispatched",
  UNKNOWN: "unknown",
  RESULT_NOT_RELEASED: "result-withheld",
  STORED_NOT_RELEASED: "stored-withheld",
  NOT_STORED: "not-stored",
  READ_UNAVAILABLE: "read-unavailable",
};
class RecordedAccessLoss extends TaskCommandAccessUnavailable {
  readonly problem: WorkflowProblem;
  constructor(problem: WorkflowProblem) {
    super("Task access unavailable");
    this.problem = problem;
  }
}

/** Exact received proposals are private and immutable; UI handles grant no authority. */
export class TaskUpdateWorkflow implements TaskUpdateWorkflowPort {
  private lifetime = new AbortController();
  private proposals = new WeakMap<object, TaskUpdateApprovalProposal>();
  private busy = false;
  private now: () => number;
  private readonly options: Options;
  constructor(options: Options) {
    this.options = options;
    this.now = options.now ?? Date.now;
  }
  dispose() {
    this.lifetime.abort();
    this.proposals = new WeakMap();
  }
  private current(signal: AbortSignal) {
    signal.throwIfAborted();
    this.lifetime.signal.throwIfAborted();
    if (
      !this.options.isCurrent() ||
      this.now() >= this.options.session.expiresAtMs
    )
      throw new TaskCommandAccessUnavailable("Task access unavailable");
  }
  private async request<T>(
    caller: AbortSignal,
    invoke: (signal: AbortSignal) => Promise<WorkflowReply<T>>,
  ): Promise<WorkflowReply<T>> {
    if (!this.options.isCurrent()) return refused("not-dispatched");
    try {
      this.current(caller);
    } catch {
      this.dispose();
      this.options.onAccessLost();
      return refused("access-lost");
    }
    if (this.busy) return refused("not-dispatched");
    const attempt = this.options.journal.read();
    if (attempt.status !== "idle")
      return refused(
        attempt.status === "pending" ? "unknown" : attempt.problem,
      );
    this.busy = true;
    this.options.journal.write({ status: "pending" });
    const signal = AbortSignal.any([caller, this.lifetime.signal]);
    try {
      const reply = await invoke(signal);
      this.current(signal);
      const problem = reply.ok ? null : reply.problem;
      this.options.journal.write(
        problem && problem !== "not-dispatched"
          ? { status: "unresolved", problem }
          : { status: "idle" },
      );
      return reply;
    } catch (error) {
      if (error instanceof TaskCommandNotDispatched) {
        this.options.journal.write({ status: "idle" });
        return refused("not-dispatched");
      }
      const problem =
        error instanceof RecordedAccessLoss ? error.problem : "unknown";
      this.options.journal.write(
        problem === "not-dispatched"
          ? { status: "idle" }
          : { status: "unresolved", problem },
      );
      if (error instanceof TaskCommandAccessUnavailable && !signal.aborted) {
        this.dispose();
        this.options.onAccessLost();
        return refused("access-lost");
      }
      return refused("unknown");
    } finally {
      this.busy = false;
    }
  }
  private error<T>(
    status: number,
    value: TaskCommandErrorResponse,
  ): WorkflowReply<T> {
    if (
      status === 401 ||
      ["SESSION_SCOPE_REFUSED", "ACCESS_DENIED"].includes(value.error.code)
    )
      throw new RecordedAccessLoss(dispositions[value.error.outcome]);
    return refused(dispositions[value.error.outcome]);
  }
  prepare(
    input: TaskUpdateInput,
    signal: AbortSignal,
  ): Promise<WorkflowReply<TaskUpdateProposalView>> {
    // Capture browser draft synchronously so a caller edit cannot change dispatched input.
    const captured = JSON.parse(JSON.stringify(input)) as TaskUpdateInput;
    return this.request(signal, async (requestSignal) => {
      const { status, value } = await this.options.transport.prepare(
        captured,
        requestSignal,
      );
      if ("error" in value) return this.error(status, value);
      const proposal = value.proposal;
      const at = this.now();
      if (
        Date.parse(proposal.createdAt) > at ||
        Date.parse(proposal.expiresAt) <= at
      )
        throw new Error("Expired proposal");
      const handle = Object.freeze({});
      this.proposals.set(handle, proposal);
      return {
        ok: true,
        value: Object.freeze({
          handle,
          reference: proposal.proposalId,
          commandHash: proposal.commandSha256,
          taskId: proposal.command.arguments.taskId,
          patch: Object.freeze({ ...proposal.command.arguments.patch }),
          expiresAt: proposal.expiresAt,
          approverLabel: proposal.requiredApprover.actorId,
        }),
      };
    });
  }
  execute(
    handle: object,
    signal: AbortSignal,
  ): Promise<WorkflowReply<TaskUpdateExecutionView>> {
    const proposal = this.proposals.get(handle);
    const at = this.now();
    if (
      !proposal ||
      Date.parse(proposal.createdAt) > at ||
      Date.parse(proposal.expiresAt) <= at
    )
      return Promise.resolve(refused("not-dispatched"));
    return this.request(signal, async (requestSignal) => {
      const { status, value } = await this.options.transport.execute(
        proposal,
        requestSignal,
      );
      if ("error" in value) {
        if (
          status === 409 &&
          value.error.code === "COMMAND_APPROVAL_REFUSED" &&
          value.error.outcome === "NOT_DISPATCHED"
        )
          return { ok: true, value: { status: "approval-pending" } };
        return this.error(status, value);
      }
      if (value.status !== "observed") return refused("unknown");
      return {
        ok: true,
        value: Object.freeze({
          status: "observed",
          receiptReference: value.outcome.receipt.receiptId,
          completedAt: value.outcome.receipt.completedAt,
          title: value.outcome.result.title,
          taskStatus: value.outcome.result.status,
          dueDate: value.outcome.result.dueDate,
        }),
      };
    });
  }
}

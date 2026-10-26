import type {
  TaskCommandErrorResponse,
  TaskUpdateApprovalProposal,
  TaskCommandPrepareRequest,
  TaskCommandPrepareResponse,
} from "@capiro/meri-contracts/task-command-application";
import {
  receiveTaskCommandRequest,
  receiveTaskCommandResponse,
} from "@capiro/meri-contracts/task-command-application";
import type { ActionSessionReceipt } from "../meri-actions/session-receipt";
import type { ActionAttemptJournal } from "../meri-actions/attempt-journal";
import {
  standaloneTaskRecovery,
  sameTaskConversation,
  type SavedTaskCommand,
} from "../meri-actions/task-recovery";
import { sameJson } from "../meri-actions/correlation";
import type { TaskRecoveryView } from "../meri-actions/workflow-port";
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
  private knownRequestId: string | null = null;
  private observed: {
    requestId: string;
    proposal: TaskUpdateApprovalProposal;
  } | null = null;
  constructor(options: Options) {
    this.options = options;
    this.now = options.now ?? Date.now;
  }
  dispose() {
    this.lifetime.abort();
    this.proposals = new WeakMap();
    this.observed = null;
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
    recovery = false,
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
    if (!recovery && attempt.status !== "idle")
      return refused(
        attempt.status === "pending" ? "unknown" : attempt.problem,
      );
    this.busy = true;
    this.options.journal.write({ status: "pending" });
    const signal = AbortSignal.any([caller, this.lifetime.signal]);
    try {
      const reply = await this.recovery(signal).lock(() => invoke(signal));
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
      if (
        (error instanceof TaskCommandAccessUnavailable ||
          !this.options.isCurrent()) &&
        !signal.aborted
      ) {
        this.dispose();
        this.options.onAccessLost();
        return refused("access-lost");
      }
      return refused("unknown");
    } finally {
      this.busy = false;
    }
  }
  private recovery(signal: AbortSignal) {
    return standaloneTaskRecovery("update", this.options.session.context, () =>
      this.current(signal),
    );
  }
  private async saved(signal: AbortSignal) {
    const saved = await this.recovery(signal).load();
    if (!saved) {
      if (
        this.knownRequestId &&
        !(await this.recovery(signal).acknowledged(this.knownRequestId)) &&
        !(await this.recovery(signal).discarded(this.knownRequestId))
      )
        throw new Error(
          "The saved task is unavailable; it has not been acknowledged.",
        );
      return null;
    }
    if (!sameTaskConversation(saved.context, this.options.session.context))
      throw new Error("Task context changed");
    const request = await receiveTaskCommandRequest(
      "prepare",
      JSON.stringify(saved.prepare),
    );
    if (request.requestId !== saved.requestId)
      throw new Error("Task request identity changed");
    let prepared: TaskCommandPrepareResponse | null = null;
    if (saved.prepared !== undefined) {
      const preparedContext = saved.preparedContext ?? saved.context;
      if (!sameTaskConversation(preparedContext, saved.context))
        throw new Error("Saved proposal conversation changed");
      const { tenantId, actorId, conversationId, runId } = preparedContext;
      const value = await receiveTaskCommandResponse(
        "prepare",
        200,
        JSON.stringify(saved.prepared),
        {
          request,
          binding: { tenantId, actorId, conversationId, runId },
        },
      );
      if ("error" in value) throw new Error("Saved proposal is unavailable");
      if (Date.parse(value.proposal.createdAt) > this.now())
        throw new Error("Future saved proposal");
      prepared = value;
    }
    let checkedAt: string | null = null;
    if (saved.notExecuted !== undefined) {
      if (!prepared || !saved.executing)
        throw new Error("Missing original proposal");
      const { tenantId, actorId, conversationId, runId } =
        prepared.proposal.command.binding;
      const proof = await receiveTaskCommandResponse(
        "execute",
        200,
        JSON.stringify(saved.notExecuted),
        {
          binding: { tenantId, actorId, conversationId, runId },
          proposal: prepared.proposal,
        },
      );
      if ("error" in proof || proof.status !== "not_executed")
        throw new Error("Invalid terminal proof");
      checkedAt = proof.checkedAt;
    }
    this.current(signal);
    return { saved, request, prepared, checkedAt };
  }
  private proposalView(
    proposal: TaskUpdateApprovalProposal,
  ): TaskUpdateProposalView {
    const handle = Object.freeze({});
    this.proposals.set(handle, proposal);
    return Object.freeze({
      handle,
      reference: proposal.proposalId,
      commandHash: proposal.commandSha256,
      taskId: proposal.command.arguments.taskId,
      patch: Object.freeze({ ...proposal.command.arguments.patch }),
      expiresAt: proposal.expiresAt,
      approverLabel: proposal.requiredApprover.actorId,
    });
  }
  async restore(
    signal: AbortSignal,
  ): Promise<
    WorkflowReply<
      TaskRecoveryView<TaskUpdateProposalView, TaskUpdateExecutionView>
    >
  > {
    try {
      this.current(signal);
      const retained = await this.saved(signal);
      if (!retained) {
        this.options.journal.write({ status: "idle" });
        this.knownRequestId = null;
        return { ok: true, value: { phase: "empty" } };
      }
      this.knownRequestId = retained.saved.requestId;
      if (retained.checkedAt && retained.prepared)
        return {
          ok: true,
          value: {
            phase: "not-executed",
            proposal: this.proposalView(retained.prepared.proposal),
            checkedAt: retained.checkedAt,
          },
        };
      if (retained.prepared) {
        if (!retained.saved.executing)
          this.options.journal.write({ status: "idle" });
        return {
          ok: true,
          value: {
            phase: retained.saved.executing ? "execute" : "proposal",
            proposal: this.proposalView(retained.prepared.proposal),
          },
        };
      }
      return {
        ok: true,
        value: {
          phase: "prepare",
          fields: Object.entries(retained.request.arguments).map(
            ([label, value]) => ({ label, value: String(value) }),
          ),
        },
      };
    } catch {
      return refused("unknown");
    }
  }
  async retrySaved(
    signal: AbortSignal,
  ): Promise<
    WorkflowReply<
      TaskRecoveryView<TaskUpdateProposalView, TaskUpdateExecutionView>
    >
  > {
    return this.request(
      signal,
      async (current) => {
        const retained = await this.saved(current);
        if (!retained || retained.saved.requestId !== this.knownRequestId)
          return this.restore(current);
        if (!retained.prepared) {
          const reply = await this.prepareSaved(
            retained.saved,
            retained.request,
            current,
            true,
          );
          return reply.ok
            ? { ok: true, value: { phase: "proposal", proposal: reply.value } }
            : reply;
        }
        if (!retained.saved.executing || retained.checkedAt)
          return this.restore(current);
        const reply = await this.executeSaved(
          retained.saved,
          retained.prepared.proposal,
          current,
        );
        if (!reply.ok) return reply;
        if (reply.value.status === "not-executed") return this.restore(current);
        return reply.value.status === "observed"
          ? { ok: true, value: { phase: "observed", execution: reply.value } }
          : {
              ok: true,
              value: {
                phase: "execute",
                proposal: this.proposalView(retained.prepared.proposal),
              },
            };
      },
      true,
    );
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
  async discardSaved(
    signal: AbortSignal,
  ): Promise<
    WorkflowReply<
      TaskRecoveryView<TaskUpdateProposalView, TaskUpdateExecutionView>
    >
  > {
    return this.request(
      signal,
      async (current) => {
        const retained = await this.saved(current);
        if (!retained) return refused("unknown");
        if (retained.saved.requestId !== this.knownRequestId)
          return this.restore(current);
        if (retained.checkedAt)
          await this.recovery(current).retireNotExecuted(retained.saved);
        else await this.recovery(current).discard(retained.saved);
        this.knownRequestId = null;
        this.proposals = new WeakMap();
        return { ok: true, value: { phase: "empty" } };
      },
      true,
    );
  }
  async startNew(
    handle: object,
    signal: AbortSignal,
  ): Promise<WorkflowReply<void>> {
    const proposal = this.proposals.get(handle),
      observed = this.observed;
    if (
      !proposal ||
      !observed ||
      observed.requestId !== this.knownRequestId ||
      !sameJson(proposal, observed.proposal)
    )
      return refused("not-dispatched");
    // The existing command lock also protects another tab's pending request.
    return this.request(signal, async (current) => {
      const recovery = this.recovery(current);
      try {
        if (await recovery.load()) return refused("not-dispatched");
        if (!(await recovery.acknowledged(observed.requestId)))
          return refused("unknown");
      } finally {
        this.current(current);
      }
      if (
        this.observed !== observed ||
        this.knownRequestId !== observed.requestId
      )
        return refused("not-dispatched");
      this.proposals = new WeakMap();
      this.knownRequestId = null;
      this.observed = null;
      return { ok: true, value: undefined };
    });
  }
  async prepare(
    input: TaskUpdateInput,
    signal: AbortSignal,
  ): Promise<WorkflowReply<TaskUpdateProposalView>> {
    // Capture browser draft synchronously so a caller edit cannot change dispatched input.
    let captured: TaskCommandPrepareRequest;
    try {
      captured = await receiveTaskCommandRequest(
        "prepare",
        JSON.stringify({ requestId: crypto.randomUUID(), arguments: input }),
      );
    } catch {
      return refused("not-dispatched");
    }
    return this.request(signal, async (requestSignal) => {
      const saved = await this.recovery(requestSignal).reserve({
        requestId: captured.requestId,
        context: this.options.session.context,
        prepare: captured,
        executing: false,
      });
      this.knownRequestId = saved.requestId;
      this.observed = null;
      return this.prepareSaved(saved, captured, requestSignal);
    });
  }
  private async prepareSaved(
    saved: SavedTaskCommand,
    request: TaskCommandPrepareRequest,
    signal: AbortSignal,
    recovering = false,
  ): Promise<WorkflowReply<TaskUpdateProposalView>> {
    const { status, value } = await this.options.transport.prepare(
      request,
      signal,
      saved.context,
    );
    if ("error" in value) return this.error(status, value);
    await this.recovery(signal).update({
      ...saved,
      prepared: value,
      preparedContext: {
        ...saved.context,
        runId: value.proposal.command.binding.runId,
      },
    });
    if (
      Date.parse(value.proposal.createdAt) > this.now() ||
      (!recovering && Date.parse(value.proposal.expiresAt) <= this.now())
    )
      throw new Error("Proposal is outside its current validity");
    return { ok: true, value: this.proposalView(value.proposal) };
  }
  execute(
    handle: object,
    signal: AbortSignal,
  ): Promise<WorkflowReply<TaskUpdateExecutionView>> {
    const proposal = this.proposals.get(handle);
    if (!proposal) return Promise.resolve(refused("not-dispatched"));
    return this.request(signal, async (requestSignal) => {
      const retained = await this.saved(requestSignal);
      if (
        !retained &&
        this.knownRequestId &&
        (await this.recovery(requestSignal).acknowledged(this.knownRequestId))
      )
        return this.executeSaved(null, proposal, requestSignal);
      if (
        !retained?.prepared ||
        !sameJson(retained.prepared.proposal, proposal) ||
        retained.saved.requestId !== this.knownRequestId
      )
        return refused("unknown");
      if (retained.checkedAt)
        return {
          ok: true,
          value: { status: "not-executed", checkedAt: retained.checkedAt },
        };
      if (
        !retained.saved.executing &&
        (Date.parse(proposal.createdAt) > this.now() ||
          Date.parse(proposal.expiresAt) <= this.now())
      )
        return refused("not-dispatched");
      return this.executeSaved(retained.saved, proposal, requestSignal);
    });
  }
  private async executeSaved(
    saved: SavedTaskCommand | null,
    proposal: TaskUpdateApprovalProposal,
    requestSignal: AbortSignal,
  ): Promise<WorkflowReply<TaskUpdateExecutionView>> {
    if (saved)
      await this.recovery(requestSignal).update({ ...saved, executing: true });
    const { status, value } = await this.options.transport.execute(
      proposal,
      requestSignal,
      saved?.preparedContext ??
        saved?.context ?? {
          ...this.options.session.context,
          runId: proposal.command.binding.runId,
        },
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
    if (value.status === "not_executed") {
      if (!saved)
        throw new Error("Acknowledged execution cannot become unexecuted");
      await this.recovery(requestSignal).update({
        ...saved,
        executing: true,
        notExecuted: value,
      });
      return {
        ok: true,
        value: { status: "not-executed", checkedAt: value.checkedAt },
      };
    }
    if (value.status !== "observed") return refused("unknown");
    if (saved) await this.recovery(requestSignal).acknowledge(saved);
    const requestId = saved?.requestId ?? this.knownRequestId;
    if (!requestId) throw new Error("Missing acknowledged task request");
    this.observed = { requestId, proposal };
    const proof =
      "execution" in value.outcome
        ? value.outcome.execution
        : value.outcome.receipt;
    return {
      ok: true,
      value: Object.freeze({
        status: "observed",
        receiptReference: "kind" in proof ? proof.proposalId : proof.receiptId,
        completedAt: proof.completedAt,
        title: value.outcome.result.title,
        taskStatus: value.outcome.result.status,
        dueDate: value.outcome.result.dueDate,
      }),
    };
  }
}

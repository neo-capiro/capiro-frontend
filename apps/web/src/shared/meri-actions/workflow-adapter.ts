import type {
  ActionDraftResponse,
  ActionQueryResponse,
  ActionPrepareResponse,
  ActionResponseMap,
  ActionRoute,
  ActionPrepareRequest,
} from "@capiro/meri-contracts/action-application";
import {
  receiveActionPrepareRequest,
  receiveActionResponse,
} from "@capiro/meri-contracts/action-application";
import type { ActionSessionReceipt } from "./session-receipt";
import type { ActionAttemptJournal } from "./attempt-journal";
import {
  ActionAccessUnavailable,
  type ActionTransport,
} from "./workflow-transport";
import type {
  ActionWorkflowPort,
  TaskEdits,
  RecommendationPage,
  DraftView,
  ProposalView,
  ExecutionView,
  WorkflowReply,
  WorkflowProblem,
  TaskRecoveryView,
  ObservedExecution,
} from "./workflow-port";
import {
  canonicalEdits,
  actionQueryRequest,
  validQuery,
  validDraft,
  validPrepared,
  validExecution,
  sameJson,
} from "./correlation";
import {
  standaloneTaskRecovery,
  sameTaskConversation,
  type SavedTaskCommand,
} from "./task-recovery";
import { recommendationPage } from "./projection";
import {
  actionDisposition,
  approvalPending,
  isAccessLost,
} from "./disposition";

type Options = {
  session: Pick<ActionSessionReceipt, "context" | "expiresAtMs">;
  transport: ActionTransport;
  journal: ActionAttemptJournal;
  onAccessLost: () => void;
  isCurrent?: () => boolean;
  now?: () => number;
};
const refused = <T>(problem: WorkflowProblem): WorkflowReply<T> => ({
  ok: false,
  problem,
});

/** Exact validated wires stay behind private opaque handles for one host lifetime. */
export class GovernedActionWorkflow implements ActionWorkflowPort {
  private readonly lifetime = new AbortController();
  private selections = new WeakMap<
    object,
    { query: ActionQueryResponse; actionId: string }
  >();
  private drafts = new WeakMap<object, ActionDraftResponse>();
  private proposals = new WeakMap<object, ActionPrepareResponse>();
  private busy = false;
  private readonly now: () => number;
  private readonly options: Options;
  private knownRequestId: string | null = null;
  constructor(options: Options) {
    this.options = {
      ...options,
      session: {
        context: options.session.context,
        expiresAtMs: options.session.expiresAtMs,
      },
    };
    this.now = options.now ?? Date.now;
  }

  dispose() {
    this.lifetime.abort();
    this.selections = new WeakMap();
    this.drafts = new WeakMap();
    this.proposals = new WeakMap();
  }
  private current(signal: AbortSignal) {
    signal.throwIfAborted();
    this.lifetime.signal.throwIfAborted();
    if (this.options.isCurrent?.() === false)
      throw new Error("Current client is being verified");
    if (this.now() >= this.options.session.expiresAtMs) {
      this.loseAccess();
      throw new Error("Action session is unavailable");
    }
  }
  private loseAccess() {
    this.dispose();
    this.options.onAccessLost();
  }
  private settle(problem?: WorkflowProblem) {
    this.options.journal.write(
      problem && problem !== "not-dispatched"
        ? { status: "unresolved", problem }
        : { status: "idle" },
    );
  }
  private async request<R extends ActionRoute, T>(
    route: R,
    body: unknown,
    caller: AbortSignal,
    project: (value: ActionResponseMap[R]) => T | Promise<T>,
    recovery = false,
    before?: (signal: AbortSignal) => Promise<void>,
  ): Promise<WorkflowReply<T>> {
    if (this.options.isCurrent?.() === false) return refused("not-dispatched");
    try {
      this.current(caller);
    } catch {
      return refused("access-lost");
    }
    if (this.busy) return refused("not-dispatched");
    const journal = this.options.journal.read();
    if (!recovery && journal.status !== "idle")
      return refused(
        journal.status === "pending" ? "unknown" : journal.problem,
      );
    this.busy = true;
    this.options.journal.write({ status: "pending" });
    const signal = AbortSignal.any([caller, this.lifetime.signal]);
    try {
      return await this.recovery(signal).lock(async () => {
        if (
          (route === "query" || route === "draft") &&
          (await this.recovery(signal).load())
        )
          throw new Error("Recover the saved task first");
        await before?.(signal);
        const { status, value } = await this.options.transport(
          route,
          body,
          signal,
        );
        this.current(signal);
        if ("error" in value) {
          const problem = actionDisposition(value);
          this.settle(problem);
          if (isAccessLost(status, value)) {
            throw new ActionAccessUnavailable(
              "Current action access unavailable",
            );
          }
          if (approvalPending(route, status, value))
            return { ok: true, value: { status: "approval-pending" } as T };
          return refused(problem);
        }
        const result = await project(value);
        this.current(signal);
        if (this.options.journal.read().status === "pending") this.settle();
        return { ok: true, value: result };
      });
    } catch (error) {
      const problem = "unknown";
      this.settle(problem);
      if (error instanceof ActionAccessUnavailable && !signal.aborted) {
        this.loseAccess();
        return refused("access-lost");
      }
      return refused(problem);
    } finally {
      this.busy = false;
    }
  }
  private recovery(signal: AbortSignal) {
    return standaloneTaskRecovery("create", this.options.session.context, () =>
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
    const request = await receiveActionPrepareRequest(
      JSON.stringify(saved.prepare),
    );
    if (request.requestId !== saved.requestId)
      throw new Error("Task request identity changed");
    let prepared: ActionPrepareResponse | null = null;
    if (saved.prepared !== undefined) {
      const preparedContext = saved.preparedContext ?? saved.context;
      if (!sameTaskConversation(preparedContext, saved.context))
        throw new Error("Saved proposal conversation changed");
      const value = await receiveActionResponse(
        "prepare",
        200,
        JSON.stringify(saved.prepared),
        { request },
      );
      if (
        "error" in value ||
        !validPrepared(value, request.draft, preparedContext, this.now(), true)
      )
        throw new Error("Saved proposal is unavailable");
      prepared = value;
    }
    this.current(signal);
    return { saved, request, prepared };
  }
  private proposalView(prepared: ActionPrepareResponse): ProposalView {
    const handle = Object.freeze({});
    this.proposals.set(handle, prepared);
    const { proposal, draft } = prepared;
    return {
      handle,
      reference: proposal.proposalId,
      commandHash: proposal.commandSha256,
      expiresAt: proposal.expiresAt,
      approverLabel: proposal.requiredApprover.actorId,
      title: draft.task.title,
      dueDate: draft.task.dueDate?.slice(0, 10) ?? null,
    };
  }
  async restore(
    signal: AbortSignal,
  ): Promise<WorkflowReply<TaskRecoveryView<ProposalView, ObservedExecution>>> {
    try {
      this.current(signal);
      const retained = await this.saved(signal);
      if (!retained) {
        this.settle();
        this.knownRequestId = null;
        return { ok: true, value: { phase: "empty" } };
      }
      this.knownRequestId = retained.saved.requestId;
      if (retained.prepared) {
        if (!retained.saved.executing)
          this.options.journal.write({ status: "idle" });
        return {
          ok: true,
          value: {
            phase: retained.saved.executing ? "execute" : "proposal",
            proposal: this.proposalView(retained.prepared),
          },
        };
      }
      return {
        ok: true,
        value: {
          phase: "prepare",
          fields: [
            { label: "Task title", value: retained.request.draft.task.title },
            {
              label: "Due date",
              value: retained.request.draft.task.dueDate ?? "None",
            },
          ],
        },
      };
    } catch {
      return refused("unknown");
    }
  }
  async retrySaved(
    signal: AbortSignal,
  ): Promise<WorkflowReply<TaskRecoveryView<ProposalView, ObservedExecution>>> {
    try {
      const retained = await this.saved(signal);
      if (!retained || retained.saved.requestId !== this.knownRequestId)
        return this.restore(signal);
      if (!retained.prepared) {
        const reply = await this.prepareSaved(
          retained.saved,
          retained.request,
          signal,
          true,
        );
        return reply.ok
          ? { ok: true, value: { phase: "proposal", proposal: reply.value } }
          : reply;
      }
      if (!retained.saved.executing) return this.restore(signal);
      const reply = await this.executeSaved(
        retained.saved,
        retained.prepared,
        signal,
        true,
      );
      if (!reply.ok) return reply;
      if (reply.value.status === "indeterminate") return refused("unknown");
      return reply.value.status === "observed"
        ? { ok: true, value: { phase: "observed", execution: reply.value } }
        : {
            ok: true,
            value: {
              phase: "execute",
              proposal: this.proposalView(retained.prepared),
            },
          };
    } catch {
      return refused("unknown");
    }
  }
  async discardSaved(
    signal: AbortSignal,
  ): Promise<WorkflowReply<TaskRecoveryView<ProposalView, ObservedExecution>>> {
    if (this.busy) return refused("not-dispatched");
    this.busy = true;
    try {
      return await this.recovery(signal).lock(async () => {
        const retained = await this.saved(signal);
        if (!retained) return refused("unknown");
        if (retained.saved.requestId !== this.knownRequestId)
          return this.restore(signal);
        await this.recovery(signal).discard(retained.saved);
        this.knownRequestId = null;
        this.selections = new WeakMap();
        this.drafts = new WeakMap();
        this.proposals = new WeakMap();
        this.settle();
        return { ok: true, value: { phase: "empty" } };
      });
    } catch {
      return refused("unknown");
    } finally {
      this.busy = false;
    }
  }
  query(signal: AbortSignal): Promise<WorkflowReply<RecommendationPage>> {
    return this.request(
      "query",
      { request: actionQueryRequest },
      signal,
      (query) => {
        if (!validQuery(query, this.options.session.context))
          throw new Error("Mismatched query");
        return recommendationPage(query, (actionId) => {
          const handle = Object.freeze({});
          this.selections.set(handle, { query, actionId });
          return handle;
        });
      },
    );
  }
  draft(
    selection: object,
    edits: TaskEdits,
    signal: AbortSignal,
  ): Promise<WorkflowReply<DraftView>> {
    const selected = this.selections.get(selection);
    if (!selected) return Promise.resolve(refused("not-dispatched"));
    let captured: TaskEdits;
    try {
      captured = canonicalEdits(edits);
    } catch {
      return Promise.resolve(refused("not-dispatched"));
    }
    const { query, actionId } = selected;
    return this.request(
      "draft",
      {
        selection: {
          resultReference: query.resultReference,
          resultSha256: query.resultSha256,
          actionId,
        },
        edits: captured,
      },
      signal,
      (draft) => {
        if (
          !validDraft(
            draft,
            query,
            actionId,
            captured,
            this.options.session.context,
          )
        )
          throw new Error("Mismatched draft");
        const handle = Object.freeze({});
        this.drafts.set(handle, draft);
        return {
          handle,
          title: draft.task.title,
          dueDate: draft.task.dueDate?.slice(0, 10) ?? null,
        };
      },
    );
  }
  async prepare(
    handle: object,
    signal: AbortSignal,
  ): Promise<WorkflowReply<ProposalView>> {
    const draft = this.drafts.get(handle);
    if (!draft) return refused("not-dispatched");
    let request: ActionPrepareRequest;
    try {
      request = await receiveActionPrepareRequest(
        JSON.stringify({ requestId: crypto.randomUUID(), draft }),
      );
    } catch {
      return refused("not-dispatched");
    }
    return this.prepareSaved(
      {
        requestId: request.requestId,
        context: this.options.session.context,
        prepare: request,
        executing: false,
      },
      request,
      signal,
    );
  }
  private prepareSaved(
    saved: SavedTaskCommand,
    request: ActionPrepareRequest,
    signal: AbortSignal,
    retry = false,
  ): Promise<WorkflowReply<ProposalView>> {
    return this.request(
      "prepare",
      request,
      signal,
      async (prepared) => {
        if (
          !validPrepared(
            prepared,
            request.draft,
            saved.context,
            this.now(),
            true,
          )
        )
          throw new Error("Mismatched proposal");
        await this.recovery(signal).update({
          ...saved,
          prepared,
          preparedContext: {
            ...saved.context,
            runId: prepared.proposal.command.binding.runId,
          },
        });
        return this.proposalView(prepared);
      },
      retry,
      async (current) => {
        if (retry) {
          const latest = await this.saved(current);
          if (!latest || !sameJson(latest.saved, saved))
            throw new Error("Saved task changed; review it before retrying");
        } else await this.recovery(current).reserve(saved);
        this.knownRequestId = saved.requestId;
      },
    );
  }
  async execute(
    handle: object,
    signal: AbortSignal,
  ): Promise<WorkflowReply<ExecutionView>> {
    const prepared = this.proposals.get(handle);
    if (!prepared) return refused("not-dispatched");
    try {
      const retained = await this.saved(signal);
      if (
        !retained &&
        this.knownRequestId &&
        (await this.recovery(signal).acknowledged(this.knownRequestId))
      )
        return this.executeSaved(null, prepared, signal);
      if (
        !retained?.prepared ||
        retained.saved.requestId !== this.knownRequestId ||
        !sameJson(retained.prepared, prepared)
      )
        return refused("unknown");
      if (
        !retained.saved.executing &&
        Date.parse(prepared.proposal.expiresAt) <= this.now()
      )
        return refused("not-dispatched");
      return this.executeSaved(retained.saved, prepared, signal);
    } catch {
      return refused("unknown");
    }
  }
  private executeSaved(
    saved: SavedTaskCommand | null,
    prepared: ActionPrepareResponse,
    signal: AbortSignal,
    retry = false,
  ): Promise<WorkflowReply<ExecutionView>> {
    return this.request(
      "execute",
      { proposal: prepared.proposal },
      signal,
      async (execution) => {
        if (
          !validExecution(
            execution,
            prepared,
            saved?.preparedContext ??
              saved?.context ?? {
                ...this.options.session.context,
                runId: prepared.proposal.command.binding.runId,
              },
          )
        )
          throw new Error("Mismatched execution");
        if (execution.status === "indeterminate") {
          this.options.journal.write({
            status: "unresolved",
            problem: "unknown",
          });
          return { status: "indeterminate" };
        }
        if (saved) await this.recovery(signal).acknowledge(saved);
        const proof =
          "execution" in execution.outcome
            ? execution.outcome.execution
            : execution.outcome.receipt;
        return {
          status: "observed",
          outcome: "succeeded",
          receiptReference:
            "kind" in proof ? proof.proposalId : proof.receiptId,
          completedAt: proof.completedAt,
          taskTitle: execution.outcome.result.title,
        };
      },
      retry,
      async (current) => {
        if (!saved) {
          if (
            !this.knownRequestId ||
            !(await this.recovery(current).acknowledged(this.knownRequestId))
          )
            throw new Error("The task is not acknowledged");
          return;
        }
        const latest = await this.saved(current);
        if (!latest || !sameJson(latest.saved, saved))
          throw new Error("Saved task changed; review it before retrying");
        await this.recovery(current).update({ ...saved, executing: true });
      },
    );
  }
}

import type {
  ActionDraftResponse,
  ActionQueryResponse,
  ActionPrepareResponse,
  ActionResponseMap,
  ActionRoute,
} from "@capiro/meri-contracts/action-application";
import type { ActionSessionReceipt } from "./session-receipt";
import type { ActionAttemptJournal } from "./attempt-journal";
import type { ActionTransport } from "./workflow-transport";
import type {
  ActionWorkflowPort,
  TaskEdits,
  RecommendationPage,
  DraftView,
  ProposalView,
  ExecutionView,
  WorkflowReply,
  WorkflowProblem,
} from "./workflow-port";
import {
  canonicalEdits,
  validQuery,
  validDraft,
  validPrepared,
  validExecution,
} from "./correlation";
import { recommendationPage } from "./projection";
import {
  actionDisposition,
  approvalPending,
  isAccessLost,
} from "./disposition";

type Options = {
  session: ActionSessionReceipt;
  transport: ActionTransport;
  journal: ActionAttemptJournal;
  onAccessLost: () => void;
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
  constructor(private readonly options: Options) {
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
    project: (value: ActionResponseMap[R]) => T,
  ): Promise<WorkflowReply<T>> {
    try {
      this.current(caller);
    } catch {
      return refused("access-lost");
    }
    if (this.busy) return refused("not-dispatched");
    const journal = this.options.journal.read();
    if (journal.status !== "idle")
      return refused(
        journal.status === "pending" ? "unknown" : journal.problem,
      );
    this.busy = true;
    this.options.journal.write({ status: "pending" });
    const signal = AbortSignal.any([caller, this.lifetime.signal]);
    try {
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
          this.loseAccess();
          return refused("access-lost");
        }
        if (approvalPending(route, status, value))
          return { ok: true, value: { status: "approval-pending" } as T };
        return refused(problem);
      }
      const result = project(value);
      this.current(signal);
      if (this.options.journal.read().status === "pending") this.settle();
      return { ok: true, value: result };
    } catch {
      const problem = route === "query" ? "read-unavailable" : "unknown";
      this.settle(problem);
      return refused(problem);
    } finally {
      this.busy = false;
    }
  }
  query(signal: AbortSignal): Promise<WorkflowReply<RecommendationPage>> {
    return this.request(
      "query",
      { request: { limit: 20 } },
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
  prepare(
    handle: object,
    signal: AbortSignal,
  ): Promise<WorkflowReply<ProposalView>> {
    const draft = this.drafts.get(handle);
    if (!draft) return Promise.resolve(refused("not-dispatched"));
    return this.request("prepare", { draft }, signal, (prepared) => {
      if (
        !validPrepared(
          prepared,
          draft,
          this.options.session.context,
          this.now(),
        )
      )
        throw new Error("Mismatched proposal");
      const proposalHandle = Object.freeze({});
      this.proposals.set(proposalHandle, prepared);
      const { proposal } = prepared;
      return {
        handle: proposalHandle,
        reference: proposal.proposalId,
        commandHash: proposal.commandSha256,
        expiresAt: proposal.expiresAt,
        approverLabel: proposal.requiredApprover.actorId,
        title: draft.task.title,
        dueDate: draft.task.dueDate?.slice(0, 10) ?? null,
      };
    });
  }
  execute(
    handle: object,
    signal: AbortSignal,
  ): Promise<WorkflowReply<ExecutionView>> {
    const prepared = this.proposals.get(handle);
    if (!prepared || Date.parse(prepared.proposal.expiresAt) <= this.now())
      return Promise.resolve(refused("not-dispatched"));
    return this.request(
      "execute",
      { proposal: prepared.proposal },
      signal,
      (execution) => {
        if (!validExecution(execution, prepared, this.options.session.context))
          throw new Error("Mismatched execution");
        if (execution.status === "indeterminate") {
          this.options.journal.write({
            status: "unresolved",
            problem: "unknown",
          });
          return { status: "indeterminate" };
        }
        return {
          status: "observed",
          outcome: "succeeded",
          receiptReference: execution.outcome.receipt.receiptId,
          completedAt: execution.outcome.receipt.completedAt,
          taskTitle: execution.outcome.result.title,
        };
      },
    );
  }
}

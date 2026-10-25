import type {
  ActionWorkflowPort,
  DraftView,
  ObservedExecution,
  ProposalView,
  RecommendationPage,
  TaskEdits,
  WorkflowProblem,
  WorkflowReply,
  TaskRecoveryView,
} from "./action-workflow-port.ts";

type Operation =
  | "query"
  | "draft"
  | "prepare"
  | "execute"
  | "recover"
  | "discard";
export type WorkflowState = Readonly<{
  stage:
    | "idle"
    | "recommendations"
    | "editing"
    | "review"
    | "pending"
    | "observed"
    | "blocked";
  busy: Operation | null;
  page: RecommendationPage | null;
  selected: string | null;
  edits: TaskEdits;
  draft: DraftView | null;
  proposal: ProposalView | null;
  execution: ObservedExecution | null;
  problem: WorkflowProblem | null;
  approvalRefused: boolean;
  checkingRecovery: boolean;
  savedRequest: boolean;
  canDiscard: boolean;
  recoveryFields: readonly { label: string; value: string }[];
}>;

const initialState = (): WorkflowState =>
  Object.freeze({
    stage: "idle",
    busy: null,
    page: null,
    selected: null,
    edits: Object.freeze({ title: "", dueDate: null }),
    draft: null,
    proposal: null,
    execution: null,
    problem: null,
    approvalRefused: false,
    checkingRecovery: false,
    savedRequest: false,
    canDiscard: false,
    recoveryFields: [],
  });

/** UI request observation only: no durable journal, authorization or wire admission. */
export class ActionWorkflowController {
  #port: ActionWorkflowPort;
  #state = initialState();
  #listeners = new Set<() => void>();
  #request: AbortController | null = null;
  #generation = 0;
  #active = true;

  constructor(port: ActionWorkflowPort) {
    this.#port = port;
    this.#state = {
      ...initialState(),
      checkingRecovery: Boolean(port.restore),
    };
  }

  getSnapshot = () => this.#state;

  subscribe = (listener: () => void) => {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  };

  /** Reattachment supports React's development effect probe; old work stays fenced. */
  attach = () => {
    this.#active = true;
    void this.restore();
    return this.dispose;
  };

  #recover(value: TaskRecoveryView<ProposalView, ObservedExecution>) {
    this.#succeed({
      checkingRecovery: false,
      problem: null,
      savedRequest: value.phase === "prepare" || value.phase === "execute",
      canDiscard: value.phase === "prepare" || value.phase === "proposal",
      recoveryFields: value.phase === "prepare" ? value.fields : [],
      ...(value.phase === "empty" || value.phase === "prepare"
        ? { stage: "idle", proposal: null, execution: null }
        : {}),
      ...(value.phase === "proposal" || value.phase === "execute"
        ? { stage: "pending", proposal: value.proposal, draft: null }
        : {}),
      ...(value.phase === "observed"
        ? { stage: "observed", execution: value.execution }
        : {}),
    });
  }
  private async restore() {
    if (!this.#port.restore) return;
    const generation = ++this.#generation,
      request = new AbortController();
    this.#request = request;
    this.#set({ checkingRecovery: true });
    try {
      const reply = await this.#port.restore(request.signal);
      if (
        !this.#active ||
        generation !== this.#generation ||
        request.signal.aborted
      )
        return;
      if (reply.ok) this.#recover(reply.value);
      else this.#set({ checkingRecovery: true, problem: reply.problem });
    } catch {
      if (this.#active && generation === this.#generation)
        this.#set({ checkingRecovery: true, problem: "unknown" });
    }
  }
  retrySaved = async () => {
    if (!this.#port.retrySaved) return;
    await this.#run(
      "recover",
      (signal) => this.#port.retrySaved!(signal),
      (value) => this.#recover(value),
    );
  };
  discardSaved = async () => {
    if (!this.#port.discardSaved || !this.#state.canDiscard) return;
    await this.#run(
      "discard",
      (signal) => this.#port.discardSaved!(signal),
      (value) => {
        if (value.phase === "empty") this.#succeed(initialState());
        else this.#recover(value);
      },
    );
  };

  dispose = () => {
    this.#active = false;
    this.#generation++;
    this.#request?.abort();
    this.#request = null;
    this.#state = initialState();
  };

  #set(patch: Partial<WorkflowState>) {
    this.#state = Object.freeze({ ...this.#state, ...patch });
    this.#listeners.forEach((listener) => listener());
  }

  #succeed(patch: Partial<WorkflowState>) {
    this.#set({ ...patch, busy: null });
  }

  #fail(problem: WorkflowProblem) {
    this.#set({
      ...(problem === "access-lost" ? initialState() : {}),
      stage: "blocked",
      busy: null,
      page: null,
      execution: null,
      approvalRefused: false,
      problem,
    });
  }

  async #run<T>(
    operation: Operation,
    invoke: (signal: AbortSignal) => Promise<WorkflowReply<T>>,
    accept: (value: T) => void,
  ) {
    if (
      !this.#active ||
      this.#state.busy ||
      (operation !== "recover" &&
        operation !== "discard" &&
        (this.#state.problem ||
          this.#state.checkingRecovery ||
          this.#state.savedRequest))
    )
      return;
    const generation = ++this.#generation;
    const request = new AbortController();
    this.#request = request;
    this.#set({
      busy: operation,
      ...(operation === "prepare"
        ? { canDiscard: true }
        : operation === "execute"
          ? { canDiscard: false }
          : {}),
      ...(operation === "execute" ? { approvalRefused: false } : {}),
    });
    try {
      const reply = await invoke(request.signal);
      if (
        !this.#active ||
        generation !== this.#generation ||
        request.signal.aborted
      )
        return;
      if (reply.ok) accept(reply.value);
      else this.#fail(reply.problem);
    } catch {
      if (
        this.#active &&
        generation === this.#generation &&
        !request.signal.aborted
      )
        this.#fail("unknown");
    } finally {
      if (this.#request === request) this.#request = null;
    }
  }

  query = async () => {
    if (this.#state.proposal || this.#state.draft) return;
    await this.#run(
      "query",
      (signal) => this.#port.query(signal),
      (page) => {
        this.#succeed({
          stage: "recommendations",
          page: Object.freeze({
            items: Object.freeze(
              page.items.map((item) => Object.freeze({ ...item })),
            ),
            coverageNotes: Object.freeze([...page.coverageNotes]),
          }),
          selected: null,
          edits: initialState().edits,
        });
      },
    );
  };

  select = (key: string) => {
    if (
      !this.#active ||
      this.#state.busy ||
      this.#state.checkingRecovery ||
      this.#state.savedRequest ||
      this.#state.problem ||
      this.#state.proposal
    )
      return;
    const item = this.#state.page?.items.find(
      (candidate) => candidate.key === key,
    );
    if (!item) return;
    this.#set({
      stage: "editing",
      selected: key,
      edits: Object.freeze({ title: item.title, dueDate: item.dueDate }),
      draft: null,
    });
  };

  edit = (edits: TaskEdits) => {
    if (
      !this.#active ||
      this.#state.busy ||
      this.#state.checkingRecovery ||
      this.#state.savedRequest ||
      this.#state.problem ||
      this.#state.proposal ||
      !this.#state.selected
    )
      return;
    this.#set({
      stage: "editing",
      edits: Object.freeze({ ...edits }),
      draft: null,
    });
  };

  reviewDraft = async () => {
    const { page, selected, edits, proposal, draft } = this.#state;
    const item = page?.items.find((candidate) => candidate.key === selected);
    if (!item || proposal || draft || !edits.title.trim()) return;
    const snapshot = Object.freeze({ ...edits });
    await this.#run(
      "draft",
      (signal) => this.#port.draft(item.selection, snapshot, signal),
      (draft) => {
        this.#succeed({ stage: "review", draft: Object.freeze({ ...draft }) });
      },
    );
  };

  prepare = async () => {
    const { draft, proposal } = this.#state;
    if (!draft || proposal) return;
    await this.#run(
      "prepare",
      (signal) => this.#port.prepare(draft.handle, signal),
      (pending) => {
        this.#succeed({
          stage: "pending",
          proposal: Object.freeze({ ...pending }),
          draft: null,
        });
      },
    );
  };

  execute = async () => {
    const proposal = this.#state.proposal;
    if (!proposal) return;
    await this.#run(
      "execute",
      (signal) => this.#port.execute(proposal.handle, signal),
      (result) => {
        if (result.status === "indeterminate") this.#fail("unknown");
        else if (result.status === "approval-pending")
          this.#succeed({
            stage: "pending",
            execution: null,
            approvalRefused: true,
          });
        else
          this.#succeed({
            stage: "observed",
            execution: Object.freeze({ ...result }),
            approvalRefused: false,
          });
      },
    );
  };
}

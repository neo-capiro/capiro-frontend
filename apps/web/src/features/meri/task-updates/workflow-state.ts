import type {
  TaskUpdateWorkflowPort,
  TaskUpdateProposalView,
  TaskUpdateExecutionView,
  TaskUpdateInput,
  WorkflowProblem,
  WorkflowReply,
} from "../../../shared/meri-task-commands/workflow-port";
import type { TaskRecoveryView } from "../../../shared/meri-actions/workflow-port";

export type TaskUpdateDraft = Readonly<{
  taskId: string;
  title: string;
  status: string;
  dueDate: string;
}>;
type State = Readonly<{
  draft: TaskUpdateDraft;
  busy: "prepare" | "execute" | "recover" | "discard" | null;
  proposal: TaskUpdateProposalView | null;
  execution: TaskUpdateExecutionView | null;
  problem: WorkflowProblem | null;
  checkingRecovery: boolean;
  savedRequest: boolean;
  canDiscard: boolean;
  notExecutedAt: string | null;
  recoveryFields: readonly { label: string; value: string }[];
}>;
const initial = (): State =>
  Object.freeze({
    draft: Object.freeze({ taskId: "", title: "", status: "", dueDate: "" }),
    busy: null,
    proposal: null,
    execution: null,
    problem: null,
    checkingRecovery: false,
    savedRequest: false,
    canDiscard: false,
    notExecutedAt: null,
    recoveryFields: [],
  });

/** Local interaction only; the port retains received proposals and write uncertainty. */
export class TaskUpdateController {
  private state = initial();
  private listeners = new Set<() => void>();
  private active = true;
  private generation = 0;
  private request: AbortController | undefined;
  private readonly port: TaskUpdateWorkflowPort;
  constructor(port: TaskUpdateWorkflowPort) {
    this.port = port;
    this.state = { ...initial(), checkingRecovery: Boolean(port.restore) };
  }
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  attach = () => {
    this.active = true;
    void this.restore();
    return this.dispose;
  };
  private recovered(
    value: TaskRecoveryView<TaskUpdateProposalView, TaskUpdateExecutionView>,
  ) {
    this.set({
      busy: null,
      checkingRecovery: false,
      problem: null,
      savedRequest:
        value.phase === "prepare" ||
        value.phase === "execute" ||
        value.phase === "not-executed",
      canDiscard:
        value.phase === "prepare" ||
        value.phase === "proposal" ||
        value.phase === "not-executed",
      notExecutedAt: value.phase === "not-executed" ? value.checkedAt : null,
      recoveryFields: value.phase === "prepare" ? value.fields : [],
      ...(value.phase === "empty" || value.phase === "prepare"
        ? { proposal: null, execution: null }
        : {}),
      ...(value.phase === "proposal" ||
      value.phase === "execute" ||
      value.phase === "not-executed"
        ? { proposal: value.proposal, execution: null }
        : {}),
      ...(value.phase === "observed" ? { execution: value.execution } : {}),
    });
  }
  private async restore() {
    if (!this.port.restore) return;
    const generation = ++this.generation,
      request = new AbortController();
    this.request = request;
    this.set({ checkingRecovery: true });
    try {
      const reply = await this.port.restore(request.signal);
      if (
        !this.active ||
        generation !== this.generation ||
        request.signal.aborted
      )
        return;
      if (reply.ok) this.recovered(reply.value);
      else this.set({ checkingRecovery: true, problem: reply.problem });
    } catch {
      if (this.active && generation === this.generation)
        this.set({ checkingRecovery: true, problem: "unknown" });
    }
  }
  retrySaved = async () => {
    if (!this.port.retrySaved) return;
    await this.run(
      "recover",
      (signal) => this.port.retrySaved!(signal),
      (value) => this.recovered(value),
    );
  };
  discardSaved = async () => {
    if (!this.port.discardSaved || !this.state.canDiscard) return;
    await this.run(
      "discard",
      (signal) => this.port.discardSaved!(signal),
      (value) => {
        if (value.phase === "empty") this.set(initial());
        else this.recovered(value);
      },
    );
  };
  dispose = () => {
    this.active = false;
    this.generation++;
    this.request?.abort();
    this.request = undefined;
    this.state = initial();
  };
  private set(patch: Partial<State>) {
    this.state = Object.freeze({ ...this.state, ...patch });
    this.listeners.forEach((listener) => listener());
  }
  edit = (draft: TaskUpdateDraft) => {
    if (
      this.active &&
      !this.state.busy &&
      !this.state.checkingRecovery &&
      !this.state.savedRequest &&
      !this.state.proposal &&
      !this.state.problem
    )
      this.set({ draft: Object.freeze({ ...draft }) });
  };
  private async run<T>(
    operation: "prepare" | "execute" | "recover" | "discard",
    invoke: (signal: AbortSignal) => Promise<WorkflowReply<T>>,
    accept: (value: T) => void,
  ) {
    if (
      !this.active ||
      this.state.busy ||
      (operation !== "recover" &&
        operation !== "discard" &&
        (this.state.problem ||
          this.state.checkingRecovery ||
          this.state.savedRequest))
    )
      return;
    const generation = ++this.generation,
      request = new AbortController();
    this.request = request;
    this.set({
      busy: operation,
      ...(operation === "prepare"
        ? { canDiscard: true }
        : operation === "execute"
          ? { canDiscard: false }
          : {}),
    });
    const current = () =>
      this.active && generation === this.generation && !request.signal.aborted;
    try {
      const reply = await invoke(request.signal);
      if (!current()) return;
      if (reply.ok) accept(reply.value);
      else
        this.set({
          problem: reply.problem,
          ...(reply.problem === "access-lost"
            ? { proposal: null, execution: null }
            : {}),
        });
    } catch {
      if (current()) this.set({ problem: "unknown" });
    } finally {
      if (current()) this.set({ busy: null });
      if (this.request === request) this.request = undefined;
    }
  }
  prepare = async () => {
    if (this.state.proposal) return;
    const draft = this.state.draft;
    if (
      !draft.taskId.trim() ||
      ![draft.title, draft.status, draft.dueDate].some((value) => value.trim())
    )
      return;
    const input: TaskUpdateInput = {
      taskId: draft.taskId,
      ...(draft.title.trim() ? { title: draft.title } : {}),
      ...(draft.status ? { status: draft.status } : {}),
      ...(draft.dueDate ? { dueDate: draft.dueDate } : {}),
    };
    await this.run(
      "prepare",
      (signal) => this.port.prepare(input, signal),
      (proposal) => {
        this.set({
          proposal: Object.freeze({
            ...proposal,
            patch: Object.freeze({ ...proposal.patch }),
          }),
          execution: null,
        });
      },
    );
  };
  execute = async () => {
    const proposal = this.state.proposal;
    if (!proposal) return;
    await this.run(
      "execute",
      (signal) => this.port.execute(proposal.handle, signal),
      (execution) => {
        if (execution.status === "not-executed")
          this.recovered({
            phase: "not-executed",
            proposal,
            checkedAt: execution.checkedAt,
          });
        else this.set({ execution: Object.freeze({ ...execution }) });
      },
    );
  };
}

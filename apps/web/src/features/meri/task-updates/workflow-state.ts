import type {
  TaskUpdateWorkflowPort,
  TaskUpdateProposalView,
  TaskUpdateExecutionView,
  TaskUpdateInput,
  WorkflowProblem,
  WorkflowReply,
} from "../../../shared/meri-task-commands/workflow-port";

export type TaskUpdateDraft = Readonly<{
  taskId: string;
  title: string;
  status: string;
  dueDate: string;
}>;
type State = Readonly<{
  draft: TaskUpdateDraft;
  busy: "prepare" | "execute" | null;
  proposal: TaskUpdateProposalView | null;
  execution: TaskUpdateExecutionView | null;
  problem: WorkflowProblem | null;
}>;
const initial = (): State =>
  Object.freeze({
    draft: Object.freeze({ taskId: "", title: "", status: "", dueDate: "" }),
    busy: null,
    proposal: null,
    execution: null,
    problem: null,
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
    return this.dispose;
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
      !this.state.proposal &&
      !this.state.problem
    )
      this.set({ draft: Object.freeze({ ...draft }) });
  };
  private async run<T>(
    operation: "prepare" | "execute",
    invoke: (signal: AbortSignal) => Promise<WorkflowReply<T>>,
    accept: (value: T) => void,
  ) {
    if (!this.active || this.state.busy || this.state.problem) return;
    const generation = ++this.generation,
      request = new AbortController();
    this.request = request;
    this.set({ busy: operation });
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
        this.set({ execution: Object.freeze({ ...execution }) });
      },
    );
  };
}

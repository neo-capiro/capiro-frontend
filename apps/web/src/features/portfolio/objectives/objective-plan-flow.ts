import type {
  ObjectiveGenerationJob,
  ObjectiveGenerationRequest,
} from "@/shared/capiro/operations/objective-generation";
import { ObjectiveGenerationSession } from "./objective-generation-session";
import { ObjectivePlanSession, emptyPlan } from "./objective-plan-session";

/** Coordinates two canonical command owners; does not add persistence/authority. */
export class ObjectivePlanFlow {
  private plan?: ObjectivePlanSession;
  private jobId?: string;
  private unsubscribePlan?: () => void;
  private listeners = new Set<() => void>();
  private automatic = false;
  private observing = true;
  private lifetime = 0;
  private state;
  constructor(
    readonly generation: ObjectiveGenerationSession,
    private makePlan: (job: ObjectiveGenerationJob) => ObjectivePlanSession,
  ) {
    this.state = {
      generation: generation.snapshot(),
      plan: emptyPlan,
      observing: true,
    };
    generation.subscribe(() => this.update());
  }
  snapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
      if (!this.listeners.size) this.suspend();
    };
  };
  private update() {
    this.state = {
      generation: this.generation.snapshot(),
      plan: this.plan?.snapshot() ?? emptyPlan,
      observing: this.observing,
    };
    for (const listener of this.listeners) listener();
  }
  suspend = () => {
    this.lifetime++;
    this.automatic = false;
    this.observing = false;
    this.generation.suspend();
    this.plan?.suspend();
    this.update();
  };
  private selectedPlan() {
    const state = this.generation.snapshot(),
      job = state.job;
    if (!state.verified || state.busy || job?.status !== "completed") return;
    if (job.jobId !== this.jobId) {
      this.plan?.suspend();
      this.unsubscribePlan?.();
      this.jobId = job.jobId;
      this.plan = this.makePlan(job);
      this.unsubscribePlan = this.plan.subscribe(() => this.update());
      this.update();
    }
    return this.plan;
  }
  private async advance() {
    const plan = this.selectedPlan();
    if (plan && this.automatic && this.observing) {
      this.automatic = false;
      await plan.execute();
    }
  }
  hydrate = async () => {
    const lifetime = ++this.lifetime;
    this.automatic = false;
    this.observing = true;
    this.update();
    await this.generation.hydrate();
    if (lifetime !== this.lifetime) return;
    if (
      this.generation.snapshot().accepted?.status === "completed" &&
      !this.generation.snapshot().job
    )
      await this.generation.refresh();
    if (lifetime !== this.lifetime) return;
    await this.selectedPlan()?.refresh();
  };
  finish = async (type: ObjectiveGenerationRequest["type"]) => {
    const lifetime = ++this.lifetime;
    this.automatic = true;
    this.observing = true;
    this.update();
    await this.generation.submit(type);
    if (lifetime !== this.lifetime) return;
    if (
      this.generation.snapshot().accepted?.status === "completed" &&
      !this.generation.snapshot().job
    )
      await this.generation.refresh();
    if (lifetime !== this.lifetime) return;
    await this.advance();
  };
  refresh = async () => {
    const lifetime = this.lifetime;
    await this.generation.refresh();
    if (lifetime !== this.lifetime) return;
    if (this.automatic) await this.advance();
    else await this.selectedPlan()?.refresh();
  };
  resume = async () => {
    const lifetime = ++this.lifetime;
    this.observing = true;
    this.automatic = true;
    this.update();
    await this.generation.refresh();
    if (lifetime !== this.lifetime) return;
    await this.advance();
  };
  canReset() {
    if (!this.generation.canReset()) return false;
    return (
      this.generation.snapshot().accepted?.status === "failed" ||
      (this.plan?.snapshot().verified === true &&
        !this.plan.snapshot().busy &&
        !!this.plan.snapshot().response)
    );
  }
  reset = async () => {
    this.automatic = false;
    if (this.generation.snapshot().accepted?.status === "completed") {
      await this.selectedPlan()?.refresh();
      if (!this.canReset()) return;
    }
    await this.generation.reset();
    if (!this.generation.snapshot().request) {
      this.plan?.suspend();
      this.unsubscribePlan?.();
      this.plan = undefined;
      this.jobId = undefined;
      this.update();
    }
  };
}

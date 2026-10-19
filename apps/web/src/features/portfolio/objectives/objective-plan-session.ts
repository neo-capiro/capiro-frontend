import { ApiError, type ApiClient } from "@/shared/portfolio/api/http";
import {
  planResponse,
  planFailure,
  planRequestFor,
  requirePlan,
  requirePlanRequest,
  type PlanResponse,
  type PlanRequest,
  type PlanFailure,
} from "@/shared/capiro/operations/strategy-materialization";
import type { ObjectiveGenerationJob } from "@/shared/capiro/operations/objective-generation";
import type { PlanRecovery, RetainedPlan } from "./objective-plan-recovery";

export type PlanState = {
  ready: boolean;
  busy: boolean;
  verified: boolean;
  uncertain: boolean;
  request?: PlanRequest;
  response?: PlanResponse;
  error?: string;
  failure?: PlanFailure;
};
export const emptyPlan: PlanState = {
  ready: false,
  busy: false,
  verified: false,
  uncertain: false,
};
export class ObjectivePlanSession {
  private state: PlanState = emptyPlan;
  private listeners = new Set<() => void>();
  private active?: AbortController;
  constructor(
    private api: ApiClient,
    private job: ObjectiveGenerationJob,
    private recovery: PlanRecovery,
  ) {}
  snapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
      if (!this.listeners.size) this.suspend();
    };
  };
  suspend = () => this.active?.abort();
  private update(v: Partial<PlanState>) {
    this.state = { ...this.state, ...v };
    for (const listener of this.listeners) listener();
  }
  private assert(signal: AbortSignal) {
    signal.throwIfAborted();
    this.recovery.guard();
  }
  private typedFailure(cause: unknown) {
    if (!(cause instanceof ApiError)) return;
    const parsed = planFailure.safeParse(cause.details);
    if (
      parsed.success &&
      parsed.data.httpStatus === cause.status &&
      (parsed.data.requestId === null ||
        parsed.data.requestId === this.state.request?.requestId)
    )
      return parsed.data;
  }
  private async run(action: (signal: AbortSignal) => Promise<void>) {
    if (this.state.busy) return;
    const controller = new AbortController();
    this.active = controller;
    this.update({
      busy: true,
      verified: false,
      error: undefined,
      failure: undefined,
    });
    try {
      await action(controller.signal);
    } catch (cause) {
      const failure = this.typedFailure(cause);
      this.update({
        failure,
        uncertain: !!this.state.request,
        error:
          failure?.message ??
          "Plan preparation could not be verified. Recover this same request; closing the view does not cancel saved work.",
      });
    } finally {
      if (this.active === controller) this.active = undefined;
      this.update({ busy: false });
    }
  }
  private async install(
    value: PlanResponse,
    retained: RetainedPlan,
    signal: AbortSignal,
  ) {
    const response = requirePlan(value, retained.request, this.job);
    this.assert(signal);
    await this.recovery.save({ request: retained.request, response });
    this.assert(signal);
    this.update({
      response,
      request: retained.request,
      ready: true,
      verified: true,
      uncertain: false,
      error: undefined,
      failure: undefined,
    });
  }
  private async read(retained: RetainedPlan, signal: AbortSignal) {
    const response = await this.api.request(
      "strategy",
      `planner/strategy-materializations/${retained.request.requestId}`,
      planResponse,
      { signal },
    );
    await this.install(response, retained, signal);
  }
  /** A view mount/reload only reads. It never converts a 404 into a new UUID. */
  refresh = () =>
    this.run(async (signal) => {
      await this.recovery.lock(async () => {
        await this.recovery.authorize(signal);
        this.assert(signal);
        const saved = await this.recovery.load();
        this.assert(signal);
        if (!saved) {
          if (this.state.request)
            throw new Error("Saved plan request is inconsistent.");
          this.update({ ready: true });
          return;
        }
        this.update({ request: saved.request, response: saved.response });
        requirePlanRequest(saved.request, this.job);
        await this.read(saved, signal);
      });
    });
  /** Called only by an explicit finish/resume or its still-observed continuation. */
  execute = () =>
    this.run(async (signal) => {
      await this.recovery.lock(async () => {
        await this.recovery.authorize(signal);
        this.assert(signal);
        const saved = await this.recovery.load();
        this.assert(signal);
        const retained =
          saved ??
          (await this.recovery.reserve(
            planRequestFor(this.job, crypto.randomUUID()),
          ));
        this.assert(signal);
        this.update({
          request: retained.request,
          response: retained.response,
          uncertain: true,
        });
        requirePlanRequest(retained.request, this.job);
        if (saved) {
          try {
            await this.read(saved, signal);
            return;
          } catch (cause) {
            this.assert(signal);
            const failure = this.typedFailure(cause);
            if (failure?.code !== "MATERIALIZATION_NOT_AVAILABLE") throw cause;
            // An opaque 404 is not no-write proof. The authorized retry below uses
            // the exact persisted UUID/input, relying on server idempotency.
          }
        }
        const response = await this.api.request(
          "strategy",
          "planner/strategy-materializations",
          planResponse,
          { method: "POST", body: retained.request, signal },
        );
        await this.install(response, retained, signal);
      });
    });
}

import { ApiError, type ApiClient } from "@/shared/portfolio/api/http";
import {
  objectiveGenerationAccepted,
  objectiveGenerationJob,
  objectiveGenerationRequest,
  requireObjectiveGeneration,
  type ObjectiveGenerationAccepted,
  type ObjectiveGenerationJob,
  type ObjectiveGenerationRequest,
} from "@/shared/capiro/operations/objective-generation";
import type {
  GenerationRecovery,
  RetainedGeneration,
} from "./objective-generation-recovery";

export type GenerationState = {
  request?: ObjectiveGenerationRequest;
  accepted?: ObjectiveGenerationAccepted;
  job?: ObjectiveGenerationJob;
  ready: boolean;
  verified: boolean;
  busy: boolean;
  error?: string;
  uncertain: boolean;
};
const idle: GenerationState = {
  busy: false,
  ready: false,
  verified: false,
  uncertain: false,
};

/** View lifecycle only. Canonical encrypted recovery owns retained intent/locks. */
export class ObjectiveGenerationSession {
  private state: GenerationState = idle;
  private listeners = new Set<() => void>();
  private active: AbortController | undefined;
  constructor(
    private api: ApiClient,
    private selected: { clientId: string; id: string; version: number },
    private recovery: GenerationRecovery,
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
  private update(value: Partial<GenerationState>) {
    this.state = { ...this.state, ...value };
    for (const listener of this.listeners) listener();
  }
  private assert(signal: AbortSignal) {
    signal.throwIfAborted();
    this.recovery.guard();
  }
  private requestMatches(request: ObjectiveGenerationRequest) {
    if (
      request.clientId !== this.selected.clientId ||
      request.objective.objectiveId !== this.selected.id ||
      request.objective.objectiveVersion !== this.selected.version
    )
      throw new Error(
        "The retained request belongs to another saved Objective.",
      );
  }
  private async install(
    value: ObjectiveGenerationAccepted,
    signal: AbortSignal,
    job?: ObjectiveGenerationJob,
  ) {
    const request = this.state.request;
    if (!request) throw new Error("The saved request identity is unavailable.");
    requireObjectiveGeneration(value, request, this.state.accepted?.jobId);
    this.assert(signal);
    await this.recovery.save({ request, accepted: value });
    this.assert(signal);
    this.update({
      accepted: value,
      job,
      verified: true,
      uncertain: false,
      error: undefined,
    });
  }
  private async readJob(value: RetainedGeneration, signal: AbortSignal) {
    if (!value.accepted)
      throw new Error("The saved job identity is unavailable.");
    const jobId = value.accepted.jobId;
    const job = await this.api.request(
      "strategy",
      `strategies/draft-jobs/${jobId}`,
      objectiveGenerationJob,
      { signal },
    );
    this.assert(signal);
    requireObjectiveGeneration(job, value.request, jobId);
    await this.install(
      {
        jobId,
        status: job.status,
        objectiveGeneration: job.objectiveGeneration,
      },
      signal,
      job,
    );
  }
  private async run(action: (signal: AbortSignal) => Promise<void>) {
    if (this.state.busy) return;
    const controller = new AbortController();
    this.active = controller;
    this.update({ busy: true, verified: false, error: undefined });
    try {
      await action(controller.signal);
    } catch (cause) {
      this.update({
        error:
          cause instanceof Error
            ? cause.message
            : "Generation could not be verified.",
      });
    } finally {
      if (this.active === controller) this.active = undefined;
      this.update({ busy: false });
    }
  }
  hydrate = () =>
    this.run(async (signal) => {
      await this.recovery.authorize(signal);
      this.assert(signal);
      const saved = await this.recovery.load();
      this.assert(signal);
      if (saved) {
        this.requestMatches(saved.request);
        this.update({
          request: saved.request,
          accepted: saved.accepted,
          uncertain: !saved.accepted,
        });
        if (saved.accepted) await this.readJob(saved, signal);
      } else if (this.state.request)
        throw new Error(
          "Saved request recovery is inconsistent. No new request will be sent.",
        );
      this.update({ ready: true });
    });
  submit = (type: ObjectiveGenerationRequest["type"]) =>
    this.run(async (signal) => {
      if (!this.state.ready)
        throw new Error("Verify saved request recovery before generating.");
      await this.recovery.lock(async () => {
        await this.recovery.authorize(signal);
        this.assert(signal);
        const saved = await this.recovery.load();
        this.assert(signal);
        const request =
          saved?.request ??
          this.state.request ??
          objectiveGenerationRequest.parse({
            requestId: crypto.randomUUID(),
            clientId: this.selected.clientId,
            objective: {
              objectiveId: this.selected.id,
              objectiveVersion: this.selected.version,
            },
            type,
          });
        this.requestMatches(request);
        if (request.type !== type)
          throw new Error(
            "Recover the original Strategy type before choosing another.",
          );
        const retained = saved ?? (await this.recovery.reserve(request));
        this.assert(signal);
        this.requestMatches(retained.request);
        this.update({
          request: retained.request,
          accepted: retained.accepted,
          uncertain: !retained.accepted,
        });
        if (retained.accepted) return this.readJob(retained, signal);
        try {
          const result = await this.api.request(
            "strategy",
            "strategies/objective-drafts",
            objectiveGenerationAccepted,
            { method: "POST", body: retained.request, signal },
          );
          await this.install(result, signal);
        } catch (cause) {
          const refused =
            cause instanceof ApiError &&
            cause.status >= 400 &&
            cause.status < 500;
          this.update({ uncertain: !refused });
          throw refused
            ? cause
            : new Error(
                "The request outcome is unconfirmed. Recover this same request before starting another.",
              );
        }
      });
    });
  refresh = () =>
    this.run(async (signal) => {
      await this.recovery.lock(async () => {
        await this.recovery.authorize(signal);
        this.assert(signal);
        const saved = await this.recovery.load();
        this.assert(signal);
        if (!saved)
          throw new Error("The retained generation request is unavailable.");
        this.requestMatches(saved.request);
        this.update({ request: saved.request, accepted: saved.accepted });
        await this.readJob(saved, signal);
      });
    });
  canReset() {
    const value = this.state.accepted;
    return (
      !this.state.busy &&
      this.state.verified &&
      value !== undefined &&
      (value.status === "completed" ||
        (value.status === "failed" &&
          value.objectiveGeneration.failure?.code !==
            "OBJECTIVE_GENERATION_OUTCOME_UNCONFIRMED"))
    );
  }
  reset = () => {
    if (!this.canReset()) return Promise.resolve();
    return this.run(async (signal) => {
      await this.recovery.lock(async () => {
        await this.recovery.authorize(signal);
        this.assert(signal);
        const saved = await this.recovery.load();
        this.assert(signal);
        if (!saved)
          throw new Error("The retained generation request is unavailable.");
        this.update({ request: saved.request, accepted: saved.accepted });
        await this.readJob(saved, signal);
        const value = this.state.accepted;
        if (!value) throw new Error("A current confirmed receipt is required.");
        await this.recovery.retire(value, saved.request);
        this.assert(signal);
        this.state = { ...idle, ready: true, busy: true };
        this.update({});
      });
    });
  };
}

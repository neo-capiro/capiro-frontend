import type { CapiroApi } from "@/shared/capiro/http";
import { capiroOperations } from "@/shared/capiro/registry";
import {
  governedObjectiveStrategyIntakeRequest,
  requireGovernedObjectiveStrategyIntakeReceipt,
} from "@/shared/capiro/operations/objective-governed-strategy-intake";
import type { StrategySummary } from "@/shared/capiro/operations/strategies-schemas";
import {
  objectiveGenerationRequest,
  requireObjectiveGeneration,
  type ObjectiveGenerationJob,
} from "@/shared/capiro/operations/objective-generation";
import { startObjectiveGeneration } from "./objective-generation-start";
import {
  governedObjectiveGenerationReadRequest,
  requireGovernedObjectiveGenerationObservation,
} from "@/shared/capiro/operations/objective-governed-generation";
import {
  requireInitialStrategyIntakeSource,
  type StrategyIntakeClient,
  type StrategyIntakeObjective,
} from "./objective-strategy-intake-source";
import type {
  RetainedStrategyIntake,
  StrategyIntakeRecovery,
} from "./objective-strategy-intake-recovery";

type StrategyType = StrategySummary["type"];
type StrategyApi = Pick<CapiroApi<typeof capiroOperations>, "request">;
export type StrategyIntakeState = {
  ready: boolean;
  busy: boolean;
  newSourceVerified: boolean;
  retained: RetainedStrategyIntake | null;
  job?: ObjectiveGenerationJob;
  error?: string;
};
const idle: StrategyIntakeState = {
  ready: false,
  busy: false,
  newSourceVerified: false,
  retained: null,
};

/** View lifecycle only. The encrypted recovery journal owns the exact command identity. */
export class ObjectiveStrategyIntakeSession {
  private state = idle;
  private listeners = new Set<() => void>();
  private active: AbortController | null = null;
  constructor(
    private strategyApi: StrategyApi,
    private objective: StrategyIntakeObjective,
    private client: StrategyIntakeClient,
    private recovery: StrategyIntakeRecovery,
    private start = startObjectiveGeneration,
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
  private update(change: Partial<StrategyIntakeState>) {
    this.state = { ...this.state, ...change };
    for (const listener of this.listeners) listener();
  }
  private assert(signal: AbortSignal) {
    signal.throwIfAborted();
    this.recovery.guard();
  }
  private async readCurrent(signal: AbortSignal) {
    const request = governedObjectiveGenerationReadRequest.parse({
      params: {
        clientId: this.objective.clientId,
        objectiveId: this.objective.id,
      },
      query: { workAction: "objective.strategy.draft" },
    });
    const read = await this.strategyApi.request(
      "objectives.governedGeneration.read",
      request,
      { signal },
    );
    this.assert(signal);
    return requireGovernedObjectiveGenerationObservation(read, request);
  }
  private async readJob(retained: RetainedStrategyIntake, signal: AbortSignal) {
    if (!retained.accepted) return;
    const request = objectiveGenerationRequest.parse({
      requestId: retained.request.body.selection.generationRequestId,
      clientId: retained.request.params.clientId,
      objective: {
        objectiveId: retained.request.params.objectiveId,
        objectiveVersion:
          retained.request.body.command.expectedObjectiveVersion,
      },
      type: retained.request.body.selection.type,
    });
    const value = await this.strategyApi.request(
      "strategies.objectiveDraftJob",
      {
        params: { jobId: retained.accepted.generationJobId },
      },
      { signal },
    );
    this.assert(signal);
    const job = requireObjectiveGeneration(
      value,
      request,
      retained.accepted.generationJobId,
    );
    if (
      job.objectiveGeneration.source.objectiveRevisionId !==
      retained.origin.objective.revision.id
    )
      throw new Error(
        "The generation source changed. Refresh the saved Objective work.",
      );
    const result = job.objectiveGeneration.result;
    if (
      retained.result &&
      JSON.stringify(retained.result) !== JSON.stringify(result)
    )
      throw new Error(
        "The saved generation result changed. Its destination cannot be verified.",
      );
    if (result && !retained.result) {
      retained = { ...retained, result };
      await this.recovery.save(retained);
      this.assert(signal);
    }
    this.update({ job, retained });
  }
  private async startSaved(
    retained: RetainedStrategyIntake,
    signal: AbortSignal,
  ) {
    if (!retained.accepted)
      throw new Error(
        "A verified saved intake is required before starting generation.",
      );
    if (!retained.started) {
      const started = await this.start(
        retained.accepted.generationJobId,
        signal,
      );
      this.assert(signal);
      retained = { ...retained, started };
      await this.recovery.save(retained);
      this.assert(signal);
      this.update({ retained });
    }
    await this.readJob(retained, signal);
  }
  private async run(action: (signal: AbortSignal) => Promise<void>) {
    if (this.state.busy) return;
    const controller = new AbortController();
    this.active = controller;
    this.update({ busy: true, error: undefined, job: undefined });
    try {
      await action(controller.signal);
    } catch (cause) {
      if (!controller.signal.aborted) {
        this.update({
          newSourceVerified: this.state.retained
            ? this.state.newSourceVerified
            : false,
          error:
            cause instanceof Error
              ? cause.message
              : "Strategy intake could not be verified.",
        });
      }
    } finally {
      if (this.active === controller) this.active = null;
      this.update({ busy: false });
    }
  }
  hydrate = () =>
    this.run(async (signal) => {
      this.assert(signal);
      const retained = await this.recovery.load();
      this.assert(signal);
      if (this.state.retained && !retained)
        throw new Error(
          "The saved intake is inconsistent. No request was sent.",
        );
      this.update({ retained, ready: true });
      const savedObjective = await this.recovery.authorize(signal);
      if (retained?.accepted) await this.readJob(retained, signal);
      if (!retained) {
        if (
          savedObjective.status !== "ready" ||
          savedObjective.version !== this.objective.version
        )
          throw new Error("Save the current ready Objective before intake.");
        const current = await this.readCurrent(signal);
        requireInitialStrategyIntakeSource(
          current,
          this.objective,
          this.client,
        );
        this.update({ newSourceVerified: true });
      }
    });
  submit = (type: StrategyType) =>
    this.run(async (signal) => {
      if (!this.state.ready)
        throw new Error("Verify saved intake recovery before submitting.");
      await this.recovery.lock(async () => {
        const savedObjective = await this.recovery.authorize(signal);
        this.assert(signal);
        const saved = await this.recovery.load();
        this.assert(signal);
        if (this.state.retained && !saved)
          throw new Error(
            "The saved intake is inconsistent. No request was sent.",
          );
        if (
          !saved &&
          (savedObjective.status !== "ready" ||
            savedObjective.version !== this.objective.version)
        )
          throw new Error("Save the current ready Objective before intake.");
        const current = saved ? null : await this.readCurrent(signal);
        const origin =
          saved?.origin ??
          requireInitialStrategyIntakeSource(
            current,
            this.objective,
            this.client,
          );
        if (current) this.update({ newSourceVerified: true });
        const request =
          saved?.request ??
          governedObjectiveStrategyIntakeRequest.parse({
            params: {
              clientId: this.objective.clientId,
              objectiveId: this.objective.id,
            },
            body: {
              schemaVersion: 2,
              command: {
                schemaVersion: 1,
                requestId: crypto.randomUUID(),
                command: "retry",
                workAction: "objective.strategy.draft",
                expectedObjectiveVersion: origin.objective.revision.version,
                expectedControlVersion: 0,
                expectedCanonicalBindingVersion:
                  origin.requestedSource.canonicalBindingVersion,
                targetAuthorizationRequestId: null,
              },
              selection: { type, generationRequestId: crypto.randomUUID() },
            },
          });
        if (request.body.selection.type !== type)
          throw new Error(
            "Recover the original Strategy type before choosing another.",
          );
        const retained =
          saved ?? (await this.recovery.reserve(request, origin));
        this.assert(signal);
        if (
          retained.request.body.selection.type !== type ||
          retained.request.params.clientId !== this.objective.clientId ||
          retained.request.params.objectiveId !== this.objective.id
        )
          throw new Error(
            "A different saved Strategy intake must be recovered.",
          );
        this.update({ retained });
        if (retained.accepted) {
          await this.startSaved(retained, signal);
          return;
        }
        let next: RetainedStrategyIntake;
        try {
          const receipt = await this.strategyApi.request(
            "objectives.governedStrategy.intake",
            retained.request,
            { signal },
          );
          this.assert(signal);
          const accepted = requireGovernedObjectiveStrategyIntakeReceipt(
            receipt,
            retained.request,
            retained.origin,
          );
          next = { ...retained, accepted };
          await this.recovery.save(next);
          this.assert(signal);
          this.update({ retained: next });
        } catch {
          throw new Error(
            "The intake outcome is unconfirmed. Review current work, then recover this exact saved request.",
          );
        }
        // The accepted Core job is durable locally before any Meri start dispatch.
        await this.startSaved(next, signal);
      });
    });
  refresh = () =>
    this.run(async (signal) => {
      await this.recovery.authorize(signal);
      const retained = await this.recovery.load();
      this.assert(signal);
      if (this.state.retained && !retained)
        throw new Error(
          "The saved intake is inconsistent. No request was sent.",
        );
      this.update({ retained, ready: true, newSourceVerified: false });
      const current = await this.readCurrent(signal);
      if (retained?.accepted) await this.readJob(retained, signal);
      if (!retained)
        requireInitialStrategyIntakeSource(
          current,
          this.objective,
          this.client,
        );
      this.update({ newSourceVerified: !retained });
    });
  observe = () =>
    this.run(async (signal) => {
      this.assert(signal);
      const retained = this.state.retained;
      if (retained?.accepted) await this.readJob(retained, signal);
    });
}

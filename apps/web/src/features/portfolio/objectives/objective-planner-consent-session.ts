import {
  plannerConsentFor,
  requirePlannerConsentReceipt,
  plannerConsentAvailability,
  type RetainedPlannerConsent,
  type PlannerConsentRequest,
} from "@/shared/capiro/operations/objective-planner-consent";
import { requireGovernedObjectiveGenerationObservation } from "@/shared/capiro/operations/objective-governed-generation";
import type { SavedStrategySelection } from "@/shared/capiro/operations/objective-saved-review";

export interface PlannerConsentRecovery {
  guard(): void;
  authorize(signal: AbortSignal): Promise<void>;
  load(): Promise<RetainedPlannerConsent | null>;
  reserve(value: RetainedPlannerConsent): Promise<RetainedPlannerConsent>;
  save(value: RetainedPlannerConsent): Promise<void>;
  acknowledge(value: RetainedPlannerConsent): Promise<void>;
  lock<T>(action: () => Promise<T>): Promise<T>;
}
export interface PlannerConsentPorts {
  saved(signal: AbortSignal): Promise<unknown>;
  generation(
    requestId: string | undefined,
    signal: AbortSignal,
  ): Promise<unknown>;
  command(
    request: PlannerConsentRequest,
    signal: AbortSignal,
  ): Promise<unknown>;
}
export type PlannerConsentState = {
  busy: boolean;
  ready: boolean;
  retained?: RetainedPlannerConsent;
  error?: string;
  revision: number;
  canRetry?: boolean;
  canCancel?: boolean;
};
/** Owns one explicit consent command. The existing native worker owns application. */
export class ObjectivePlannerConsentSession {
  private state: PlannerConsentState = {
    busy: false,
    ready: false,
    revision: 0,
  };
  private listeners = new Set<() => void>();
  private active?: AbortController;
  constructor(
    private ports: PlannerConsentPorts,
    private recovery: PlannerConsentRecovery,
    private selection: SavedStrategySelection,
  ) {}
  snapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  suspend = () => this.active?.abort();
  private update(value: Partial<PlannerConsentState>) {
    this.state = { ...this.state, ...value };
    this.listeners.forEach((fn) => fn());
  }
  private assert(signal: AbortSignal) {
    signal.throwIfAborted();
    this.recovery.guard();
  }
  private async run(action: (signal: AbortSignal) => Promise<void>) {
    if (this.active) return;
    const controller = new AbortController();
    this.active = controller;
    this.update({
      busy: true,
      ready: false,
      error: undefined,
      canRetry: false,
      canCancel: false,
    });
    try {
      await this.recovery.lock(() => action(controller.signal));
    } catch {
      if (!controller.signal.aborted)
        this.update({
          error:
            "Planner consent could not be verified. Recover this same command; no replacement has been created.",
        });
    } finally {
      if (this.active === controller) this.active = undefined;
      this.update({ busy: false });
    }
  }
  private async load(signal: AbortSignal) {
    await this.recovery.authorize(signal);
    this.assert(signal);
    const retained = await this.recovery.load();
    this.assert(signal);
    if (this.state.retained && !retained)
      throw new Error("Missing retained Planner consent.");
    if (retained) this.update({ retained });
    return retained;
  }
  private async accept(
    raw: unknown,
    retained: RetainedPlannerConsent,
    signal: AbortSignal,
  ) {
    const receipt = requirePlannerConsentReceipt(
      raw,
      retained.request,
      retained.origin,
    );
    this.assert(signal);
    const next = { ...retained, receipt };
    await this.recovery.save(next);
    this.assert(signal);
    this.update({
      retained: next,
      ready: true,
    });
  }
  private async observe(retained: RetainedPlannerConsent, signal: AbortSignal) {
    const request = {
      params: retained.request.params,
      query: {
        workAction: "objective.plan.prepare" as const,
        requestId: retained.request.body.requestId,
      },
    };
    const read = requireGovernedObjectiveGenerationObservation(
      await this.ports.generation(request.query.requestId, signal),
      request,
    );
    if (!read.commandReceipt)
      throw new Error("Original Planner command is unavailable.");
    await this.accept(read.commandReceipt, retained, signal);
  }
  private async current(signal: AbortSignal) {
    const saved = await this.ports.saved(signal);
    this.assert(signal);
    const origin = await this.ports.generation(undefined, signal);
    this.assert(signal);
    const available = plannerConsentAvailability(origin, saved, this.selection);
    this.update({
      ready: true,
      canRetry: available.canRetry,
      canCancel: available.canCancel,
      revision: this.state.revision + 1,
    });
    return { saved, origin };
  }
  refresh = () =>
    this.run(async (signal) => {
      const retained = await this.load(signal);
      if (retained) await this.observe(retained, signal);
      await this.current(signal);
    });
  execute = () =>
    this.run(async (signal) => {
      let retained = await this.load(signal);
      if (retained?.receipt) {
        await this.observe(retained, signal);
        await this.current(signal);
        return;
      }
      if (!retained) {
        const saved = await this.ports.saved(signal);
        this.assert(signal);
        const origin = await this.ports.generation(undefined, signal);
        this.assert(signal);
        retained = await this.recovery.reserve(
          plannerConsentFor(origin, saved, this.selection, crypto.randomUUID()),
        );
        this.assert(signal);
        this.update({ retained });
      }
      // Explicit retry keeps the persisted input/UUID. The Core command owner first recovers its original receipt.
      const receipt = await this.ports.command(retained.request, signal);
      await this.accept(receipt, retained, signal);
      await this.current(signal);
    });
  /** An explicit successor requires an original receipt, then fresh source/control/operation observations. */
  change = (command: "retry" | "cancel") =>
    this.run(async (signal) => {
      const previous = await this.load(signal);
      if (previous) await this.observe(previous, signal);
      const { saved, origin } = await this.current(signal);
      const next = plannerConsentFor(
        origin,
        saved,
        this.selection,
        crypto.randomUUID(),
        command,
      );
      if (previous) {
        const confirmed = this.state.retained;
        if (!confirmed?.receipt)
          throw new Error("Original Planner command is unconfirmed.");
        await this.recovery.acknowledge(confirmed);
        this.assert(signal);
        this.update({ retained: undefined });
      }
      const retained = await this.recovery.reserve(next);
      this.assert(signal);
      this.update({ retained });
      const receipt = await this.ports.command(retained.request, signal);
      await this.accept(receipt, retained, signal);
      await this.current(signal);
    });
}

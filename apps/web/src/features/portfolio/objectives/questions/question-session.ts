import { z } from "zod";
import { CapiroApiError, type CapiroApi } from "@/shared/capiro/http";
import {
  questionCommandSchema,
  questionReceiptSchema,
  requireQuestionReceipt,
  questionCommandPayloadDigest,
  type questionOperations,
  type QuestionCommand,
  type QuestionReceipt,
} from "@/shared/capiro/operations/objective-questions";
import {
  acknowledgeRecovery,
  readRecovery,
  reserveRecovery,
  updateRecovery,
  withRecoveryCommandLock,
  retireObjectiveQuestionRefusalRecovery,
} from "@/shared/session/recovery/journal";

const retainedSchema = z
  .object({
    command: questionCommandSchema,
    receipt: questionReceiptSchema.optional(),
    refusal: z.literal("OBJECTIVE_QUESTION_REFUSED").optional(),
  })
  .strict()
  .refine((row) => !(row.receipt && row.refusal));
type Retained = z.infer<typeof retainedSchema>;
type Draft = QuestionCommand extends infer C
  ? C extends QuestionCommand
    ? Omit<C, "requestId">
    : never
  : never;
const contract = {
  schema: retainedSchema,
  requestId: (value: Retained) => value.command.requestId,
  validateUpdate(previous: Retained, next: Retained) {
    if (
      JSON.stringify(previous.command) !== JSON.stringify(next.command) ||
      (previous.receipt && JSON.stringify(previous.receipt) !== JSON.stringify(next.receipt)) ||
      (previous.refusal && previous.refusal !== next.refusal)
    )
      throw Error("The original Question command changed.");
  },
};
export interface QuestionSessionState {
  ready: boolean;
  busy: boolean;
  retained?: Retained;
  error?: string;
}
export class QuestionSession {
  private state: QuestionSessionState = { ready: false, busy: false };
  private listeners = new Set<() => void>();
  private active?: AbortController;
  private readonly scope: string;
  constructor(
    private api: CapiroApi<typeof questionOperations>,
    private actor: { tenantId: string; userId: string },
    private target: { clientId: string; objectiveId: string },
    private guard: () => void,
  ) {
    this.scope = JSON.stringify([
      "objective-questions-v1",
      actor.tenantId,
      actor.userId,
      target.clientId,
      target.objectiveId,
    ]);
  }
  snapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
      if (!this.listeners.size) this.active?.abort();
    };
  };
  private update(value: Partial<QuestionSessionState>) {
    this.state = { ...this.state, ...value };
    this.listeners.forEach((listener) => listener());
  }
  private assert(signal: AbortSignal) {
    signal.throwIfAborted();
    this.guard();
  }
  private async run(work: (signal: AbortSignal) => Promise<void>) {
    if (this.state.busy) return;
    const controller = new AbortController();
    this.active = controller;
    this.update({ busy: true, error: undefined });
    try {
      await withRecoveryCommandLock(this.scope, this.guard, () => work(controller.signal));
    } catch (error) {
      this.update({
        error:
          error instanceof Error
            ? error.message
            : "Question outcome could not be verified. Recover the original request.",
      });
    } finally {
      if (this.active === controller) this.active = undefined;
      this.update({ busy: false });
    }
  }
  private async load(signal: AbortSignal) {
    this.assert(signal);
    const retained = await readRecovery(this.scope, contract, this.guard);
    this.assert(signal);
    if (!retained && this.state.retained)
      throw Error("Original Question recovery is missing. No new command will be sent.");
    if (retained?.receipt)
      requireQuestionReceipt(
        retained.receipt,
        retained.command,
        this.actor.userId,
        await questionCommandPayloadDigest(retained.command),
      );
    this.assert(signal);
    this.update({ ready: true, retained: retained ?? undefined });
    return retained;
  }
  hydrate = () =>
    this.run(async (signal) => {
      await this.load(signal);
    });
  private async install(value: QuestionReceipt, retained: Retained, signal: AbortSignal) {
    this.assert(signal);
    const receipt = requireQuestionReceipt(
      value,
      retained.command,
      this.actor.userId,
      await questionCommandPayloadDigest(retained.command),
    );
    const saved = { command: retained.command, receipt };
    await updateRecovery(this.scope, retained.command.requestId, saved, contract, this.guard);
    this.assert(signal);
    this.update({ retained: saved });
  }
  private async send(retained: Retained, signal: AbortSignal) {
    this.assert(signal);
    try {
      const value = await this.api.request(
        "objectives.questions.command",
        { params: this.target, body: retained.command },
        { signal },
      );
      await this.install(value, retained, signal);
    } catch (error) {
      this.assert(signal);
      if (
        error instanceof CapiroApiError &&
        error.status === 409 &&
        error.upstreamCode === "OBJECTIVE_QUESTION_REFUSED"
      ) {
        const saved: Retained = {
          command: retained.command,
          refusal: "OBJECTIVE_QUESTION_REFUSED",
        };
        await updateRecovery(this.scope, retained.command.requestId, saved, contract, this.guard);
        this.assert(signal);
        this.update({ retained: saved });
        return;
      }
      throw error;
    }
  }
  execute = (draft: Draft) =>
    this.run(async (signal) => {
      if (await this.load(signal)) throw Error("Reconcile the original Question command first.");
      const command = questionCommandSchema.parse({ ...draft, requestId: crypto.randomUUID() });
      const retained = await reserveRecovery(
        this.scope,
        command.requestId,
        { command },
        contract,
        this.guard,
      );
      this.assert(signal);
      this.update({ retained });
      // A concurrent tab's retained command must be recovered, never silently dispatched here.
      if (retained.command.requestId !== command.requestId)
        throw Error("Another Question command is pending. Recover it first.");
      await this.send(retained, signal);
    });
  recover = () =>
    this.run(async (signal) => {
      const retained = await this.load(signal);
      if (!retained || retained.receipt || retained.refusal) return;
      const value = await this.api.request(
        "objectives.questions.receipt",
        { params: { ...this.target, requestId: retained.command.requestId } },
        { signal },
      );
      await this.install(value, retained, signal);
    });
  retry = () =>
    this.run(async (signal) => {
      const retained = await this.load(signal);
      if (retained && !retained.receipt && !retained.refusal) await this.send(retained, signal);
    });
  acknowledge = () =>
    this.run(async (signal) => {
      const retained = await this.load(signal);
      if (!retained || (!retained.receipt && !retained.refusal))
        throw Error("Original Question outcome is still unknown.");
      // Fresh source read precedes retirement; denied/missing source cannot clear the fence.
      await this.api.request(
        "objectives.questions.list",
        { params: this.target, query: {} },
        { signal },
      );
      this.assert(signal);
      if (retained.receipt) {
        requireQuestionReceipt(
          retained.receipt,
          retained.command,
          this.actor.userId,
          await questionCommandPayloadDigest(retained.command),
        );
        await acknowledgeRecovery(this.scope, retained.command.requestId, this.guard);
      } else
        await retireObjectiveQuestionRefusalRecovery(
          this.scope,
          retained.command.requestId,
          this.guard,
        );
      this.assert(signal);
      this.update({ retained: undefined });
    });
}

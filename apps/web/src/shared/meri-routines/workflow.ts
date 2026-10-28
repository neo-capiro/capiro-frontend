import {
  receiveRoutinesRequest,
  type RoutinesPrepareRequest,
  type RoutinesListResponse,
} from "@capiro/meri-contracts/routines-application";
import {
  consentObservation,
  type RoutineExpectationOf,
  type RoutineRequestOf,
  type RoutineResponseOf,
  type RoutineRouteName,
  type RoutinesConsentApproveRequest,
  type RoutinesConsentApproveResponse,
  type RoutinesConsentReviewResponse,
} from "./consent";
import { sameJson } from "../meri-actions/correlation";
import { RoutinesAccessDenied, type RoutinesAccess } from "./access";
import {
  routineRecovery,
  routineApproval,
  routineDecision,
  receiveSavedRoutine,
  isRoutineManagement,
  requireFutureRoutineChange,
  type RoutineContext,
  type SavedRoutine,
} from "./recovery";

/** MR-04 renewal custody in this view: the exact review shown, its ONE decision id, and the outcome seen so far. */
export type RoutineConsentState = Readonly<{
  scheduleId: string;
  /** Stable decision identity for exactly this review. Every attempt of it re-presents this one id, so a lost
   *  acknowledgement can never become a second durable decision. */
  requestId: string;
  review: RoutinesConsentReviewResponse;
  /** Core's own window after a confirmed renewal; the observation is re-read canonically alongside it. */
  window: RoutinesConsentApproveResponse | null;
  /** An attempt whose outcome is not proven. The decision stays claimed and is never read as a refusal. */
  unknown: boolean;
}>;
export type RoutineState = Readonly<{
  ready: boolean;
  busy: boolean;
  saved: SavedRoutine | null;
  message: string | null;
  settled: boolean;
  accessDenied: boolean;
  /** Read consent and renewal for one routine. Read-only until the owner explicitly approves the review. */
  consent: RoutineConsentState | null;
}>;
type Options = {
  context: RoutineContext;
  access: RoutinesAccess;
  signal: AbortSignal;
  isCurrent: () => boolean;
  /** Existing session retirement owner; invoked once after a definitive refusal has cleared this view. */
  onAccessLost?: () => void;
  /** Admitted chat proposal. Its proposal ID is a local storage key, never a new prepare request. */
  seed?: SavedRoutine;
};

/** Explicit routine prepare/approve/reconcile over the existing encrypted command journal. */
export class RoutineWorkflow {
  private state: RoutineState = {
    ready: false,
    busy: false,
    saved: null,
    message: null,
    settled: false,
    accessDenied: false,
    consent: null,
  };
  private listeners = new Set<() => void>();
  private disposed = false;
  constructor(private readonly options: Options) {
    this.observeLifetime();
  }
  getSnapshot = () => this.state;
  /** UI affordance only; the server independently enforces the management vocabulary. */
  get managementOnly() {
    return isRoutineManagement(this.options.context);
  }
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  attach = () => {
    this.disposed = false;
    this.observeLifetime();
    return this.dispose;
  };
  dispose = () => {
    this.disposed = true;
    this.options.signal.removeEventListener("abort", this.endLifetime);
    this.listeners.clear();
  };
  /**
   * The existing session lifetime owns this view: ending it retires privileged content without
   * reading an ordinary renewal or expiry as a refusal. One registration per lifetime.
   */
  private observeLifetime() {
    this.options.signal.addEventListener("abort", this.endLifetime, {
      once: true,
    });
    if (this.options.signal.aborted) this.endLifetime();
  }
  private endLifetime = () => {
    // Retiring the lifetime retires the privileged review and any confirmed window with it; the durable decision and
    // its outcome live in the runtime journal, not in this view, and are never replayed from here.
    this.state = Object.freeze({
      ...this.state,
      saved: null,
      settled: false,
      consent: null,
    });
    for (const listener of this.listeners) listener();
  };
  private guard = () => {
    if (this.state.accessDenied) throw new RoutinesAccessDenied();
    this.options.signal.throwIfAborted();
    if (this.disposed || !this.options.isCurrent())
      throw new DOMException("Current routine context changed.", "AbortError");
  };
  private journal(guard = this.guard) {
    return routineRecovery(
      this.options.context,
      guard,
      this.options.seed?.proposal?.proposalId,
    );
  }
  private publish(change: Partial<RoutineState>) {
    this.guard();
    this.state = Object.freeze({ ...this.state, ...change });
    for (const listener of this.listeners) listener();
  }
  private async exchange<R extends RoutineRouteName>(
    route: R,
    request: RoutineRequestOf<R>,
    expectation: RoutineExpectationOf<R>,
  ): Promise<RoutineResponseOf<R>> {
    this.guard();
    try {
      const response = await this.options.access.exchange(
        route,
        request,
        expectation,
        this.options.signal,
      );
      if (
        "error" in response &&
        response.error.code === "ROUTINES_ACCESS_DENIED"
      )
        throw new RoutinesAccessDenied();
      return response;
    } catch (error) {
      if (error instanceof RoutinesAccessDenied && !this.state.accessDenied) {
        // Clearing a refused view must also work during temporary identity revalidation.
        // The encrypted journal retains the exact command and any uncertain outcome.
        this.state = Object.freeze({
          ...this.state,
          accessDenied: true,
          saved: null,
          settled: false,
          message: error.message,
        });
        for (const listener of this.listeners) listener();
        // Retire this exact lifetime once so every view on the refused session ends and only an
        // explicit Connect can issue fresh access; the refused token is never reused or replayed.
        this.options.onAccessLost?.();
      }
      throw error;
    }
  }
  private matching(value: SavedRoutine) {
    const expected = this.options.context,
      actual = value.context;
    if (
      actual.tenantId !== expected.tenantId ||
      actual.actorId !== expected.actorId ||
      actual.selectedClientId !== expected.selectedClientId ||
      isRoutineManagement(actual) !== isRoutineManagement(expected) ||
      ("conversationId" in actual &&
        "conversationId" in expected &&
        actual.conversationId !== expected.conversationId)
    )
      throw new Error(
        "Reconnect to the original saved routine conversation before continuing.",
      );
    if (
      this.options.seed &&
      (!sameJson(value.prepare, this.options.seed.prepare) ||
        !sameJson(value.proposal, this.options.seed.proposal))
    )
      throw new Error("The retained routine proposal changed.");
    return value;
  }
  load = async () => {
    await this.perform(async () => {
      const saved = await this.journal().load();
      const seed = this.options.seed;
      const disposition =
        !saved && seed
          ? await this.journal().disposition(seed.requestId)
          : null;
      this.publish({
        saved: saved
          ? this.matching(saved)
          : disposition
            ? null
            : seed
              ? this.matching(await receiveSavedRoutine(seed))
              : null,
        settled: disposition?.state === "acknowledged",
        ready: true,
      });
    });
  };
  private async perform(action: () => Promise<void>) {
    if (this.state.busy) return;
    try {
      this.publish({ busy: true, message: null });
      await this.journal().lock(action);
    } catch (error) {
      try {
        this.publish({
          message:
            error instanceof Error
              ? error.message
              : "The routine outcome could not be confirmed.",
        });
      } catch {
        /* The former view cannot adopt anything. */
      }
    } finally {
      // Temporary current-client revalidation may hide the view without destroying this port.
      // Releasing its local busy flag publishes no new private data or result and must not require authority.
      this.state = Object.freeze({ ...this.state, busy: false });
      if (!this.disposed && !this.options.signal.aborted)
        for (const listener of this.listeners) listener();
    }
  }
  private async exact() {
    const displayed = this.state.saved;
    if (!displayed) throw new Error("No saved routine request is available.");
    const stored = await this.journal().load();
    if (!stored) {
      if (
        this.options.seed &&
        !displayed.approving &&
        !(await this.journal().disposition(displayed.requestId))
      )
        return this.matching(await this.journal().reserve(displayed));
      const disposition = await this.journal().disposition(displayed.requestId);
      if (disposition)
        this.publish({
          saved: null,
          settled: disposition.state === "acknowledged",
        });
      throw new Error(
        "The saved routine changed in another view. Review its current state before continuing.",
      );
    }
    this.matching(stored);
    if (!sameJson(stored, displayed)) {
      this.publish({ saved: stored });
      throw new Error(
        "The saved routine changed in another view. Review it before another action.",
      );
    }
    return stored;
  }
  prepare = (request: RoutinesPrepareRequest) =>
    this.perform(async () => {
      if (!this.state.ready || this.state.saved || this.options.seed)
        throw new Error("Resolve the saved routine before preparing another.");
      const body = await receiveRoutinesRequest(
        "prepare",
        JSON.stringify(request),
      );
      if (this.managementOnly) requireFutureRoutineChange(body);
      const saved = await this.journal().reserve({
        requestId: body.requestId,
        context: this.options.context,
        prepare: body,
        approving: false,
      });
      this.publish({ saved: this.matching(saved), settled: false });
      if (!sameJson(saved.prepare, body))
        throw new Error(
          "A different routine is already saved. Review it first.",
        );
      await this.sendPrepare(saved);
    });
  retryPrepare = () =>
    this.perform(async () => {
      const saved = await this.exact();
      if (saved.proposal || saved.approving || this.options.seed)
        throw new Error("This routine preparation cannot be repeated.");
      await this.sendPrepare(saved);
    });
  private async sendPrepare(saved: SavedRoutine) {
    const response = await this.exchange("prepare", saved.prepare, {
      request: saved.prepare,
    });
    if ("error" in response)
      throw new Error(
        `Routine preparation could not be confirmed (${response.error.code}). The original request is retained.`,
      );
    const next = await receiveSavedRoutine({
      ...saved,
      proposal: response.proposal,
    });
    await this.journal(() => {}).update(next);
    this.publish({ saved: next });
  }
  approve = () =>
    this.perform(async () => {
      let saved = await this.exact();
      if (!saved.proposal || saved.result)
        throw new Error("A reviewed unresolved routine proposal is required.");
      // This marker is committed before any approval HTTP, including an exact retry after a lost acknowledgement.
      saved = await this.journal().update({ ...saved, approving: true });
      this.publish({ saved });
      const request = routineApproval(saved);
      const response = await this.exchange("approve", request, {
        request,
        proposal: saved.proposal!,
      });
      if ("error" in response)
        throw new Error(
          `Routine approval could not be confirmed (${response.error.code}). Check the saved result or retry this exact approval.`,
        );
      const next = {
        ...saved,
        result: { route: "approve" as const, value: response },
      };
      await this.journal(() => {}).update(next);
      this.publish({ saved: next });
    });
  reconcile = () =>
    this.perform(async () => {
      const saved = await this.exact();
      if (!saved.approving || !saved.proposal)
        throw new Error("No saved approval needs reconciliation.");
      const request = routineDecision(saved);
      const response = await this.exchange("reconcile", request, {
        request,
        proposal: saved.proposal,
      });
      if ("error" in response || response.outcome !== "ACKNOWLEDGED")
        throw new Error(
          "The schedule owner has not confirmed this change. The exact approval remains saved; no replacement routine was created.",
        );
      const next = {
        ...saved,
        result: { route: "reconcile" as const, value: response },
      };
      await this.journal(() => {}).update(next);
      this.publish({ saved: next });
    });
  finish = () =>
    this.perform(async () => {
      const saved = await this.exact();
      if (!saved.result)
        throw new Error("A confirmed schedule result is required.");
      await this.journal().acknowledge(saved);
      this.publish({ saved: null, settled: true });
    });
  discard = () =>
    this.perform(async () => {
      const saved = await this.exact();
      if (saved.approving)
        throw new Error("A dispatched approval must retain exact recovery.");
      await this.journal().discard(saved);
      this.publish({ saved: null, settled: false });
    });
  list = async (
    afterScheduleId: string | null = null,
  ): Promise<RoutinesListResponse> => {
    this.guard();
    // MR-04 visibility: this read asks for the consent observation explicitly. The opt-in is metadata only and grants
    // nothing, and an unchanged body is still answered with the exact legacy shape by the same receiving boundary.
    const request = {
      afterScheduleId,
      limit: 20,
      historyLimit: 10,
      observation: consentObservation,
    };
    const response = await this.exchange("list", request, { request });
    this.guard();
    if ("error" in response)
      throw new Error("Current routines could not be read.");
    for (const row of response.page.rows)
      if (
        row.projection.owner.tenantId !== this.options.context.tenantId ||
        row.projection.owner.actorId !== this.options.context.actorId
      )
        throw new Error("The routine list account changed.");
    return response;
  };
  /**
   * MR-04 renewal review: read-only. It shows the exact original intent, its scopes and its EFFECTIVE limits together
   * with Core's current observation, and it mints this view's ONE decision id for exactly that review. It creates no
   * consent, no schedule generation and no dispatch, and it admits no model budget.
   */
  reviewConsent = (scheduleId: string) =>
    this.perform(async () => {
      const request = { scheduleId };
      const response = await this.exchange("consentReview", request, {
        request,
      });
      if ("error" in response)
        throw new Error(
          `The routine renewal review could not be read (${response.error.code}).`,
        );
      this.publish({
        consent: Object.freeze({
          scheduleId,
          requestId: crypto.randomUUID(),
          review: response,
          window: null,
          unknown: false,
        }),
      });
    });
  /**
   * MR-04 renewal approval: the owner's explicit decision over exactly the review this view is showing. Every attempt
   * re-presents the SAME decision id, so a lost acknowledgement can never become a second durable approval, and an
   * unproven outcome is reported as unknown rather than as a refusal. It starts no execution and resumes no routine.
   */
  renewConsent = () =>
    this.perform(async () => {
      const held = this.state.consent;
      if (!held)
        throw new Error("Review the routine renewal before approving it.");
      if (held.window) return;
      const request: RoutinesConsentApproveRequest = {
        scheduleId: held.scheduleId,
        reviewSha256: held.review.reviewSha256,
        requestId: held.requestId,
        decision: "approved",
      };
      let definite = false;
      try {
        const response = await this.exchange("consentApprove", request, {
          request,
          review: held.review,
        });
        if ("error" in response) {
          // The receiving boundary's own disposition decides. A proven non-dispatch is a definite refusal; anything
          // else is an unproven Core/effect outcome and stays UNKNOWN with the same decision retained.
          definite = response.error.outcome === "NOT_DISPATCHED";
          this.publish({ consent: Object.freeze({ ...held, unknown: !definite }) });
          throw new Error(
            definite
              ? `The routine renewal was refused (${response.error.code}). Re-read the current review before deciding again.`
              : `The routine renewal outcome is not confirmed (${response.error.code}). The same approval is retained; retry it exactly.`,
          );
        }
        // Core's own window for the reviewed generation, then the canonical observation re-read: the view shows what
        // Core actually holds. Nothing is executed, resumed or dispatched by a renewal.
        this.publish({
          consent: Object.freeze({
            ...held,
            window: response,
            unknown: false,
          }),
        });
        const reread = await this.exchange(
          "consentReview",
          { scheduleId: held.scheduleId },
          { request: { scheduleId: held.scheduleId } },
        );
        if (!("error" in reread) && this.state.consent)
          this.publish({
            consent: Object.freeze({ ...this.state.consent, review: reread }),
          });
      } catch (error) {
        if (!definite) {
          try {
            if (this.state.consent && !this.state.consent.unknown)
              this.publish({
                consent: Object.freeze({ ...this.state.consent, unknown: true }),
              });
          } catch {
            /* The former view cannot adopt anything. */
          }
        }
        throw error;
      }
    });
}

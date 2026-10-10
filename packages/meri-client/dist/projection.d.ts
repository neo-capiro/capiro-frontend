import type { RunStatusState, UIEvent } from './types.js';
export type ProjectionStatus = 'accepted' | 'duplicate' | 'conflict' | 'gap' | 'out-of-scope';
export interface ProjectionResult {
    status: ProjectionStatus;
    eventId: string;
    sequence: number;
    /** Last accepted contiguous conversation sequence after handling this event. */
    cursor: number;
    reason?: string;
}
/** The authorized view the projection is scoped to (offline fixture, not authentication). */
export interface AuthorizedView {
    tenantId: string;
    actorId: string;
    conversationId: string;
}
export interface RunStatusProjection {
    state: RunStatusState;
    reasonCode: string | null;
}
/**
 * Raised by `acceptOrReject` on a conflict or out-of-scope outcome, so the guarded
 * data path aborts the subscription before the offending chunk is forwarded.
 */
export declare class ProjectionRejectionError extends Error {
    readonly result: ProjectionResult;
    constructor(result: ProjectionResult);
}
/**
 * Synchronous acceptance for the guarded data path: throws `ProjectionRejectionError`
 * on an immutable-event/sequence conflict or an out-of-scope binding. Duplicates
 * (idempotent) and gaps (paused, cursor preserved) are allowed and returned.
 */
export declare function acceptOrReject(projection: ConversationProjection, event: UIEvent): ProjectionResult;
export declare class ConversationProjection {
    readonly view: AuthorizedView;
    private cursor;
    private readonly byEventId;
    private readonly bySequence;
    private readonly pending;
    private readonly ordered;
    private lastStatus;
    private streamOutcome;
    constructor(view: AuthorizedView);
    /**
     * Accepts a validated frozen event. Every frozen event is handled exactly once:
     * immutable (eventId + canonical payload) dedup, duplicate-sequence conflict
     * detection, contiguous cursor advance, and gap pausing without advancing the
     * cursor. Legitimate historical prior-fence events are preserved by sequence;
     * stale publication is rejected upstream at the broker, not by discarding history.
     *
     * The stored value is a deep-frozen snapshot: the caller's object is never retained.
     */
    accept(event: UIEvent): ProjectionResult;
    private commit;
    private drainPending;
    /** Records the connection/stream outcome separately from any durable run result. */
    setStreamOutcome(outcome: 'unknown' | 'completed' | 'failed' | 'aborted'): void;
    /** A fresh frozen snapshot array; mutating it never affects internal history. */
    get accepted(): readonly UIEvent[];
    get currentCursor(): number;
    get pendingSequences(): number[];
    get runStatus(): RunStatusProjection | undefined;
    get connectionOutcome(): 'unknown' | 'completed' | 'failed' | 'aborted';
    /**
     * A run is complete only when an authoritative `run.status` event says so.
     * A finish chunk, `[DONE]`, ready hook status or HTTP 204 is never sufficient.
     */
    isRunCompleted(): boolean;
}
/**
 * Renders a `run.error` event by approved code or a generic message. The raw
 * transport/exception text in `event.data.message` is never surfaced.
 */
export declare function renderRunError(event: Extract<UIEvent, {
    type: 'run.error';
}>): {
    code: string;
    retryable: boolean;
    message: string;
};

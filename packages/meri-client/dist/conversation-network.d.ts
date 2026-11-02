import type { ConversationSubmittedResponse } from "@capiro/meri-contracts/conversation-application";
type Binding = ConversationSubmittedResponse["run"]["binding"];
/** Supplied by the existing opaque-session owner. Browser selection grants no authority. */
export interface ConversationLifetime {
    context: Readonly<Pick<Binding, "tenantId" | "actorId" | "conversationId" | "runId"> & {
        selectedClientId: string | null;
    }>;
    credential: string;
    expiresAtMs: number;
    signal: AbortSignal;
    isCurrent: () => boolean;
    onAccessLost: () => void;
    /**
     * The session owner's existing early renewal: it ends this session so a fresh one is issued for the same exact
     * binding, and answers whether it did. An event-stream (re)connect asks for it instead of dispatching when the
     * credential is about to expire ("near-expiry", declined while the owner has a write in flight), and when control
     * answers the stream 403 SESSION_REFUSED ("refused": control no longer holds this credential). Omitted, both keep
     * the previous behaviour: dispatch, and revoke on that 403.
     */
    requestRenewal?: (reason: "near-expiry" | "refused") => boolean;
    now?: () => number;
    fetchImpl?: typeof fetch;
    /** Trusted connection configuration; omitted means the current browser origin. */
    origin?: string;
    /**
     * Where the opaque credential travels. The same-origin proxy reads its own header so the
     * credential never shadows the native session cookie; a direct trusted origin expects a bearer.
     */
    credentialHeader?: "x-meri-action-session" | "authorization";
}
/** The detail a typed skill refusal carries next to its code (contracts 0.1.47). */
export type ConversationRefusalDetail = Readonly<{
    sources?: readonly string[];
    requiredScope?: "client" | "general";
}>;
/**
 * A refusal decided before any run exists, answered with its own contract status (400 for the typed
 * skill refusals, 429 for a reached monthly cap, contracts 0.1.51): the request was not dispatched
 * and may be changed or sent again.
 */
export declare const DEFINITIVE_REFUSALS: ReadonlySet<string>;
export declare class ConversationUnavailable extends Error {
    readonly code: string;
    readonly status?: number | undefined;
    readonly detail: ConversationRefusalDetail;
    /** `status` is the HTTP answer that carried a closed error code, when one did. */
    constructor(code: string, status?: number | undefined, detail?: ConversationRefusalDetail);
    /** Control refused this exact request outright; nothing was dispatched and nothing is in flight. */
    get definitive(): boolean;
}
/**
 * The shared edge answered a request route with 403 before Meri saw it (its WAF rules refuse some
 * message text): an HTML page or an empty block, never control's JSON error envelope. Nothing was
 * admitted and the session's membership did not change, so the request is reported as refused and
 * the same request may be retried; it is never a revocation. Control's own 403 still revokes.
 */
export declare const EDGE_REFUSED = "request-refused-at-edge";
/**
 * An event-stream (re)connect this close to the credential's expiry asks the session owner to renew first: control
 * refuses a credential it no longer holds (SESSION_REFUSED) before any recheck, and the browser's clock is not
 * control's. Never more than a quarter of the issued lifetime, so a fresh session is never "near expiry".
 */
export declare const RECONNECT_RENEW_LEAD_MS = 10000;
/** Owns only this connection's observation resources, never durable cancellation. */
export declare class ConversationNetwork {
    private readonly onDispose;
    private readonly owner;
    private readonly now;
    private credential;
    private readonly expiration;
    private stream;
    private revoked;
    private readonly options;
    private readonly renewLeadMs;
    readonly origin: string;
    private readonly credentialHeader;
    constructor(options: ConversationLifetime, onDispose: () => void);
    check: () => void;
    revoke(): void;
    /**
     * Asks the session owner for its early renewal (see `ConversationLifetime.requestRenewal`). True when it ended this
     * session for a fresh one; this connection is then disposed and must not dispatch.
     */
    private renew;
    dispose: () => void;
    stopObservation(): void;
    private lease;
    private dispatch;
    json(path: string, body: Uint8Array, onDispatch?: () => void, budget?: Readonly<{
        requestBytes: number;
        responseBytes: number;
        maxRequestMs: number;
    }>, 
    /** Request routes the edge may refuse outright; a 403 there is not a membership change. */
    forbidden?: "revoke" | "refuse"): Promise<{
        status: number;
        bytes: Uint8Array;
    }>;
    observe(path: string, init: RequestInit): Promise<Response>;
}
export {};

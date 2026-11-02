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
export declare class ConversationUnavailable extends Error {
    readonly code: string;
    readonly status?: number | undefined;
    /** `status` is the HTTP answer that carried a closed error code, when one did. */
    constructor(code: string, status?: number | undefined);
}
/**
 * The shared edge answered a request route with 403 before Meri saw it (its WAF rules refuse some
 * message text): an HTML page or an empty block, never control's JSON error envelope. Nothing was
 * admitted and the session's membership did not change, so the request is reported as refused and
 * the same request may be retried; it is never a revocation. Control's own 403 still revokes.
 */
export declare const EDGE_REFUSED = "request-refused-at-edge";
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
    readonly origin: string;
    private readonly credentialHeader;
    constructor(options: ConversationLifetime, onDispose: () => void);
    check: () => void;
    revoke(): void;
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

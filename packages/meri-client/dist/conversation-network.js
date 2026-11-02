import { conversationApplicationMetadata as protocol } from "@capiro/meri-contracts/conversation-application";
/**
 * A refusal decided before any run exists, answered with its own contract status (400 for the typed
 * skill refusals, 429 for a reached monthly cap, contracts 0.1.51; 409 for an expired original input,
 * contracts 0.1.53): the request was not dispatched and may be changed or sent again.
 */
export const DEFINITIVE_REFUSALS = new Set([
    "SKILL_SOURCES_UNAVAILABLE",
    "SKILL_SCOPE_REFUSED",
    "TENANT_MONTHLY_CAP_REACHED",
    "INITIAL_INPUT_EXPIRED",
]);
/**
 * The conversation's original (first) input can never be this request: its allocation expired, or it
 * belongs to another request. Allocate answers both with outcome NOT_DISPATCHED, so the retained first
 * message is released and the person sends it again in a new conversation.
 */
export const ORIGINAL_INPUT_CLOSED = new Set([
    "INITIAL_INPUT_EXPIRED",
    "INITIAL_INPUT_CONFLICT",
]);
const errorStatuses = protocol.errorStatuses;
export class ConversationUnavailable extends Error {
    code;
    status;
    detail;
    originalClosed;
    /** `status` is the HTTP answer that carried a closed error code, when one did. */
    constructor(code, status, detail = {}, 
    /** Allocate's own NOT_DISPATCHED answer that this conversation's original input is closed to the request. */
    originalClosed = false) {
        super(code);
        this.code = code;
        this.status = status;
        this.detail = detail;
        this.originalClosed = originalClosed;
        this.name = "ConversationUnavailable";
    }
    /** Control refused this exact request outright; nothing was dispatched and nothing is in flight. */
    get definitive() {
        return (this.originalClosed ||
            (DEFINITIVE_REFUSALS.has(this.code) &&
                this.status !== undefined &&
                !!errorStatuses[this.code]?.includes(this.status)));
    }
}
/**
 * The shared edge answered a request route with 403 before Meri saw it (its WAF rules refuse some
 * message text): an HTML page or an empty block, never control's JSON error envelope. Nothing was
 * admitted and the session's membership did not change, so the request is reported as refused and
 * the same request may be retried; it is never a revocation. Control's own 403 still revokes.
 */
export const EDGE_REFUSED = "request-refused-at-edge";
const JSON_MEDIA = /^application\/json(?:;\s*charset=utf-8)?$/i;
/** Control's error envelope code, `{ "error": { "code": "…" } }`, or undefined for any other bytes. */
function envelopeCode(bytes) {
    try {
        const value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
        const error = value !== null && typeof value === "object" && "error" in value
            ? value.error
            : undefined;
        const code = error !== null && typeof error === "object" && "code" in error
            ? error.code
            : undefined;
        return typeof code === "string" && code.length > 0 ? code : undefined;
    }
    catch {
        return undefined;
    }
}
/** True when the bytes are control's error envelope: `{ "error": { "code": "…" } }`. */
const errorEnvelope = (bytes) => envelopeCode(bytes) !== undefined;
const STREAM_BYTES = 8 * 1024 * 1024;
const REQUEST_MS = 30_000;
/**
 * One observation. Meri closes each window cleanly within 30 s of its own start; the same-origin proxy waits up to
 * REQUEST_MS for Meri's headers and bounds the stream 35 s past them. This lease sits past both, so Meri's clean end, not
 * this timer, ends a healthy window; it only catches a stream that neither server ended.
 */
const OBSERVATION_MS = 70_000;
/**
 * An event-stream (re)connect this close to the credential's expiry asks the session owner to renew first: control
 * refuses a credential it no longer holds (SESSION_REFUSED) before any recheck, and the browser's clock is not
 * control's. Never more than a quarter of the issued lifetime, so a fresh session is never "near expiry".
 */
export const RECONNECT_RENEW_LEAD_MS = 10_000;
const discard = (response) => {
    void response.body?.cancel().catch(() => { });
};
/** Strict UTF-8 and finite allocation before the SDK's own SSE parser. No SSE parsing here. */
function boundedBody(response, signal, check, maxBytes, done) {
    const reader = response.body?.getReader();
    if (!reader) {
        done();
        throw new ConversationUnavailable("missing-body");
    }
    const decoder = new TextDecoder("utf-8", { fatal: true });
    let bytes = 0, ended = false;
    let abort;
    let cancellation;
    const cancelReader = () => (cancellation ??= reader
        .cancel()
        .catch(() => { })
        .finally(() => reader.releaseLock()));
    const finish = () => {
        if (!ended) {
            ended = true;
            signal.removeEventListener("abort", abort);
            done();
        }
    };
    return new ReadableStream({
        start(controller) {
            abort = () => {
                if (ended)
                    return;
                finish();
                controller.error(new ConversationUnavailable("observation-interrupted"));
                void cancelReader();
            };
            signal.addEventListener("abort", abort, { once: true });
            if (signal.aborted)
                abort();
        },
        async pull(controller) {
            if (ended)
                return;
            try {
                check();
                signal.throwIfAborted();
                const next = await reader.read();
                if (ended)
                    return;
                check();
                signal.throwIfAborted();
                if (next.done) {
                    decoder.decode();
                    finish();
                    reader.releaseLock();
                    controller.close();
                    return;
                }
                bytes += next.value.byteLength;
                if (bytes > maxBytes)
                    throw new ConversationUnavailable("observation-byte-limit");
                decoder.decode(next.value, { stream: true });
                controller.enqueue(next.value);
            }
            catch {
                if (ended)
                    return;
                finish();
                controller.error(new ConversationUnavailable("invalid-or-interrupted-body"));
                void cancelReader();
            }
        },
        cancel() {
            if (ended)
                return;
            finish();
            return cancelReader();
        },
    });
}
/** Owns only this connection's observation resources, never durable cancellation. */
export class ConversationNetwork {
    onDispose;
    owner = new AbortController();
    now;
    credential;
    expiration;
    stream;
    revoked = false;
    options;
    renewLeadMs;
    origin;
    credentialHeader;
    constructor(options, onDispose) {
        this.onDispose = onDispose;
        this.options = {
            expiresAtMs: options.expiresAtMs,
            signal: options.signal,
            isCurrent: options.isCurrent,
            onAccessLost: options.onAccessLost,
            ...(options.requestRenewal
                ? { requestRenewal: options.requestRenewal }
                : {}),
            ...(options.fetchImpl ? { fetchImpl: options.fetchImpl } : {}),
        };
        this.now = options.now ?? Date.now;
        this.credential = options.credential;
        this.origin = options.origin ?? "";
        this.credentialHeader =
            options.credentialHeader ??
                (this.origin ? "authorization" : "x-meri-action-session");
        if (this.origin) {
            const url = new URL(this.origin);
            if (url.protocol !== "https:" || url.origin !== this.origin)
                throw new ConversationUnavailable("invalid-origin");
        }
        if (!Number.isSafeInteger(options.expiresAtMs) ||
            options.expiresAtMs <= this.now()) {
            this.credential = "";
            throw new ConversationUnavailable("expired-session");
        }
        this.renewLeadMs = Math.min(RECONNECT_RENEW_LEAD_MS, Math.floor((options.expiresAtMs - this.now()) / 4));
        this.expiration = setTimeout(() => this.revoke(), Math.min(options.expiresAtMs - this.now(), 2_147_483_647));
        options.signal.addEventListener("abort", this.dispose, { once: true });
        if (options.signal.aborted)
            this.dispose();
    }
    check = () => {
        if (this.owner.signal.aborted ||
            this.options.signal.aborted ||
            !this.options.isCurrent()) {
            throw new ConversationUnavailable("current-context-unavailable");
        }
        if (this.now() >= this.options.expiresAtMs) {
            this.revoke();
            throw new ConversationUnavailable("expired-session");
        }
    };
    revoke() {
        if (this.revoked || this.owner.signal.aborted)
            return;
        const current = !this.options.signal.aborted && this.options.isCurrent();
        this.revoked = true;
        this.dispose();
        if (current && !this.options.signal.aborted && this.options.isCurrent())
            this.options.onAccessLost();
    }
    /**
     * Asks the session owner for its early renewal (see `ConversationLifetime.requestRenewal`). True when it ended this
     * session for a fresh one; this connection is then disposed and must not dispatch.
     */
    renew(reason) {
        if (this.revoked ||
            this.owner.signal.aborted ||
            this.options.signal.aborted ||
            !this.options.isCurrent() ||
            !this.options.requestRenewal)
            return false;
        if (!this.options.requestRenewal(reason))
            return false;
        this.dispose();
        return true;
    }
    dispose = () => {
        if (this.owner.signal.aborted)
            return;
        this.credential = "";
        clearTimeout(this.expiration);
        this.options.signal.removeEventListener("abort", this.dispose);
        this.owner.abort();
        this.stopObservation();
        this.onDispose();
    };
    stopObservation() {
        this.stream?.abort();
        this.stream = undefined;
    }
    lease(observation, caller, milliseconds) {
        this.check();
        const local = new AbortController();
        if (observation) {
            this.stopObservation();
            this.stream = local;
        }
        const signal = AbortSignal.any([
            local.signal,
            this.owner.signal,
            this.options.signal,
            ...(caller ? [caller] : []),
        ]);
        const limit = observation ? OBSERVATION_MS : REQUEST_MS;
        const timer = setTimeout(() => local.abort(), Math.min(limit, milliseconds ?? limit));
        const done = () => {
            clearTimeout(timer);
            if (this.stream === local)
                this.stream = undefined;
        };
        return { signal, done };
    }
    async dispatch(path, init, signal, onDispatch, 
    /** "refuse": an edge-filtered input route; "renew": an event stream (both decide a 403 by its body). */
    forbidden = "revoke") {
        this.check();
        signal.throwIfAborted();
        const headers = new Headers(init.headers);
        headers.delete("authorization");
        headers.set(this.credentialHeader, this.credentialHeader === "authorization"
            ? `Bearer ${this.credential}`
            : this.credential);
        onDispatch?.();
        const response = await (this.options.fetchImpl ?? fetch)(this.origin + path, {
            ...init,
            headers,
            signal,
            credentials: "same-origin",
            redirect: "error",
            cache: "no-store",
        });
        try {
            this.check();
            signal.throwIfAborted();
            // A 403 on an edge-filtered input route is decided by its body in `json`.
            if (response.status === 401 ||
                (response.status === 403 && forbidden === "revoke"))
                this.revoke();
            this.check();
            signal.throwIfAborted();
            if (response.redirected)
                throw new ConversationUnavailable("redirected-response");
            return response;
        }
        catch (error) {
            discard(response);
            throw error;
        }
    }
    async json(path, body, onDispatch, budget, 
    /** Request routes the edge may refuse outright; a 403 there is not a membership change. */
    forbidden = "revoke") {
        if (body.byteLength >
            Math.min(protocol.limits.requestBytes, budget?.requestBytes ?? protocol.limits.requestBytes)) {
            throw new ConversationUnavailable("request-byte-limit");
        }
        const lease = this.lease(false, undefined, budget?.maxRequestMs);
        try {
            const response = await this.dispatch(path, {
                method: "POST",
                body: new TextDecoder("utf-8", { fatal: true }).decode(body),
                headers: { "content-type": "application/json" },
            }, lease.signal, onDispatch, forbidden);
            const limit = Math.min(protocol.limits.responseBytes, budget?.responseBytes ?? protocol.limits.responseBytes);
            const jsonMedia = JSON_MEDIA.test(response.headers.get("content-type") ?? "");
            if (response.status === 403 && forbidden === "refuse") {
                // Control's refusal is a JSON error envelope and revokes as always; the edge's block
                // (an HTML page, an empty body, anything else) refused this request, not the session.
                const envelope = jsonMedia &&
                    errorEnvelope(new Uint8Array(await new Response(boundedBody(response, lease.signal, this.check, limit, () => { })).arrayBuffer()));
                if (!jsonMedia)
                    discard(response);
                if (envelope) {
                    this.revoke();
                    this.check();
                    throw new ConversationUnavailable("current-context-unavailable", 403);
                }
                throw new ConversationUnavailable(EDGE_REFUSED, 403);
            }
            if (!jsonMedia) {
                discard(response);
                throw new ConversationUnavailable("invalid-json-media", response.status);
            }
            const bounded = boundedBody(response, lease.signal, this.check, limit, () => { });
            const bytes = new Uint8Array(await new Response(bounded).arrayBuffer());
            this.check();
            lease.signal.throwIfAborted();
            return { status: response.status, bytes };
        }
        finally {
            lease.done();
        }
    }
    async observe(path, init) {
        this.check();
        if (this.options.expiresAtMs - this.now() <= this.renewLeadMs &&
            this.renew("near-expiry"))
            throw new ConversationUnavailable("session-renewing");
        const lease = this.lease(true, init.signal);
        try {
            // A stream 403 is decided below by its code: only SESSION_REFUSED may renew instead of revoking.
            const response = await this.dispatch(path, init, lease.signal, undefined, "renew");
            if (response.status === 403) {
                let refused = false;
                try {
                    refused =
                        JSON_MEDIA.test(response.headers.get("content-type") ?? "") &&
                            envelopeCode(new Uint8Array(await new Response(boundedBody(response, lease.signal, this.check, protocol.limits.responseBytes, () => { })).arrayBuffer())) === "SESSION_REFUSED";
                }
                catch {
                    // An unreadable refusal is still a refusal of this session.
                }
                if (!refused)
                    discard(response);
                // Control no longer holds this credential (expired early, or issued by a control that has since restarted):
                // the owner renews it for the same exact binding, and the issuance rechecks identity and membership. Every
                // other 403, and a refusal with no owner renewal, still revokes.
                if (refused && this.renew("refused"))
                    throw new ConversationUnavailable("SESSION_REFUSED", 403);
                this.revoke();
                this.check();
                throw new ConversationUnavailable("current-context-unavailable", 403);
            }
            if (response.status === 204 && init.method === "GET") {
                lease.done();
                return response;
            }
            const media = response.status === 200
                ? /^text\/event-stream(?:;\s*charset=utf-8)?$/i
                : /^application\/json(?:;\s*charset=utf-8)?$/i;
            if (!media.test(response.headers.get("content-type") ?? "")) {
                discard(response);
                throw new ConversationUnavailable("subscription-unavailable");
            }
            const body = boundedBody(response, lease.signal, this.check, response.status === 200 ? STREAM_BYTES : protocol.limits.responseBytes, lease.done);
            return new Response(body, {
                status: response.status,
                headers: response.headers,
            });
        }
        catch (error) {
            lease.done();
            throw error;
        }
    }
}

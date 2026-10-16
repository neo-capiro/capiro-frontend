import { conversationApplicationMetadata as protocol } from '@capiro/meri-contracts/conversation-application';
export class ConversationUnavailable extends Error {
    code;
    constructor(code) {
        super(code);
        this.code = code;
        this.name = 'ConversationUnavailable';
    }
}
const STREAM_BYTES = 8 * 1024 * 1024;
const REQUEST_MS = 30_000;
const discard = (response) => { void response.body?.cancel().catch(() => { }); };
/** Strict UTF-8 and finite allocation before the SDK's own SSE parser. No SSE parsing here. */
function boundedBody(response, signal, check, maxBytes, done) {
    const reader = response.body?.getReader();
    if (!reader) {
        done();
        throw new ConversationUnavailable('missing-body');
    }
    const decoder = new TextDecoder('utf-8', { fatal: true });
    let bytes = 0, ended = false;
    let abort;
    let cancellation;
    const cancelReader = () => cancellation ??= reader.cancel().catch(() => { }).finally(() => reader.releaseLock());
    const finish = () => { if (!ended) {
        ended = true;
        signal.removeEventListener('abort', abort);
        done();
    } };
    return new ReadableStream({
        start(controller) {
            abort = () => {
                if (ended)
                    return;
                finish();
                controller.error(new ConversationUnavailable('observation-interrupted'));
                void cancelReader();
            };
            signal.addEventListener('abort', abort, { once: true });
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
                    throw new ConversationUnavailable('observation-byte-limit');
                decoder.decode(next.value, { stream: true });
                controller.enqueue(next.value);
            }
            catch {
                if (ended)
                    return;
                finish();
                controller.error(new ConversationUnavailable('invalid-or-interrupted-body'));
                void cancelReader();
            }
        },
        cancel() { if (ended)
            return; finish(); return cancelReader(); },
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
    origin;
    constructor(options, onDispose) {
        this.onDispose = onDispose;
        this.options = {
            expiresAtMs: options.expiresAtMs, signal: options.signal,
            isCurrent: options.isCurrent, onAccessLost: options.onAccessLost,
            ...(options.fetchImpl ? { fetchImpl: options.fetchImpl } : {}),
        };
        this.now = options.now ?? Date.now;
        this.credential = options.credential;
        this.origin = options.origin ?? '';
        if (this.origin) {
            const url = new URL(this.origin);
            if (url.protocol !== 'https:' || url.origin !== this.origin)
                throw new ConversationUnavailable('invalid-origin');
        }
        if (!Number.isSafeInteger(options.expiresAtMs) || options.expiresAtMs <= this.now()) {
            this.credential = '';
            throw new ConversationUnavailable('expired-session');
        }
        this.expiration = setTimeout(() => this.revoke(), Math.min(options.expiresAtMs - this.now(), 2_147_483_647));
        options.signal.addEventListener('abort', this.dispose, { once: true });
        if (options.signal.aborted)
            this.dispose();
    }
    check = () => {
        if (this.owner.signal.aborted || this.options.signal.aborted || !this.options.isCurrent()) {
            throw new ConversationUnavailable('current-context-unavailable');
        }
        if (this.now() >= this.options.expiresAtMs) {
            this.revoke();
            throw new ConversationUnavailable('expired-session');
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
    dispose = () => {
        if (this.owner.signal.aborted)
            return;
        this.credential = '';
        clearTimeout(this.expiration);
        this.options.signal.removeEventListener('abort', this.dispose);
        this.owner.abort();
        this.stopObservation();
        this.onDispose();
    };
    stopObservation() { this.stream?.abort(); this.stream = undefined; }
    lease(observation, caller, milliseconds = REQUEST_MS) {
        this.check();
        const local = new AbortController();
        if (observation) {
            this.stopObservation();
            this.stream = local;
        }
        const signal = AbortSignal.any([local.signal, this.owner.signal, this.options.signal, ...(caller ? [caller] : [])]);
        const timer = setTimeout(() => local.abort(), Math.min(REQUEST_MS, milliseconds));
        const done = () => { clearTimeout(timer); if (this.stream === local)
            this.stream = undefined; };
        return { signal, done };
    }
    async dispatch(path, init, signal, onDispatch) {
        this.check();
        signal.throwIfAborted();
        const headers = new Headers(init.headers);
        headers.set('authorization', `Bearer ${this.credential}`);
        onDispatch?.();
        const response = await (this.options.fetchImpl ?? fetch)(this.origin + path, {
            ...init, headers, signal, credentials: 'same-origin', redirect: 'error', cache: 'no-store',
        });
        try {
            this.check();
            signal.throwIfAborted();
            if (response.status === 401 || response.status === 403)
                this.revoke();
            this.check();
            signal.throwIfAborted();
            if (response.redirected)
                throw new ConversationUnavailable('redirected-response');
            return response;
        }
        catch (error) {
            discard(response);
            throw error;
        }
    }
    async json(path, body, onDispatch, budget) {
        if (body.byteLength > Math.min(protocol.limits.requestBytes, budget?.requestBytes ?? protocol.limits.requestBytes)) {
            throw new ConversationUnavailable('request-byte-limit');
        }
        const lease = this.lease(false, undefined, budget?.maxRequestMs);
        try {
            const response = await this.dispatch(path, {
                method: 'POST', body: new TextDecoder('utf-8', { fatal: true }).decode(body),
                headers: { 'content-type': 'application/json' },
            }, lease.signal, onDispatch);
            if (!/^application\/json(?:;\s*charset=utf-8)?$/i.test(response.headers.get('content-type') ?? '')) {
                discard(response);
                throw new ConversationUnavailable('invalid-json-media');
            }
            const limit = Math.min(protocol.limits.responseBytes, budget?.responseBytes ?? protocol.limits.responseBytes);
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
        const lease = this.lease(true, init.signal);
        try {
            const response = await this.dispatch(path, init, lease.signal);
            if (response.status === 204 && init.method === 'GET') {
                lease.done();
                return response;
            }
            const media = response.status === 200 ? /^text\/event-stream(?:;\s*charset=utf-8)?$/i : /^application\/json(?:;\s*charset=utf-8)?$/i;
            if (!media.test(response.headers.get('content-type') ?? '')) {
                discard(response);
                throw new ConversationUnavailable('subscription-unavailable');
            }
            const body = boundedBody(response, lease.signal, this.check, response.status === 200 ? STREAM_BYTES : protocol.limits.responseBytes, lease.done);
            return new Response(body, { status: response.status, headers: response.headers });
        }
        catch (error) {
            lease.done();
            throw error;
        }
    }
}

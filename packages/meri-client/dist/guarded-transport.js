// Guarded chat transport: an upstream `ChatTransport` implementation that decodes and
// validates every UI chunk before it reaches projection. It wraps (does not replace)
// the upstream public `DefaultChatTransport`/`ChatTransport`.
//
// Why an explicit guard boundary is required: at this exact pin the AI SDK validates
// `dataPartSchemas[chunk.type]`, i.e. the runtime key is `data-meri-event`, while the
// `dataPartSchemas` TYPE is keyed by the unprefixed data-type name `meri-event`. A
// type-correct registration therefore never runs at runtime. The guard below enforces
// the frozen UIEvent contract explicitly and requires chunk.id equality.
import { Chat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { MERI_EVENT_DATA_PART } from '@capiro/meri-ui-stream/protocol';
import { ConversationProjection, acceptOrReject } from './projection.js';
/** Frames that are part of the frozen custom-event path or the stream lifecycle. */
const ALLOWED_FRAME_TYPES = new Set([
    'start',
    'finish',
    'abort',
    'message-metadata',
    'start-step',
    'finish-step',
    'reset-step',
    'error',
    MERI_EVENT_DATA_PART,
]);
export class UiTransportGuardError extends Error {
    code;
    chunkType;
    constructor(code, message, chunkType) {
        super(message);
        this.name = 'UiTransportGuardError';
        this.code = code;
        this.chunkType = chunkType;
    }
}
/**
 * Validates a single decoded UI chunk. Returns the validated event for a custom
 * Meri frame, or `null` for an allowed lifecycle frame. Throws a
 * `UiTransportGuardError` for any malformed, mismatched or unexpected frame.
 */
export function guardUiChunk(chunk, validateEvent) {
    if (chunk.type === MERI_EVENT_DATA_PART) {
        if (typeof chunk.id !== 'string' || chunk.id.length === 0) {
            throw new UiTransportGuardError('meri-event-missing-id', 'Meri event frame is missing a string id', chunk.type);
        }
        let event;
        try {
            event = validateEvent(chunk.data);
        }
        catch (cause) {
            const detail = cause instanceof Error ? cause.message : 'validation failed';
            throw new UiTransportGuardError('meri-event-invalid', `Meri event failed frozen-contract validation: ${detail}`, chunk.type);
        }
        if (event.eventId !== chunk.id) {
            throw new UiTransportGuardError('meri-event-id-mismatch', `Meri event id ${event.eventId} does not match chunk id ${chunk.id}`, chunk.type);
        }
        return event;
    }
    if (!ALLOWED_FRAME_TYPES.has(chunk.type)) {
        throw new UiTransportGuardError('unexpected-frame', `Unexpected UI frame type "${chunk.type}"`, chunk.type);
    }
    return null;
}
/** Preserve backpressure/cancellation while keeping unadmitted parser details private. */
function boundedDiagnostics(source, translate) {
    const reader = source.getReader();
    let ended = false;
    return new ReadableStream({
        async pull(controller) {
            if (ended)
                return;
            try {
                const next = await reader.read();
                if (ended)
                    return;
                if (next.done) {
                    ended = true;
                    reader.releaseLock();
                    controller.close();
                }
                else
                    controller.enqueue(next.value);
            }
            catch (error) {
                if (ended)
                    return;
                ended = true;
                await reader.cancel().catch(() => { });
                reader.releaseLock();
                controller.error(translate(error));
            }
        },
        async cancel(reason) {
            if (ended)
                return;
            ended = true;
            try {
                await reader.cancel(reason);
            }
            finally {
                reader.releaseLock();
            }
        },
    });
}
function guardStream(source, context) {
    const guarded = source.pipeThrough(new TransformStream({
        transform(chunk, controller) {
            context.beforeChunk?.(chunk);
            let event;
            try {
                event = guardUiChunk(chunk, context.validateEvent);
            }
            catch (error) {
                if (error instanceof UiTransportGuardError)
                    context.onRejected?.(error, chunk);
                throw error;
            }
            if (event)
                context.onEvent?.(event);
            context.beforeChunk?.(chunk);
            controller.enqueue(chunk);
        },
    }));
    return context.errorBoundary ? boundedDiagnostics(guarded, context.errorBoundary) : guarded;
}
export class MeriGuardedTransport {
    /** Incremental replay: reconnect returns only new events after the accepted cursor. */
    resumeStreamIsReplay = false;
    inner;
    context;
    closed = false;
    beginGuard;
    constructor(options) {
        this.inner = options.inner;
        this.beginGuard = options.beginGuard;
        this.context = {
            validateEvent: options.validateEvent,
            onEvent: options.onEvent,
            onRejected: options.onRejected,
            errorBoundary: options.errorBoundary,
        };
    }
    async sendMessages(options) {
        try {
            const beforeChunk = this.beginGuard?.();
            const stream = await this.inner.sendMessages(options);
            return guardStream(stream, { ...this.context, beforeChunk });
        }
        catch (error) {
            throw this.context.errorBoundary?.(error) ?? error;
        }
    }
    async reconnectToStream(options) {
        try {
            const beforeChunk = this.beginGuard?.();
            const stream = await this.inner.reconnectToStream(options);
            return stream ? guardStream(stream, { ...this.context, beforeChunk }) : null;
        }
        catch (error) {
            throw this.context.errorBoundary?.(error) ?? error;
        }
    }
    /**
     * Releases resources owned by this transport only. It never issues a durable run
     * cancellation; only a separate authorized command may cancel a run.
     */
    close() {
        this.closed = true;
        this.inner.close?.();
    }
    get isClosed() {
        return this.closed;
    }
}
function toHeaderRecord(headers) {
    if (headers === undefined)
        return {};
    if (headers instanceof Headers) {
        const record = {};
        headers.forEach((value, key) => {
            record[key] = value;
        });
        return record;
    }
    if (Array.isArray(headers))
        return Object.fromEntries(headers);
    return { ...headers };
}
/**
 * Builds one externally managed `Chat` for a conversation/authorized view. The chat
 * id is bound to `view.conversationId` so producer, consumer and reconnect all use the
 * authorized conversation identity. The guarded transport validates every decoded
 * chunk and calls `acceptOrReject` synchronously on the data path: an immutable-event
 * or sequence conflict aborts the subscription before the offending chunk is forwarded
 * or reaches `onData`, while the last accepted contiguous cursor is preserved.
 *
 * Reconnect sends the last accepted contiguous sequence in an authenticated header
 * (`prepareReconnectToStreamRequest`), not the SSE `Last-Event-ID`; the cursor is server
 * state, never a caller argument. No `dataPartSchemas` is registered: at this pin the
 * runtime key (`data-meri-event`) differs from the typed key (`meri-event`), so schema
 * registration does not validate frozen events â€” the guard is the enforcement boundary.
 */
export function createMeriChat(options) {
    if (typeof options.api !== 'string' || options.api.trim().length === 0) {
        throw new TypeError('Meri subscription endpoint is required');
    }
    const projection = new ConversationProjection(options.view);
    const api = options.api;
    const inner = new DefaultChatTransport({
        api,
        ...(options.fetchImpl ? { fetch: options.fetchImpl } : {}),
        prepareSendMessagesRequest: ({ body, headers }) => ({
            // The client-sent conversation id/messages are untrusted; send an intended command only.
            body: { ...body, command: { conversationId: projection.view.conversationId, intent: 'view.subscribe' } },
            headers: toHeaderRecord(headers),
        }),
        prepareReconnectToStreamRequest: ({ headers }) => ({
            headers: {
                ...toHeaderRecord(headers),
                'x-meri-resume-sequence': String(projection.currentCursor),
            },
        }),
    });
    const transport = new MeriGuardedTransport({
        inner,
        validateEvent: options.validateEvent,
        // Synchronous admission boundary: throws before the chunk is forwarded/observed.
        onEvent: (event) => {
            acceptOrReject(projection, event);
        },
    });
    const chat = new Chat({
        id: projection.view.conversationId,
        transport,
        sendAutomaticallyWhen: () => false,
        onError: () => {
            // Transport/admission error surfaces through chat state, never as a run result.
        },
        onData: () => {
            // Unawaited, non-persisting observer only; never the admission authority.
        },
    });
    return { chat, transport, projection };
}

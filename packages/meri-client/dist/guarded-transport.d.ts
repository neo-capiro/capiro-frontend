import { Chat } from '@ai-sdk/react';
import type { ChatTransport, UIMessageChunk } from 'ai';
import type { UIEvent, UIEventValidator } from './types.js';
import type { MeriUIMessage } from '@capiro/meri-ui-stream/protocol';
import { ConversationProjection } from './projection.js';
import type { AuthorizedView } from './projection.js';
export type UiTransportGuardErrorCode = 'meri-event-missing-id' | 'meri-event-invalid' | 'meri-event-id-mismatch' | 'unexpected-frame';
export declare class UiTransportGuardError extends Error {
    readonly code: UiTransportGuardErrorCode;
    readonly chunkType: string;
    constructor(code: UiTransportGuardErrorCode, message: string, chunkType: string);
}
export interface MeriGuardedTransportOptions {
    inner: ChatTransport<MeriUIMessage>;
    /** Injected boundary validator (offline tests may inject the unchanged root validator). */
    validateEvent: UIEventValidator;
    /** Synchronous sink for each validated event, in stream order. */
    onEvent?: (event: UIEvent) => void;
    /** Observability hook for rejected chunks (does not swallow the rejection). */
    onRejected?: (error: UiTransportGuardError, chunk: UIMessageChunk) => void;
    /** Optional current-lifetime guard, captured separately for each subscription. */
    beginGuard?: () => (chunk: UIMessageChunk) => void;
    /** Optional public-mode diagnostic boundary; legacy errors remain unchanged. */
    errorBoundary?: (error: unknown) => Error;
}
/**
 * Validates a single decoded UI chunk. Returns the validated event for a custom
 * Meri frame, or `null` for an allowed lifecycle frame. Throws a
 * `UiTransportGuardError` for any malformed, mismatched or unexpected frame.
 */
export declare function guardUiChunk(chunk: UIMessageChunk, validateEvent: UIEventValidator): UIEvent | null;
export declare class MeriGuardedTransport implements ChatTransport<MeriUIMessage> {
    /** Incremental replay: reconnect returns only new events after the accepted cursor. */
    readonly resumeStreamIsReplay = false;
    private readonly inner;
    private readonly context;
    private closed;
    private readonly beginGuard;
    constructor(options: MeriGuardedTransportOptions);
    sendMessages(options: Parameters<ChatTransport<MeriUIMessage>['sendMessages']>[0]): Promise<ReadableStream<UIMessageChunk>>;
    reconnectToStream(options: Parameters<ChatTransport<MeriUIMessage>['reconnectToStream']>[0]): Promise<ReadableStream<UIMessageChunk> | null>;
    /**
     * Releases resources owned by this transport only. It never issues a durable run
     * cancellation; only a separate authorized command may cancel a run.
     */
    close(): void;
    get isClosed(): boolean;
}
export interface CreateMeriChatOptions {
    /** Authorized conversation/view; also binds the external Chat id (reconnect identity). */
    view: AuthorizedView;
    /** Injected frozen-contract validator (the unchanged root validator in Node tests). */
    validateEvent: UIEventValidator;
    /** Required approved subscription endpoint; no guessed product route. */
    api: string;
    /** Test/mocked fetch. A production deployment injects its authenticated fetch here. */
    fetchImpl?: typeof fetch;
}
export interface MeriChatHandle {
    chat: Chat<MeriUIMessage>;
    transport: MeriGuardedTransport;
    projection: ConversationProjection;
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
export declare function createMeriChat(options: CreateMeriChatOptions): MeriChatHandle;

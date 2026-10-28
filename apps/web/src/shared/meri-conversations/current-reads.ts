import {
  billTextSourceMetadata,
  BILL_TEXT_SOURCE_READ_SCHEMA,
  receiveBillTextSourceRequest,
  receiveBillTextSourceResponse,
  hearingSourceMetadata,
  HEARING_SOURCE_READ_SCHEMA,
  receiveHearingSourceRequest,
  receiveHearingSourceResponse,
  HEARING_MEDIA_READ_SCHEMA,
  receiveHearingMediaRequest,
  receiveHearingMediaResponse,
  type HearingMediaReadRequest,
} from "@capiro/meri-contracts/conversation-sources";
import {
  conversationUsageMetadata,
  CONVERSATION_USAGE_SCHEMA,
  receiveConversationUsageRequest,
  receiveConversationUsageResponse,
} from "@capiro/meri-contracts/conversation-usage";
import {
  boundedJsonBytes,
  withActionDeadline,
} from "../meri-actions/bounded-json";
import type { ConversationContext } from "./session";

/** The public receiver retains its original admitted request inside this exchange. */
export type CurrentReadOperation<T> = {
  path: string;
  requestBytes: number;
  responseBytes: number;
  admit(
    bytes: Uint8Array,
  ):
    | ((status: number, body: Uint8Array) => T | Promise<T>)
    | Promise<(status: number, body: Uint8Array) => T | Promise<T>>;
};
export const sourceReadOperation = {
  ...billTextSourceMetadata,
  admit(bytes: Uint8Array) {
    const request = receiveBillTextSourceRequest(bytes);
    return (status: number, body: Uint8Array) =>
      receiveBillTextSourceResponse(status, body, request);
  },
};
export const usageReadOperation = {
  ...conversationUsageMetadata,
  admit(bytes: Uint8Array) {
    const request = receiveConversationUsageRequest(bytes);
    return (status: number, body: Uint8Array) =>
      receiveConversationUsageResponse(status, body, request);
  },
};

export const hearingReadOperation = {
  ...hearingSourceMetadata,
  admit(bytes: Uint8Array) {
    const request = receiveHearingSourceRequest(bytes);
    return (status: number, body: Uint8Array) =>
      receiveHearingSourceResponse(status, body, request);
  },
};

export const hearingMediaReadOperation = {
  ...hearingSourceMetadata,
  admit(bytes: Uint8Array) {
    const request = receiveHearingMediaRequest(bytes);
    return (status: number, body: Uint8Array) =>
      receiveHearingMediaResponse(status, body, request);
  },
};

/** Saved source and media reads share one endpoint and their public admission. */
const conversationSourceReadOperation = {
  ...sourceReadOperation,
  admit(bytes: Uint8Array) {
    try {
      return sourceReadOperation.admit(bytes);
    } catch {
      try {
        return hearingReadOperation.admit(bytes);
      } catch {
        return hearingMediaReadOperation.admit(bytes);
      }
    }
  },
};

/** Two exact paths from the public protocols; no caller-selected upstream endpoint. */
export function conversationCurrentReadOperation(path: string) {
  if (`/api/conversations/${path}` === sourceReadOperation.path)
    return conversationSourceReadOperation;
  if (`/api/conversations/${path}` === usageReadOperation.path)
    return usageReadOperation;
  return undefined;
}

export class ConversationReadUnavailable extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super("Conversation read unavailable");
  }
}

export async function readCurrentNative<T extends { schemaVersion: string }>(
  operation: CurrentReadOperation<T | { error: { code: string } }>,
  input: unknown,
  signal: AbortSignal,
  fetcher: typeof fetch,
  isCurrent: () => boolean,
  onAccessLost: () => void,
) {
  return withActionDeadline([signal], async (current) => {
    current.throwIfAborted();
    if (!isCurrent()) throw new Error("Conversation lifetime ended");
    const body = new TextEncoder().encode(JSON.stringify(input));
    const receive = await operation.admit(body);
    current.throwIfAborted();
    if (!isCurrent()) throw new Error("Conversation lifetime ended");
    const response = await fetcher(operation.path, {
      method: "POST",
      body,
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      redirect: "error",
      cache: "no-store",
      signal: current,
    });
    try {
      current.throwIfAborted();
      if (!isCurrent()) throw new Error("Conversation lifetime ended");
      if (response.status === 401 || response.status === 403) {
        onAccessLost();
        throw new ConversationReadUnavailable(response.status, "ACCESS_DENIED");
      }
      if (response.redirected || response.headers.has("content-encoding"))
        throw new Error("Unexpected conversation response");
      const bytes = await boundedJsonBytes(
        response,
        current,
        operation.responseBytes,
      );
      const value = await receive(response.status, bytes);
      current.throwIfAborted();
      if (!isCurrent()) throw new Error("Conversation lifetime ended");
      if ("error" in value) {
        const code = value.error.code;
        if (code === "MEMBERSHIP_CHANGED") onAccessLost();
        throw new ConversationReadUnavailable(response.status, code);
      }
      return value;
    } finally {
      if (!response.bodyUsed)
        void response.body?.cancel().catch(() => undefined);
    }
  });
}

/** Read-only native-auth requests share the existing conversation's abort/access lifetime. */
export function createConversationReads(
  context: ConversationContext,
  lifetime: AbortSignal,
  isCurrent: () => boolean,
  onAccessLost: () => void,
  fetcher: typeof fetch = fetch,
) {
  return Object.freeze({
    source(runId: string, referenceId: string, signal: AbortSignal) {
      return readCurrentNative(
        sourceReadOperation,
        {
          schemaVersion: BILL_TEXT_SOURCE_READ_SCHEMA,
          conversationId: context.conversationId,
          runId,
          referenceId,
        },
        AbortSignal.any([lifetime, signal]),
        fetcher,
        isCurrent,
        onAccessLost,
      );
    },
    hearing(runId: string, referenceId: string, signal: AbortSignal) {
      return readCurrentNative(
        hearingReadOperation,
        {
          schemaVersion: HEARING_SOURCE_READ_SCHEMA,
          conversationId: context.conversationId,
          runId,
          referenceId,
        },
        AbortSignal.any([lifetime, signal]),
        fetcher,
        isCurrent,
        onAccessLost,
      );
    },
    hearingMedia(
      runId: string,
      referenceId: string,
      playback: HearingMediaReadRequest["playback"],
      signal: AbortSignal,
    ) {
      return readCurrentNative(
        hearingMediaReadOperation,
        {
          schemaVersion: HEARING_MEDIA_READ_SCHEMA,
          conversationId: context.conversationId,
          runId,
          referenceId,
          playback,
        },
        AbortSignal.any([lifetime, signal]),
        fetcher,
        isCurrent,
        onAccessLost,
      );
    },
    usage(runId: string, signal: AbortSignal) {
      return readCurrentNative(
        usageReadOperation,
        {
          schemaVersion: CONVERSATION_USAGE_SCHEMA,
          conversationId: context.conversationId,
          runId,
        },
        AbortSignal.any([lifetime, signal]),
        fetcher,
        isCurrent,
        onAccessLost,
      );
    },
  });
}
export type ConversationReads = ReturnType<typeof createConversationReads>;

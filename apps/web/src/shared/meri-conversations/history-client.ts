import {
  conversationHistoryMetadata as protocol,
  receiveConversationHistoryRequest,
  receiveConversationHistoryResponse,
  DISCOVERY_SCHEMA,
  HISTORY_SCHEMA,
  TURN_SCHEMA,
} from "@capiro/meri-contracts/conversation-history";
import {
  boundedJsonBytes,
  withActionDeadline,
} from "../meri-actions/bounded-json";

export type HistoryRoute = Parameters<
  typeof receiveConversationHistoryRequest
>[0];
type Received = Awaited<ReturnType<typeof receiveConversationHistoryResponse>>;
export type ConversationListPage = Extract<
  Received,
  { schema: typeof DISCOVERY_SCHEMA }
>;
export type ConversationTranscriptPage = Extract<
  Received,
  { schema: typeof HISTORY_SCHEMA }
>;
export type ConversationTurnReceipt = Extract<
  Received,
  { schema: typeof TURN_SCHEMA }
>;

/** Only closed service codes/outcomes are retained, never private upstream error text. */
export class ConversationHistoryUnavailable extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly outcome?: string,
  ) {
    super("Conversation history unavailable");
  }
}

/** Native membership credentials remain in the server proxy; browser selectors grant no authority. */
async function request(
  route: HistoryRoute,
  input: unknown,
  signal: AbortSignal,
  fetcher: typeof fetch,
) {
  return withActionDeadline([signal], async (current) => {
    const bytes = new TextEncoder().encode(JSON.stringify(input));
    const admitted = await receiveConversationHistoryRequest(route, bytes);
    const response = await fetcher(protocol.routes[route].path, {
      method: "POST",
      body: bytes,
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      redirect: "error",
      cache: "no-store",
      signal: current,
    });
    if (response.redirected || response.headers.has("content-encoding")) {
      void response.body?.cancel().catch(() => undefined);
      throw new ConversationHistoryUnavailable(
        502,
        "CONVERSATION_RESPONSE_INVALID",
      );
    }
    const body = await boundedJsonBytes(
      response,
      current,
      protocol.limits.responseBytes,
    );
    const value = await receiveConversationHistoryResponse(
      route,
      response.status,
      body,
      admitted,
    );
    current.throwIfAborted();
    if ("error" in value)
      throw new ConversationHistoryUnavailable(
        response.status,
        value.error.code,
        value.error.outcome,
      );
    return value;
  });
}

export async function listConversations(
  input: unknown,
  signal: AbortSignal,
  fetcher: typeof fetch = fetch,
) {
  const value = await request("list", input, signal, fetcher);
  if (value.schema !== DISCOVERY_SCHEMA)
    throw new ConversationHistoryUnavailable(
      502,
      "CONVERSATION_RESPONSE_INVALID",
    );
  return value;
}

export async function readConversationTranscript(
  input: unknown,
  signal: AbortSignal,
  fetcher: typeof fetch = fetch,
) {
  const value = await request("transcript", input, signal, fetcher);
  if (value.schema !== HISTORY_SCHEMA)
    throw new ConversationHistoryUnavailable(
      502,
      "CONVERSATION_RESPONSE_INVALID",
    );
  return value;
}

export async function reserveConversationTurn(
  input: unknown,
  signal: AbortSignal,
  fetcher: typeof fetch = fetch,
) {
  const value = await request("nextTurn", input, signal, fetcher);
  if (value.schema !== TURN_SCHEMA)
    throw new ConversationHistoryUnavailable(
      502,
      "CONVERSATION_RESPONSE_INVALID",
    );
  return value;
}

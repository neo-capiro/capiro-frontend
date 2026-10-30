import {
  BROWSER_VIEWER_SCHEMA,
  BROWSER_VIEWER_LIMITS,
  receiveBrowserViewerRequest,
  receiveBrowserViewerResponse,
  type BrowserViewerContext,
  type BrowserViewerRoute,
  type BrowserViewerRequestMap,
  type BrowserViewerResponseMap,
  type BrowserViewerFailure,
} from "@capiro/meri-contracts/browser-viewer";
import {
  boundedJsonBytes,
  withActionDeadline,
} from "../meri-actions/bounded-json";
import { actionSessionHeader } from "../meri-actions/session-header";
import {
  conversationLifecycleMetadata,
  receiveConversationLifecycleRequest,
  receiveBrowserTakeoverControlResponse,
  type ConversationLifecycleControlRequest,
  type ConversationLifecycleResponse,
} from "@capiro/meri-contracts/conversation-lifecycle";

export interface BrowserViewerTransport {
  pending(): boolean;
  dispose(): void;
  resume(
    command: ConversationLifecycleControlRequest,
    current: BrowserViewerResponseMap["read"],
    signal: AbortSignal,
  ): Promise<ConversationLifecycleResponse<"control">>;
  request<R extends BrowserViewerRoute>(
    route: R,
    input: Omit<BrowserViewerRequestMap[R], "schema">,
    signal: AbortSignal,
  ): Promise<BrowserViewerResponseMap[R] | BrowserViewerFailure>;
}

/** Pixels and input use this private, session-bound channel, never chat messages. */
export function createBrowserViewerTransport(options: {
  credential: string;
  context: BrowserViewerContext;
  lifetime: AbortSignal;
  isCurrent: () => boolean;
  onAccessLost: () => void;
  fetcher?: typeof fetch;
  origin?: string;
}): BrowserViewerTransport {
  const local = new AbortController(),
    { tenantId, actorId, conversationId, runId, selectedClientId } =
      options.context;
  const context = Object.freeze({
    tenantId,
    actorId,
    conversationId,
    runId,
    selectedClientId,
  });
  let credential = options.credential,
    pending = 0;
  const dispose = () => {
    credential = "";
    local.abort();
    options.lifetime.removeEventListener("abort", dispose);
  };
  if (options.lifetime.aborted) dispose();
  else options.lifetime.addEventListener("abort", dispose, { once: true });
  const current = () => {
    local.signal.throwIfAborted();
    if (!options.isCurrent()) {
      dispose();
      throw new Error("Browser context changed");
    }
  };
  async function post<T>(
    path: string,
    request: unknown,
    caller: AbortSignal,
    limit: number,
    receive: (status: number, bytes: Uint8Array) => T | Promise<T>,
  ): Promise<T> {
    current();
    pending++;
    try {
      return await withActionDeadline(
        [caller, options.lifetime, local.signal],
        async (signal) => {
          current();
          const response = await (options.fetcher ?? fetch)(
            `${options.origin ?? ""}${path}`,
            {
              method: "POST",
              body: JSON.stringify(request),
              headers: {
                "Content-Type": "application/json",
                [options.origin ? "Authorization" : actionSessionHeader]:
                  options.origin ? `Bearer ${credential}` : credential,
              },
              credentials: options.origin ? "omit" : "same-origin",
              cache: "no-store",
              redirect: "error",
              signal,
            },
          );
          try {
            current();
            signal.throwIfAborted();
            if (response.status === 401 || response.status === 403)
              options.onAccessLost();
            if (response.redirected || response.headers.has("content-encoding"))
              throw new Error("Browser response refused");
            const bytes = await boundedJsonBytes(response, signal, limit);
            const value = await receive(response.status, bytes);
            current();
            signal.throwIfAborted();
            return value;
          } finally {
            void response.body?.cancel().catch(() => undefined);
          }
        },
      );
    } finally {
      pending--;
    }
  }
  return {
    pending: () => pending > 0,
    dispose,
    resume(command, browser, caller) {
      if (command.intent !== "takeover.end")
        throw new Error("Browser resume only");
      const request = receiveConversationLifecycleRequest(
        "control",
        new TextEncoder().encode(JSON.stringify(command)),
      );
      return post(
        conversationLifecycleMetadata.routes.control.path,
        request,
        caller,
        conversationLifecycleMetadata.limits.responseBytes,
        (status, bytes) =>
          receiveBrowserTakeoverControlResponse(
            status,
            bytes,
            request,
            browser,
          ),
      );
    },
    async request(route, input, caller) {
      current();
      const request = receiveBrowserViewerRequest(
        route,
        new TextEncoder().encode(
          JSON.stringify({ ...input, schema: BROWSER_VIEWER_SCHEMA }),
        ),
      );
      return post(
        `/api/meri/browser/${route}`,
        request,
        caller,
        BROWSER_VIEWER_LIMITS.responseBytes,
        (status, bytes) =>
          receiveBrowserViewerResponse(route, status, bytes, request, context),
      );
    },
  };
}

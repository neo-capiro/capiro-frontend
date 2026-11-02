import { conversationApplicationMetadata as protocol } from "@capiro/meri-contracts/conversation-application";
import type { ConversationSubmittedResponse } from "@capiro/meri-contracts/conversation-application";

type Binding = ConversationSubmittedResponse["run"]["binding"];
/** Supplied by the existing opaque-session owner. Browser selection grants no authority. */
export interface ConversationLifetime {
  context: Readonly<
    Pick<Binding, "tenantId" | "actorId" | "conversationId" | "runId"> & {
      selectedClientId: string | null;
    }
  >;
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

export class ConversationUnavailable extends Error {
  /** `status` is the HTTP answer that carried a closed error code, when one did. */
  constructor(
    readonly code: string,
    readonly status?: number,
  ) {
    super(code);
    this.name = "ConversationUnavailable";
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
/** True when the bytes are control's error envelope: `{ "error": { "code": "…" } }`. */
function errorEnvelope(bytes: Uint8Array) {
  try {
    const value: unknown = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(bytes),
    );
    const error =
      value !== null && typeof value === "object" && "error" in value
        ? (value as { error: unknown }).error
        : undefined;
    return (
      error !== null &&
      typeof error === "object" &&
      "code" in error &&
      typeof (error as { code: unknown }).code === "string" &&
      (error as { code: string }).code.length > 0
    );
  } catch {
    return false;
  }
}

const STREAM_BYTES = 8 * 1024 * 1024;
const REQUEST_MS = 30_000;
/**
 * One observation. Meri closes each window cleanly within 30 s of its own start; the same-origin proxy waits up to
 * REQUEST_MS for Meri's headers and bounds the stream 35 s past them. This lease sits past both, so Meri's clean end, not
 * this timer, ends a healthy window; it only catches a stream that neither server ended.
 */
const OBSERVATION_MS = 70_000;
const discard = (response: Response) => {
  void response.body?.cancel().catch(() => {});
};

/** Strict UTF-8 and finite allocation before the SDK's own SSE parser. No SSE parsing here. */
function boundedBody(
  response: Response,
  signal: AbortSignal,
  check: () => void,
  maxBytes: number,
  done: () => void,
): ReadableStream<Uint8Array> {
  const reader = response.body?.getReader();
  if (!reader) {
    done();
    throw new ConversationUnavailable("missing-body");
  }
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let bytes = 0,
    ended = false;
  let abort: () => void;
  let cancellation: Promise<void> | undefined;
  const cancelReader = () =>
    (cancellation ??= reader
      .cancel()
      .catch(() => {})
      .finally(() => reader.releaseLock()));
  const finish = () => {
    if (!ended) {
      ended = true;
      signal.removeEventListener("abort", abort);
      done();
    }
  };
  return new ReadableStream<Uint8Array>({
    start(controller) {
      abort = () => {
        if (ended) return;
        finish();
        controller.error(
          new ConversationUnavailable("observation-interrupted"),
        );
        void cancelReader();
      };
      signal.addEventListener("abort", abort, { once: true });
      if (signal.aborted) abort();
    },
    async pull(controller) {
      if (ended) return;
      try {
        check();
        signal.throwIfAborted();
        const next = await reader.read();
        if (ended) return;
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
      } catch {
        if (ended) return;
        finish();
        controller.error(
          new ConversationUnavailable("invalid-or-interrupted-body"),
        );
        void cancelReader();
      }
    },
    cancel() {
      if (ended) return;
      finish();
      return cancelReader();
    },
  });
}

/** Owns only this connection's observation resources, never durable cancellation. */
export class ConversationNetwork {
  private readonly owner = new AbortController();
  private readonly now: () => number;
  private credential: string;
  private readonly expiration: ReturnType<typeof setTimeout>;
  private stream: AbortController | undefined;
  private revoked = false;
  private readonly options: Pick<
    ConversationLifetime,
    "expiresAtMs" | "signal" | "isCurrent" | "onAccessLost" | "fetchImpl"
  >;
  readonly origin: string;
  private readonly credentialHeader: NonNullable<
    ConversationLifetime["credentialHeader"]
  >;
  constructor(
    options: ConversationLifetime,
    private readonly onDispose: () => void,
  ) {
    this.options = {
      expiresAtMs: options.expiresAtMs,
      signal: options.signal,
      isCurrent: options.isCurrent,
      onAccessLost: options.onAccessLost,
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
    if (
      !Number.isSafeInteger(options.expiresAtMs) ||
      options.expiresAtMs <= this.now()
    ) {
      this.credential = "";
      throw new ConversationUnavailable("expired-session");
    }
    this.expiration = setTimeout(
      () => this.revoke(),
      Math.min(options.expiresAtMs - this.now(), 2_147_483_647),
    );
    options.signal.addEventListener("abort", this.dispose, { once: true });
    if (options.signal.aborted) this.dispose();
  }
  check = () => {
    if (
      this.owner.signal.aborted ||
      this.options.signal.aborted ||
      !this.options.isCurrent()
    ) {
      throw new ConversationUnavailable("current-context-unavailable");
    }
    if (this.now() >= this.options.expiresAtMs) {
      this.revoke();
      throw new ConversationUnavailable("expired-session");
    }
  };
  revoke() {
    if (this.revoked || this.owner.signal.aborted) return;
    const current = !this.options.signal.aborted && this.options.isCurrent();
    this.revoked = true;
    this.dispose();
    if (current && !this.options.signal.aborted && this.options.isCurrent())
      this.options.onAccessLost();
  }
  dispose = () => {
    if (this.owner.signal.aborted) return;
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
  private lease(
    observation: boolean,
    caller?: AbortSignal | null,
    milliseconds?: number,
  ) {
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
    const timer = setTimeout(
      () => local.abort(),
      Math.min(limit, milliseconds ?? limit),
    );
    const done = () => {
      clearTimeout(timer);
      if (this.stream === local) this.stream = undefined;
    };
    return { signal, done };
  }
  private async dispatch(
    path: string,
    init: RequestInit,
    signal: AbortSignal,
    onDispatch?: () => void,
    forbidden: "revoke" | "refuse" = "revoke",
  ): Promise<Response> {
    this.check();
    signal.throwIfAborted();
    const headers = new Headers(init.headers);
    headers.delete("authorization");
    headers.set(
      this.credentialHeader,
      this.credentialHeader === "authorization"
        ? `Bearer ${this.credential}`
        : this.credential,
    );
    onDispatch?.();
    const response = await (this.options.fetchImpl ?? fetch)(
      this.origin + path,
      {
        ...init,
        headers,
        signal,
        credentials: "same-origin",
        redirect: "error",
        cache: "no-store",
      },
    );
    try {
      this.check();
      signal.throwIfAborted();
      // A 403 on an edge-filtered input route is decided by its body in `json`.
      if (
        response.status === 401 ||
        (response.status === 403 && forbidden !== "refuse")
      )
        this.revoke();
      this.check();
      signal.throwIfAborted();
      if (response.redirected)
        throw new ConversationUnavailable("redirected-response");
      return response;
    } catch (error) {
      discard(response);
      throw error;
    }
  }
  async json(
    path: string,
    body: Uint8Array,
    onDispatch?: () => void,
    budget?: Readonly<{
      requestBytes: number;
      responseBytes: number;
      maxRequestMs: number;
    }>,
    /** Request routes the edge may refuse outright; a 403 there is not a membership change. */
    forbidden: "revoke" | "refuse" = "revoke",
  ): Promise<{ status: number; bytes: Uint8Array }> {
    if (
      body.byteLength >
      Math.min(
        protocol.limits.requestBytes,
        budget?.requestBytes ?? protocol.limits.requestBytes,
      )
    ) {
      throw new ConversationUnavailable("request-byte-limit");
    }
    const lease = this.lease(false, undefined, budget?.maxRequestMs);
    try {
      const response = await this.dispatch(
        path,
        {
          method: "POST",
          body: new TextDecoder("utf-8", { fatal: true }).decode(body),
          headers: { "content-type": "application/json" },
        },
        lease.signal,
        onDispatch,
        forbidden,
      );
      const limit = Math.min(
        protocol.limits.responseBytes,
        budget?.responseBytes ?? protocol.limits.responseBytes,
      );
      const jsonMedia = JSON_MEDIA.test(
        response.headers.get("content-type") ?? "",
      );
      if (response.status === 403 && forbidden === "refuse") {
        // Control's refusal is a JSON error envelope and revokes as always; the edge's block
        // (an HTML page, an empty body, anything else) refused this request, not the session.
        const envelope =
          jsonMedia &&
          errorEnvelope(
            new Uint8Array(
              await new Response(
                boundedBody(
                  response,
                  lease.signal,
                  this.check,
                  limit,
                  () => {},
                ),
              ).arrayBuffer(),
            ),
          );
        if (!jsonMedia) discard(response);
        if (envelope) {
          this.revoke();
          this.check();
          throw new ConversationUnavailable("current-context-unavailable", 403);
        }
        throw new ConversationUnavailable(EDGE_REFUSED, 403);
      }
      if (!jsonMedia) {
        discard(response);
        throw new ConversationUnavailable(
          "invalid-json-media",
          response.status,
        );
      }
      const bounded = boundedBody(
        response,
        lease.signal,
        this.check,
        limit,
        () => {},
      );
      const bytes = new Uint8Array(await new Response(bounded).arrayBuffer());
      this.check();
      lease.signal.throwIfAborted();
      return { status: response.status, bytes };
    } finally {
      lease.done();
    }
  }
  async observe(path: string, init: RequestInit): Promise<Response> {
    const lease = this.lease(true, init.signal);
    try {
      const response = await this.dispatch(path, init, lease.signal);
      if (response.status === 204 && init.method === "GET") {
        lease.done();
        return response;
      }
      const media =
        response.status === 200
          ? /^text\/event-stream(?:;\s*charset=utf-8)?$/i
          : /^application\/json(?:;\s*charset=utf-8)?$/i;
      if (!media.test(response.headers.get("content-type") ?? "")) {
        discard(response);
        throw new ConversationUnavailable("subscription-unavailable");
      }
      const body = boundedBody(
        response,
        lease.signal,
        this.check,
        response.status === 200 ? STREAM_BYTES : protocol.limits.responseBytes,
        lease.done,
      );
      return new Response(body, {
        status: response.status,
        headers: response.headers,
      });
    } catch (error) {
      lease.done();
      throw error;
    }
  }
}

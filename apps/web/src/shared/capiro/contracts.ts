import { z } from "zod";

export const serviceNames = [
  "core",
  "strategy",
  "workspace",
  "intelligence",
  "onboard",
] as const;
export type CapiroService = (typeof serviceNames)[number];
export type CapiroMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
export type QueryScalar = string | number | boolean;
/**
 * A browser-supplied request identity, never authentication, scope or an
 * arbitrary header value. It is an opaque bounded token: no whitespace, comma,
 * colon-separated-header or header-folding characters, so it can only ever be
 * sent as the single header the operation declared.
 */
export const requestIdentity = z
  .string()
  .min(8)
  .max(128)
  .regex(/^[A-Za-z0-9._:-]+$/);
/** The only request header a registered operation may declare. */
export type IdempotencyHeader = "Idempotency-Key";
export type OperationInput = {
  params?: Record<string, string | number>;
  query?: Record<string, QueryScalar | readonly QueryScalar[] | undefined>;
  body?: unknown;
  idempotencyKey?: string;
};
export type MultipartPolicy = {
  files: readonly {
    field?: string;
    fieldPattern?: string;
    minCount?: number;
    maxCount: number;
    maxBytes: number;
    mimeTypes?: readonly string[];
  }[];
  bodyFields: Readonly<Record<string, "string" | "json">>;
  maxFileBytes: number;
  maxMetadataBytes: number;
  maxTotalBytes: number;
};
export type BinaryPolicy = {
  contentTypes: readonly string[];
  maxBytes: number;
  filename: string;
};
export const binaryDownloadSchema = z.object({
  blob: z.instanceof(Blob),
  filename: z.string(),
});

export type OperationDefinition<
  Request extends z.ZodType<OperationInput> = z.ZodType<OperationInput>,
  Response extends z.ZodType = z.ZodType,
> = {
  service: CapiroService;
  method: CapiroMethod;
  path: string;
  request: Request;
  response: Response;
  source: string;
  /** Server-owned choice for reviewed native Clerk session contracts. */
  authentication?: "clerk-session";
  queryArrays?: "repeat" | "comma";
  timeoutMs?: number;
  requestLimitBytes?: number;
  upstreamResponse?: z.ZodType;
  websocket?: {
    path: "/live";
    sessionParam: string;
    sessionQuery: "sessionId";
    ticketField: "ticket";
    ticketQuery: "ticket";
  };
  /**
   * Server-owned request-header capability. The registered operation names the
   * one reviewed header it needs; the gateway forwards exactly that header with
   * the request's `idempotencyKey` and never any other, and an operation that
   * does not declare it can never send it (its request schema is strict).
   */
  idempotency?: IdempotencyHeader;
  encoding?: "json" | "multipart";
  multipart?: MultipartPolicy;
  responseMode?: "json" | "binary";
  binary?: BinaryPolicy;
};

/** One reviewed controller contract; no ambient configuration or network work. */
export function defineOperation<
  Request extends z.ZodType<OperationInput>,
  Response extends z.ZodType,
>(
  definition: OperationDefinition<Request, Response>,
): OperationDefinition<Request, Response> {
  const nativeSessionAllowed =
    (definition.service === "onboard" &&
      /^\/(?:funnel|setup)\//.test(definition.path)) ||
    (definition.service === "core" &&
      definition.method === "POST" &&
      definition.path === "/clio/conversations/bootstrap");
  if (definition.authentication === "clerk-session" && !nativeSessionAllowed)
    throw new Error(
      "Default Clerk session tokens are restricted to reviewed operations.",
    );
  if (
    !/^\/(?:[A-Za-z0-9_-]+|:[A-Za-z][A-Za-z0-9_]*)(?:\/(?:[A-Za-z0-9_-]+|:[A-Za-z][A-Za-z0-9_]*))*$/.test(
      definition.path,
    )
  ) {
    throw new Error(
      "Registered operations must use a fixed relative service path.",
    );
  }
  if (
    definition.method === "GET" &&
    definition.request.safeParse({ body: {} }).success
  ) {
    throw new Error("Registered reads cannot accept a request body.");
  }
  if (
    definition.timeoutMs !== undefined &&
    (!Number.isInteger(definition.timeoutMs) ||
      definition.timeoutMs < 1_000 ||
      definition.timeoutMs > 600_000)
  ) {
    throw new Error("Operation deadlines must be between one and 600 seconds.");
  }
  if (
    definition.requestLimitBytes !== undefined &&
    (!Number.isInteger(definition.requestLimitBytes) ||
      definition.requestLimitBytes < 1 ||
      definition.requestLimitBytes > 24_000_000)
  ) {
    throw new Error(
      "Operation body limits must not exceed the existing server 24 MB limit.",
    );
  }
  if (
    definition.websocket &&
    (!definition.upstreamResponse ||
      definition.service !== "intelligence" ||
      definition.method !== "POST" ||
      definition.websocket.path !== "/live" ||
      definition.path !==
        `/hearings/:${definition.websocket.sessionParam}/ws-ticket` ||
      !/^[A-Za-z][A-Za-z0-9_]*$/.test(definition.websocket.sessionParam))
  ) {
    throw new Error(
      "WebSocket handoff must use a reviewed Intelligence hearing ticket operation.",
    );
  }
  if (
    definition.encoding === "multipart" &&
    (!definition.multipart ||
      definition.method === "GET" ||
      definition.multipart.maxTotalBytes > 30_000_000 ||
      definition.multipart.maxMetadataBytes > 1_000_000 ||
      definition.multipart.maxFileBytes > definition.multipart.maxTotalBytes)
  )
    throw new Error(
      "Multipart operations require a bounded reviewed file policy.",
    );
  if (
    definition.responseMode === "binary" &&
    (!definition.binary ||
      definition.binary.maxBytes > 30_000_000 ||
      !/^[A-Za-z0-9][A-Za-z0-9._ -]{0,150}$/.test(definition.binary.filename))
  )
    throw new Error(
      "Binary operations require bounded MIME and filename policies.",
    );
  return Object.freeze(definition);
}

export type OperationRegistry = Readonly<Record<string, OperationDefinition>>;
export type OperationRequest<Definition extends OperationDefinition> = z.input<
  Definition["request"]
>;
export type OperationResponse<Definition extends OperationDefinition> =
  z.output<Definition["response"]>;

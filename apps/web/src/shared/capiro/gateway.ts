import {
  abortable,
  readBoundedJson,
  operationPath,
  appendQuery,
  requestInput,
} from "./gateway-input";
import { readBinaryResponse } from "./binary";
import type { CapiroConfig } from "./config";
import type {
  OperationDefinition,
  OperationInput,
  OperationRegistry,
} from "./contracts";
import {
  backendMultipart,
  parseMultipartRequest,
  type CapiroUploadFile,
} from "./multipart";
import { publicPlannerFormOperations } from "./operations/planner-public-forms";
import { publicOnboardOperations } from "./operations/onboard-public";

import { jsonError, serviceErrorResponse } from "./gateway-errors";
import { reportStrategyValidation } from "./strategy-validation-diagnostic";
import { sameRequestOrigin } from "../request-origin";

const requestLimit = 2_000_000;
const responseLimit = 8_000_000;

function browserHandoff(
  payload: unknown,
  operation: OperationDefinition,
  input: OperationInput,
  base: string,
): unknown {
  if (!operation.websocket) return payload;
  if (
    !payload ||
    typeof payload !== "object" ||
    !("ticket" in payload) ||
    typeof payload.ticket !== "string"
  )
    throw new Error("Invalid hearing ticket.");
  const socket = new URL(
    `${base}${operationPath({ ...operation, path: operation.websocket.path }, input)}`,
  );
  const sessionId = input.params?.[operation.websocket.sessionParam];
  if (sessionId === undefined) throw new Error("Invalid hearing session.");
  socket.protocol = socket.protocol === "https:" ? "wss:" : "ws:";
  socket.searchParams.set("ticket", payload.ticket);
  socket.searchParams.set("sessionId", String(sessionId));
  return { ...payload, socketUrl: socket.href };
}

async function serviceResponse(
  response: Response,
  operation: OperationDefinition,
  input: OperationInput,
  base: string,
  signal: AbortSignal,
  publicCapability: boolean,
  diagnosticKey?: string,
): Promise<Response> {
  if (!response.ok)
    return serviceErrorResponse(response, operation, signal, publicCapability);
  if (operation.responseMode === "binary" && operation.binary) {
    const download = await readBinaryResponse(
      response,
      operation.binary,
      signal,
    );
    if (!operation.response.safeParse(download).success)
      return jsonError(502, "The service returned an unexpected export.");
    return new Response(download.blob, {
      status: response.status,
      headers: {
        "Content-Type": download.blob.type,
        "Content-Disposition": `attachment; filename="${download.filename}"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }
  const payload =
    response.status === 204
      ? null
      : await readBoundedJson(response.body, responseLimit, signal);
  const upstream = (operation.upstreamResponse ?? operation.response).safeParse(
    payload,
  );
  if (!upstream.success) {
    reportStrategyValidation(
      diagnosticKey,
      operation,
      "upstream",
      upstream.error,
      payload,
    );
    return jsonError(502, "The service returned an unexpected response.");
  }
  const parsed = operation.response.safeParse(
    browserHandoff(upstream.data, operation, input, base),
  );
  if (!parsed.success) {
    reportStrategyValidation(
      diagnosticKey,
      operation,
      "browser",
      parsed.error,
      upstream.data,
    );
    return jsonError(502, "The service returned an unexpected response.");
  }
  return response.status === 204
    ? new Response(null, {
        status: 204,
        headers: {
          "Cache-Control": "no-store",
          "Referrer-Policy": "no-referrer",
        },
      })
    : Response.json(parsed.data, {
        status: response.status,
        headers: {
          "Cache-Control": "no-store",
          "Referrer-Policy": "no-referrer",
        },
      });
}

async function dispatch(
  request: Request,
  operation: OperationDefinition,
  input: OperationInput,
  base: string,
  token: string | null,
  fetcher: typeof fetch,
  signal: AbortSignal,
  files: readonly CapiroUploadFile[] = [],
  diagnosticKey?: string,
): Promise<Response> {
  let url: URL;
  try {
    url = new URL(`${base}${operationPath(operation, input)}`);
    appendQuery(url, operation, input);
  } catch {
    return jsonError(400, "The request contains an invalid route parameter.");
  }
  try {
    const multipart = operation.encoding === "multipart" && operation.multipart;
    const body = multipart
      ? backendMultipart(input, files, multipart)
      : input.body === undefined
        ? undefined
        : JSON.stringify(input.body);
    const response = await abortable(
      fetcher(url, {
        method: operation.method,
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          Accept:
            operation.binary?.contentTypes.join(", ") ?? "application/json",
          ...(!multipart ? { "Content-Type": "application/json" } : {}),
        },
        body,
        cache: "no-store",
        credentials: "omit",
        redirect: "error",
        signal,
      }).then((response) => {
        if (signal.aborted) void response.body?.cancel().catch(() => undefined);
        return response;
      }),
      signal,
    );
    if (signal.aborted) {
      await response.body?.cancel().catch(() => undefined);
      throw new Error();
    }
    return await serviceResponse(
      response,
      operation,
      input,
      base,
      signal,
      token === null,
      diagnosticKey,
    );
  } catch {
    return signal.aborted
      ? jsonError(
          request.signal.aborted ? 408 : 504,
          request.signal.aborted
            ? "The request was cancelled."
            : "The service request timed out. Please retry.",
        )
      : jsonError(502, "The service could not be reached. Please retry.");
  }
}

/** Backend-issued revocable form capability only; no identity, cookies or bearer is forwarded. */
async function handlePublicOperationRequest(
  request: Request,
  key: string,
  registry: OperationRegistry,
  config: CapiroConfig,
  fetcher: typeof fetch = fetch,
): Promise<Response> {
  if (!Object.hasOwn(registry, key))
    return jsonError(404, "Form operation not found.");
  const operation = registry[key]!;
  if (request.method !== operation.method)
    return jsonError(405, "Method not allowed.");
  if (
    request.method !== "GET" &&
    !sameRequestOrigin(request, config.requestOrigin)
  )
    return jsonError(403, "Request origin is not allowed.");
  const base = config.services[operation.service];
  if (!base) return jsonError(503, "This form service is not configured.");
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(30000)]);
  try {
    const upload =
      operation.encoding === "multipart" && operation.multipart
        ? await parseMultipartRequest(request, operation.multipart, signal)
        : undefined;
    const parsed = operation.request.safeParse(
      upload ? upload.input : await requestInput(request, 250000, signal),
    );
    if (!parsed.success)
      return jsonError(400, "The form request contains invalid fields.");
    const response = await dispatch(
      request,
      operation,
      parsed.data,
      base,
      null,
      fetcher,
      signal,
      upload?.files,
    );
    response.headers.set("Referrer-Policy", "no-referrer");
    response.headers.set("X-Content-Type-Options", "nosniff");
    return response;
  } catch {
    return jsonError(400, "The form request could not be read.");
  }
}

/** The two public surfaces remain separate reviewed capability allowlists. */
export function handlePublicPlannerFormRequest(
  request: Request,
  key: string,
  config: CapiroConfig,
  fetcher: typeof fetch = fetch,
) {
  return handlePublicOperationRequest(
    request,
    key,
    publicPlannerFormOperations,
    config,
    fetcher,
  );
}

export function handlePublicOnboardRequest(
  request: Request,
  key: string,
  config: CapiroConfig,
  fetcher: typeof fetch = fetch,
) {
  return handlePublicOperationRequest(
    request,
    key,
    publicOnboardOperations,
    config,
    fetcher,
  );
}

/** Trusted token callback supplies the existing Clerk claims; this gateway adds no scope claims. */
export async function handleCapiroRequest(
  request: Request,
  key: string,
  registry: OperationRegistry,
  config: CapiroConfig,
  getToken: (
    authentication?: OperationDefinition["authentication"],
  ) => Promise<string | null>,
  fetcher: typeof fetch = fetch,
): Promise<Response> {
  if (!Object.hasOwn(registry, key))
    return jsonError(404, "Unknown operation.");
  const operation = registry[key]!;
  if (request.method !== operation.method)
    return jsonError(405, "Method not allowed for this operation.");
  if (
    request.method !== "GET" &&
    !sameRequestOrigin(request, config.requestOrigin)
  ) {
    return jsonError(403, "Request origin is not allowed.");
  }
  const base = config.services[operation.service];
  if (!config.authConfigured || !base)
    return jsonError(503, "The requested service is not configured.");
  if (request.signal.aborted)
    return jsonError(408, "The request was cancelled.");
  const signal = AbortSignal.any([
    request.signal,
    AbortSignal.timeout(operation.timeoutMs ?? 30_000),
  ]);
  let input: OperationInput;
  let files: readonly CapiroUploadFile[] = [];
  try {
    const upload =
      operation.encoding === "multipart" && operation.multipart
        ? await parseMultipartRequest(request, operation.multipart, signal)
        : undefined;
    const parsed = operation.request.safeParse(
      upload
        ? upload.input
        : await requestInput(
            request,
            operation.requestLimitBytes ?? requestLimit,
            signal,
          ),
    );
    if (!parsed.success)
      return jsonError(400, "The request contains invalid fields.");
    input = parsed.data;
    files = upload?.files ?? [];
    operationPath(operation, input);
    if (upload && operation.multipart)
      backendMultipart(input, files, operation.multipart);
  } catch {
    return jsonError(400, "The request could not be read.");
  }
  let token: string | null;
  try {
    token = await abortable(getToken(operation.authentication), signal);
  } catch {
    if (signal.aborted)
      return jsonError(
        request.signal.aborted ? 408 : 504,
        "The session request was cancelled or timed out.",
      );
    return jsonError(401, "Your session could not be verified. Sign in again.");
  }
  if (!token) return jsonError(401, "Sign in to continue.");
  if (request.signal.aborted)
    return jsonError(408, "The request was cancelled.");
  return dispatch(
    request,
    operation,
    input,
    base,
    token,
    fetcher,
    signal,
    files,
    key,
  );
}

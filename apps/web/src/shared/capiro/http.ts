import { readBinaryResponse } from "./binary";
import type {
  OperationDefinition,
  OperationInput,
  OperationRegistry,
  OperationRequest,
  OperationResponse,
} from "./contracts";
import { validateUploadFiles, type CapiroUploadFile } from "./multipart";

export class CapiroApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "CapiroApiError";
  }
}

export type CapiroApi<Registry extends OperationRegistry> = {
  request<Key extends keyof Registry & string>(
    key: Key,
    input: OperationRequest<Registry[Key]>,
    options?: { signal?: AbortSignal },
  ): Promise<OperationResponse<Registry[Key]>>;
  upload<Key extends keyof Registry & string>(
    key: Key,
    input: OperationRequest<Registry[Key]>,
    files: readonly CapiroUploadFile[],
    options?: { signal?: AbortSignal },
  ): Promise<OperationResponse<Registry[Key]>>;
  download<Key extends keyof Registry & string>(
    key: Key,
    input: OperationRequest<Registry[Key]>,
    options?: { signal?: AbortSignal },
  ): Promise<OperationResponse<Registry[Key]>>;
};

function readableError(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object" || !("message" in payload))
    return undefined;
  return typeof payload.message === "string"
    ? payload.message.slice(0, 1000)
    : undefined;
}

type ApiOptions = {
  fetcher?: typeof fetch;
  onSessionExpired?: () => void;
  scopeSignal?: () => AbortSignal;
};
type RequestOptions = { signal?: AbortSignal };

function requestBody(
  operation: OperationDefinition,
  input: OperationInput,
  files?: readonly CapiroUploadFile[],
): BodyInit | undefined {
  const multipart = operation.encoding === "multipart" && operation.multipart;
  if (!multipart) {
    if (files)
      throw new CapiroApiError(400, "This operation does not accept files.");
    return operation.method === "GET" ? undefined : JSON.stringify(input);
  }
  if (!files)
    throw new CapiroApiError(
      400,
      "This operation requires a registered file upload.",
    );
  if (
    new TextEncoder().encode(JSON.stringify(input)).byteLength >
    multipart.maxMetadataBytes
  )
    throw new CapiroApiError(400, "The upload metadata is too large.");
  try {
    validateUploadFiles(files, multipart);
  } catch {
    throw new CapiroApiError(
      400,
      "The selected files are not supported for this operation.",
    );
  }
  const form = new FormData();
  form.append("input", JSON.stringify(input));
  for (const { field, file } of files) form.append(field, file);
  return form;
}

function assertCurrent(signals: readonly AbortSignal[]) {
  if (signals.some((signal) => signal.aborted))
    throw new DOMException("The request was cancelled.", "AbortError");
}

async function responsePayload(
  response: Response,
  operation: OperationDefinition,
  signals: readonly AbortSignal[],
  options: ApiOptions,
) {
  const payload: unknown =
    response.ok && operation.responseMode === "binary" && operation.binary
      ? await readBinaryResponse(
          response,
          operation.binary,
          AbortSignal.any([
            ...signals,
            AbortSignal.timeout(operation.timeoutMs ?? 30_000),
          ]),
        )
      : response.status === 204
        ? null
        : await response.json().catch(() => null);
  assertCurrent(signals);
  if (!response.ok) {
    if (response.status === 401) options.onSessionExpired?.();
    throw new CapiroApiError(
      response.status,
      response.status === 401
        ? "Your session expired. Sign in again."
        : (readableError(payload) ?? "The request could not be completed."),
    );
  }
  const parsed = operation.response.safeParse(payload);
  if (!parsed.success)
    throw new CapiroApiError(
      502,
      "The service returned an unexpected response.",
    );
  return parsed.data;
}

async function perform<
  Registry extends OperationRegistry,
  Key extends keyof Registry & string,
>(
  registry: Registry,
  options: ApiOptions,
  key: Key,
  input: OperationRequest<Registry[Key]>,
  requestOptions: RequestOptions = {},
  files?: readonly CapiroUploadFile[],
): Promise<OperationResponse<Registry[Key]>> {
  if (!Object.hasOwn(registry, key))
    throw new CapiroApiError(404, "Unknown operation.");
  const operation: OperationDefinition = registry[key]!;
  const parsedInput = operation.request.safeParse(input);
  if (!parsedInput.success)
    throw new CapiroApiError(400, "The request contains invalid fields.");
  const body = requestBody(operation, parsedInput.data, files);
  const isRead = operation.method === "GET";
  const endpoint = `/api/capiro/${encodeURIComponent(key)}${isRead ? `?input=${encodeURIComponent(JSON.stringify(parsedInput.data))}` : ""}`;
  const signals = [requestOptions.signal, options.scopeSignal?.()].filter(
    (signal): signal is AbortSignal => Boolean(signal),
  );
  const response = await (options.fetcher ?? fetch)(endpoint, {
    method: operation.method,
    credentials: "same-origin",
    cache: "no-store",
    headers:
      isRead || operation.encoding === "multipart"
        ? undefined
        : { "Content-Type": "application/json" },
    body,
    signal: signals.length ? AbortSignal.any(signals) : undefined,
  });
  assertCurrent(signals);
  return (await responsePayload(
    response,
    operation,
    signals,
    options,
  )) as OperationResponse<Registry[Key]>;
}

export function createCapiroApi<Registry extends OperationRegistry>(
  registry: Registry,
  options: ApiOptions = {},
): CapiroApi<Registry> {
  return {
    request: (key, input, requestOptions) =>
      perform(registry, options, key, input, requestOptions),
    upload: (key, input, files, requestOptions) =>
      perform(registry, options, key, input, requestOptions, files),
    download: (key, input, requestOptions) => {
      if (
        !Object.hasOwn(registry, key) ||
        registry[key]!.responseMode !== "binary"
      )
        return Promise.reject(
          new CapiroApiError(400, "This operation does not return an export."),
        );
      return perform(registry, options, key, input, requestOptions);
    },
  };
}

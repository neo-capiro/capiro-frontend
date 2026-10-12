import type {
  OperationDefinition,
  OperationInput,
  QueryScalar,
} from "./contracts";

export function abortable<Value>(
  promise: Promise<Value>,
  signal: AbortSignal,
): Promise<Value> {
  if (signal.aborted)
    return Promise.reject(new DOMException("Request aborted.", "AbortError"));
  return new Promise((resolve, reject) => {
    const abort = () =>
      reject(new DOMException("Request aborted.", "AbortError"));
    signal.addEventListener("abort", abort, { once: true });
    promise
      .then(resolve, reject)
      .finally(() => signal.removeEventListener("abort", abort));
  });
}

export async function readBoundedJson(
  body: ReadableStream<Uint8Array> | null,
  limit: number,
  signal: AbortSignal,
): Promise<unknown> {
  if (!body) return null;
  const reader = body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let bytes = 0;
  let text = "";
  try {
    for (;;) {
      const chunk = await abortable(reader.read(), signal);
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > limit) throw new Error("Body limit exceeded.");
      text += decoder.decode(chunk.value, { stream: true });
    }
    text += decoder.decode();
    return text.trim() ? JSON.parse(text) : null;
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    throw error;
  } finally {
    reader.releaseLock();
  }
}

export function operationPath(
  operation: OperationDefinition,
  input: OperationInput,
): string {
  return operation.path.replace(
    /:([A-Za-z][A-Za-z0-9_]*)/g,
    (_, name: string) => {
      const value = input.params?.[name];
      if (
        value === undefined ||
        value === "" ||
        value === "." ||
        value === ".." ||
        /[\\/%?#\x00-\x1f]/.test(String(value))
      ) {
        throw new Error("Invalid route parameter.");
      }
      return encodeURIComponent(String(value));
    },
  );
}

export function appendQuery(
  url: URL,
  operation: OperationDefinition,
  input: OperationInput,
) {
  for (const [key, value] of Object.entries(input.query ?? {})) {
    if (value === undefined) continue;
    if (Array.isArray(value) && operation.queryArrays === "comma")
      url.searchParams.set(key, value.join(","));
    else {
      const values: readonly QueryScalar[] = Array.isArray(value)
        ? value
        : [value as QueryScalar];
      for (const item of values) url.searchParams.append(key, String(item));
    }
  }
}

export async function requestInput(
  request: Request,
  limit: number,
  signal: AbortSignal,
): Promise<unknown> {
  const url = new URL(request.url);
  if (request.method === "GET") {
    if (
      [...url.searchParams.keys()].some((key) => key !== "input") ||
      url.searchParams.getAll("input").length > 1
    )
      throw new Error();
    const input = url.searchParams.get("input") ?? "{}";
    if (input.length > 16_000) throw new Error();
    return JSON.parse(input);
  }
  if (url.search) throw new Error();
  if (
    request.headers.get("content-type")?.split(";")[0]?.trim() !==
    "application/json"
  )
    throw new Error();
  if (Number(request.headers.get("content-length")) > limit) throw new Error();
  return readBoundedJson(request.body, limit, signal);
}

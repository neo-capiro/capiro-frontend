/** Bounds raw network bytes before a governed receiver parses or verifies them. */
export async function boundedResponseBytes(
  response: Response,
  signal: AbortSignal,
  limit: number,
): Promise<Uint8Array<ArrayBuffer>> {
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  const abort = () => {
    void reader?.cancel().catch(() => undefined);
  };
  try {
    signal.throwIfAborted();
    const declared = response.headers.get("content-length");
    if (
      declared !== null &&
      (!/^\d+$/.test(declared) || Number(declared) > limit)
    )
      throw new Error("Response exceeds the receiving limit");
    if (!response.body) throw new Error("Response body is unavailable");
    reader = response.body.getReader();
    let bytes = 0;
    const parts: Uint8Array[] = [];
    signal.addEventListener("abort", abort, { once: true });
    while (true) {
      signal.throwIfAborted();
      const chunk = await reader.read();
      signal.throwIfAborted();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > limit)
        throw new Error("Response exceeds the receiving limit");
      parts.push(chunk.value.slice());
    }
    const result = new Uint8Array(bytes);
    let offset = 0;
    for (const part of parts) {
      result.set(part, offset);
      offset += part.byteLength;
    }
    return result;
  } finally {
    signal.removeEventListener("abort", abort);
    if (reader) {
      void reader.cancel().catch(() => undefined);
      reader.releaseLock();
    } else {
      void response.body?.cancel().catch(() => undefined);
    }
  }
}

export async function boundedJsonBytes(
  response: Response,
  signal: AbortSignal,
  limit: number,
): Promise<Uint8Array<ArrayBuffer>> {
  if (
    !/^application\/json(?:\s*;|$)/i.test(
      response.headers.get("content-type") ?? "",
    )
  ) {
    void response.body?.cancel().catch(() => undefined);
    throw new Error("Unexpected response format");
  }
  return boundedResponseBytes(response, signal, limit);
}

/** Existing recommendation bootstrap/response text interface. */
export async function boundedJsonText(
  response: Response,
  signal: AbortSignal,
  limit: number,
): Promise<string> {
  return new TextDecoder("utf-8", { fatal: true }).decode(
    await boundedJsonBytes(response, signal, limit),
  );
}

/** The deadline includes receiving/hash validation, not just response headers. */
export async function withActionDeadline<T>(
  signals: readonly AbortSignal[],
  run: (signal: AbortSignal) => Promise<T>,
  milliseconds = 30_000,
): Promise<T> {
  const deadline = new AbortController();
  const timer = setTimeout(() => deadline.abort(), milliseconds);
  const signal = AbortSignal.any([...signals, deadline.signal]);
  let onAbort: () => void = () => undefined;
  try {
    signal.throwIfAborted();
    const cancelled = new Promise<never>((_, reject) => {
      onAbort = () => reject(signal.reason);
      signal.addEventListener("abort", onAbort, { once: true });
    });
    const result = await Promise.race([run(signal), cancelled]);
    signal.throwIfAborted();
    return result;
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", onAbort);
  }
}

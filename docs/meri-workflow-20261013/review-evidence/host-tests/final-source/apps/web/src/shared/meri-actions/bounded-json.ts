/** Bounds the streamed, decoded body before a governed receiver parses it. */
export async function boundedJsonText(
  response: Response,
  signal: AbortSignal,
  limit: number,
): Promise<string> {
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  const abort = () => {
    void reader?.cancel().catch(() => undefined);
  };
  try {
    signal.throwIfAborted();
    if (
      !/^application\/json(?:\s*;|$)/i.test(
        response.headers.get("content-type") ?? "",
      )
    )
      throw new Error("Unexpected response format");
    const declared = response.headers.get("content-length");
    if (
      declared !== null &&
      (!/^\d+$/.test(declared) || Number(declared) > limit)
    )
      throw new Error("Response exceeds the receiving limit");
    if (!response.body) throw new Error("Response body is unavailable");
    reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8", { fatal: true });
    let bytes = 0;
    const parts: string[] = [];
    signal.addEventListener("abort", abort, { once: true });
    while (true) {
      signal.throwIfAborted();
      const chunk = await reader.read();
      signal.throwIfAborted();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > limit)
        throw new Error("Response exceeds the receiving limit");
      parts.push(decoder.decode(chunk.value, { stream: true }));
    }
    parts.push(decoder.decode());
    return parts.join("");
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

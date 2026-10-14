/** Preserve opaque UI stream bytes; cancellation ends observation, not the run. */
export function boundedConversationStream(
  response: Response,
  signal: AbortSignal,
  stopTransport: () => void,
  milliseconds: number,
  limit = 8 * 1024 * 1024,
) {
  if (!response.body) throw new Error("Conversation stream unavailable");
  const declared = response.headers.get("content-length");
  if (
    declared !== null &&
    (!/^(0|[1-9]\d*)$/.test(declared) ||
      !Number.isSafeInteger(Number(declared)) ||
      Number(declared) > limit)
  )
    throw new Error("Conversation stream exceeds receiving limit");
  const reader = response.body.getReader();
  let ended = false;
  let bytes = 0;
  let output: ReadableStreamDefaultController<Uint8Array>;
  const cancelReader = async () => {
    try {
      await reader.cancel();
    } catch {
      /* Transport cancellation remains best effort. */
    } finally {
      reader.releaseLock();
    }
  };
  const finish = () => {
    if (ended) return;
    ended = true;
    clearTimeout(timer);
    signal.removeEventListener("abort", aborted);
  };
  const aborted = () => {
    if (ended) return;
    finish();
    output.error(new Error("Conversation observation interrupted"));
    stopTransport();
    void cancelReader();
  };
  const timer = setTimeout(aborted, Math.max(0, milliseconds));
  return new ReadableStream<Uint8Array>({
    start(controller) {
      output = controller;
      signal.addEventListener("abort", aborted, { once: true });
      if (signal.aborted) aborted();
    },
    async pull(controller) {
      if (ended) return;
      try {
        signal.throwIfAborted();
        const chunk = await reader.read();
        if (ended) return;
        signal.throwIfAborted();
        if (chunk.done) {
          finish();
          reader.releaseLock();
          controller.close();
          return;
        }
        bytes += chunk.value.byteLength;
        if (bytes > limit)
          throw new Error("Conversation stream exceeds receiving limit");
        controller.enqueue(chunk.value);
      } catch (error) {
        if (ended) return;
        finish();
        controller.error(error);
        stopTransport();
        void cancelReader();
      }
    },
    cancel() {
      if (ended) return;
      finish();
      stopTransport();
      return cancelReader();
    },
  });
}

import type { BinaryPolicy } from "./contracts";

export async function readBinaryResponse(
  response: Response,
  policy: BinaryPolicy,
  signal: AbortSignal,
) {
  const contentType = response.headers
    .get("content-type")
    ?.split(";")[0]
    ?.trim()
    .toLowerCase();
  if (
    !contentType ||
    !policy.contentTypes.includes(contentType) ||
    Number(response.headers.get("content-length")) > policy.maxBytes
  ) {
    await response.body?.cancel().catch(() => undefined);
    throw new Error("Unexpected export response.");
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error("The export is empty.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  const cancel = () => {
    void reader.cancel().catch(() => undefined);
  };
  signal.addEventListener("abort", cancel, { once: true });
  try {
    if (signal.aborted) throw new Error("The export was cancelled.");
    for (;;) {
      const result = await reader.read();
      if (signal.aborted) throw new Error("The export was cancelled.");
      if (result.done) break;
      size += result.value.byteLength;
      if (size > policy.maxBytes) throw new Error("The export is too large.");
      chunks.push(result.value);
    }
    const data = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      data.set(chunk, offset);
      offset += chunk.byteLength;
    }
    if (!size) throw new Error("The export is empty.");
    return {
      blob: new Blob([data], { type: contentType }),
      filename: policy.filename,
    };
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    throw error;
  } finally {
    signal.removeEventListener("abort", cancel);
    reader.releaseLock();
  }
}

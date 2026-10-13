import type { MultipartPolicy, OperationInput } from "./contracts";

export type CapiroUploadFile = { field: string; file: File };
export function validateUploadFiles(
  files: readonly CapiroUploadFile[],
  policy: MultipartPolicy,
) {
  const counts = new Map<string, number>();
  let totalBytes = 0;
  for (const { field, file } of files) {
    const rule = policy.files.find(
      (item) =>
        item.field === field ||
        (item.fieldPattern && new RegExp(item.fieldPattern).test(field)),
    );
    if (
      !rule ||
      !(file instanceof File) ||
      file.size < 1 ||
      file.size > rule.maxBytes ||
      (rule.mimeTypes && !rule.mimeTypes.includes(file.type))
    )
      throw new Error("The selected file is not supported.");
    const name = rule.field ?? rule.fieldPattern!;
    const count = (counts.get(name) ?? 0) + 1;
    if (count > rule.maxCount)
      throw new Error("Too many files for this operation.");
    counts.set(name, count);
    totalBytes += file.size;
  }
  if (totalBytes > policy.maxFileBytes)
    throw new Error("The selected files are too large.");
  for (const rule of policy.files) {
    if (
      (counts.get(rule.field ?? rule.fieldPattern!) ?? 0) < (rule.minCount ?? 0)
    )
      throw new Error("Select a file for this operation.");
  }
}

async function boundedForm(
  request: Request,
  limit: number,
  signal: AbortSignal,
) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("A multipart body is required.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  const cancel = () => {
    void reader.cancel().catch(() => undefined);
  };
  signal.addEventListener("abort", cancel, { once: true });
  try {
    if (signal.aborted) throw new Error("The request was cancelled.");
    for (;;) {
      const result = await reader.read();
      if (signal.aborted) throw new Error("The request was cancelled.");
      if (result.done) break;
      size += result.value.byteLength;
      if (size > limit) throw new Error("The upload is too large.");
      chunks.push(result.value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return await new Request(request.url, {
      method: request.method,
      headers: { "Content-Type": request.headers.get("content-type")! },
      body: bytes,
    }).formData();
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    throw error;
  } finally {
    signal.removeEventListener("abort", cancel);
    reader.releaseLock();
  }
}

export async function parseMultipartRequest(
  request: Request,
  policy: MultipartPolicy,
  signal: AbortSignal,
) {
  if (
    !request.headers.get("content-type")?.startsWith("multipart/form-data;") ||
    new URL(request.url).search ||
    Number(request.headers.get("content-length")) > policy.maxTotalBytes
  )
    throw new Error("Invalid multipart request.");
  const form = await boundedForm(request, policy.maxTotalBytes, signal);
  const raw = form.getAll("input");
  if (
    raw.length !== 1 ||
    typeof raw[0] !== "string" ||
    new TextEncoder().encode(raw[0]).byteLength > policy.maxMetadataBytes
  ) {
    throw new Error("Invalid upload metadata.");
  }
  const files: CapiroUploadFile[] = [];
  for (const [field, file] of form.entries()) {
    if (field === "input") continue;
    if (typeof file === "string") throw new Error("Unexpected upload field.");
    files.push({ field, file });
  }
  validateUploadFiles(files, policy);
  return { input: JSON.parse(raw[0]) as unknown, files };
}

/** Only validated, explicitly named backend metadata and file fields are forwarded. */
export function backendMultipart(
  input: OperationInput,
  files: readonly CapiroUploadFile[],
  policy: MultipartPolicy,
) {
  const form = new FormData();
  const body = input.body ?? {};
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw new Error("Invalid upload metadata.");
  for (const [field, value] of Object.entries(body)) {
    if (value === undefined) continue;
    const encoding = policy.bodyFields[field];
    if (!encoding) throw new Error("Unexpected upload metadata.");
    if (
      encoding === "string" &&
      !["string", "number", "boolean"].includes(typeof value)
    )
      throw new Error("Invalid upload metadata.");
    form.append(
      field,
      encoding === "json" ? JSON.stringify(value) : String(value),
    );
  }
  for (const { field, file } of files) form.append(field, file);
  return form;
}

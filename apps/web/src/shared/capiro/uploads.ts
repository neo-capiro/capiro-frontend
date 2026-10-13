import { CapiroApiError } from "./http";

export type CapiroLogoTicket = {
  url: string;
  fields: Record<string, string>;
  s3Key: string;
};
const logoTypes = new Set([
  "image/png",
  "image/jpeg",
  "image/svg+xml",
  "image/webp",
]);
const attachmentTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "text/plain",
  "text/markdown",
  "application/json",
  "text/tab-separated-values",
]);

/** Only a backend-issued S3 POST ticket; auth/session headers never leave Capiro. */
export async function uploadCapiroLogo(
  ticket: CapiroLogoTicket,
  file: File,
  options: { signal?: AbortSignal; fetcher?: typeof fetch } = {},
): Promise<void> {
  if (
    !logoTypes.has(file.type) ||
    file.size < 1 ||
    file.size > 2 * 1024 * 1024
  ) {
    throw new CapiroApiError(
      400,
      "Choose a PNG, JPEG, SVG or WebP logo no larger than 2 MiB.",
    );
  }
  return uploadPresigned(ticket, file, options, "logo", 30_000);
}

/** Matches the reviewed Engagement attachment policy; the backend verifies actual bytes on confirmation. */
export async function uploadCapiroAttachment(
  ticket: CapiroLogoTicket,
  file: File,
  options: { signal?: AbortSignal; fetcher?: typeof fetch } = {},
): Promise<void> {
  const essence = file.type.trim().toLowerCase().split(";")[0]!.trim();
  const supported =
    essence !== "image/svg+xml" &&
    (attachmentTypes.has(essence) ||
      ["image/", "audio/", "video/"].some((prefix) =>
        essence.startsWith(prefix),
      ));
  if (!supported || file.size < 1 || file.size > 25 * 1024 * 1024)
    throw new CapiroApiError(
      400,
      "Choose a supported attachment no larger than 25 MiB.",
    );
  return uploadPresigned(ticket, file, options, "attachment", 120_000);
}

async function uploadPresigned(
  ticket: CapiroLogoTicket,
  file: File,
  options: { signal?: AbortSignal; fetcher?: typeof fetch },
  label: string,
  timeoutMs: number,
) {
  let url: URL;
  try {
    url = new URL(ticket.url);
    if (
      url.protocol !== "https:" ||
      (url.port !== "" && url.port !== "443") ||
      url.username ||
      url.password ||
      url.hash ||
      url.search ||
      !/^(?:[a-z0-9.-]+\.)?s3(?:[.-][a-z0-9-]+)?\.amazonaws\.com$/.test(
        url.hostname,
      )
    )
      throw new Error();
    if (
      !ticket.s3Key ||
      ticket.fields.key !== ticket.s3Key ||
      Object.values(ticket.fields).some((value) => typeof value !== "string")
    )
      throw new Error();
    if (
      ticket.fields["Content-Type"] &&
      ticket.fields["Content-Type"] !== file.type
    )
      throw new Error();
  } catch {
    throw new CapiroApiError(
      502,
      `The ${label} upload ticket is invalid. Request a new upload.`,
    );
  }
  const form = new FormData();
  for (const [key, value] of Object.entries(ticket.fields))
    form.append(key, value);
  form.append("file", file);
  const signal = AbortSignal.any([
    ...(options.signal ? [options.signal] : []),
    AbortSignal.timeout(timeoutMs),
  ]);
  signal.throwIfAborted();
  let response: Response;
  try {
    response = await (options.fetcher ?? fetch)(url, {
      method: "POST",
      body: form,
      credentials: "omit",
      redirect: "error",
      signal,
    });
  } catch {
    if (options.signal?.aborted)
      throw new DOMException("The upload was cancelled.", "AbortError");
    throw new CapiroApiError(
      502,
      `The ${label} could not be uploaded. Request a new upload before retrying.`,
    );
  }
  if (signal.aborted) {
    await response.body?.cancel().catch(() => undefined);
    if (options.signal?.aborted)
      throw new DOMException("The upload was cancelled.", "AbortError");
    throw new CapiroApiError(
      504,
      `The ${label} upload timed out. Request a new upload before retrying.`,
    );
  }
  if (!response.ok)
    throw new CapiroApiError(
      response.status,
      `The ${label} upload was rejected. Request a new upload before retrying.`,
    );
  await response.body?.cancel().catch(() => undefined);
}

import { z } from "zod";
import type { ApiClient } from "@/shared/portfolio/api/http";
import type { ClientWriter } from "@/shared/portfolio/auth/client-writer";
import {
  contentType,
  fileValidation,
  signedUrl,
  uploadTicketSchema,
} from "./contracts";
import { prospectAttachmentSchema } from "./prospect-files";

const prospectTicketSchema = uploadTicketSchema.extend({
  uploadIntentId: z.uuid(),
  requestId: z.uuid(),
  expiresAt: z.iso.datetime({ offset: true }),
});
export type ProspectUpload = {
  requestId: string;
  prospectId: string;
  actor: ClientWriter;
  file: File;
  checksumSha256: string;
  ticket?: z.infer<typeof prospectTicketSchema>;
  bytesStarted?: boolean;
  bytesUploaded?: boolean;
};
export async function prepareProspectUpload(
  prospectId: string,
  actor: ClientWriter,
  file: File,
  requestId: string,
  assert: () => void,
): Promise<ProspectUpload> {
  const invalid = fileValidation(file);
  if (invalid) throw new Error(invalid);
  z.uuid().parse(prospectId);
  z.uuid().parse(requestId);
  assert();
  const digest = await crypto.subtle.digest(
    "SHA-256",
    await file.arrayBuffer(),
  );
  assert();
  return {
    prospectId,
    actor,
    file,
    requestId,
    checksumSha256: Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join(""),
  };
}
export async function uploadProspectFile(
  api: ApiClient,
  attempt: ProspectUpload,
  signal: AbortSignal,
  assert: () => void,
  stage: (value: string) => void,
  transport: typeof fetch = fetch,
) {
  const guard = () => {
    signal.throwIfAborted();
    assert();
  };
  const metadata = {
    prospectId: attempt.prospectId,
    fileName: attempt.file.name,
    contentType: contentType(attempt.file)!,
    checksumSha256: attempt.checksumSha256,
  };
  guard();
  if (!attempt.ticket) {
    stage("Preparing the original upload intent…");
    const ticket = await api.request(
      "core",
      "engagement/attachments/upload-url",
      prospectTicketSchema.refine(
        (value) =>
          value.requestId === attempt.requestId &&
          value.fields.key === value.s3Key &&
          value.fields["Content-Type"] === metadata.contentType &&
          value.fields["x-amz-checksum-algorithm"] === "SHA256" &&
          value.fields["x-amz-checksum-sha256"] ===
            btoa(
              String.fromCharCode(
                ...attempt.checksumSha256
                  .match(/../g)!
                  .map((hex) => parseInt(hex, 16)),
              ),
            ),
      ),
      {
        method: "POST",
        body: {
          ...metadata,
          requestId: attempt.requestId,
          contentLength: attempt.file.size,
        },
        signal,
      },
    );
    guard();
    if (!signedUrl(ticket.url))
      throw new Error(
        "The upload service returned an invalid HTTPS destination.",
      );
    attempt.ticket = ticket;
  }
  if (!attempt.bytesStarted) {
    if (Date.parse(attempt.ticket.expiresAt) <= Date.now())
      throw new Error(
        "The original upload intent expired. It cannot be replaced or replayed as a new upload here.",
      );
    const form = new FormData();
    for (const [key, value] of Object.entries(attempt.ticket.fields))
      form.append(key, value);
    form.append("file", attempt.file);
    guard();
    stage("Uploading the verified bytes…");
    attempt.bytesStarted = true;
    const response = await transport(attempt.ticket.url, {
      method: "POST",
      body: form,
      credentials: "omit",
      redirect: "error",
      signal: AbortSignal.any([signal, AbortSignal.timeout(60_000)]),
    });
    guard();
    if (!response.ok)
      throw new Error(
        "Storage completion was not confirmed. Recover the original confirmation before considering another upload.",
      );
    attempt.bytesUploaded = true;
  }
  guard();
  stage("Confirming the original upload…");
  const file = await api.request(
    "core",
    "engagement/attachments/confirm",
    prospectAttachmentSchema.refine(
      (value) =>
        value.tenantId === attempt.actor.tenantId &&
        value.prospectId === attempt.prospectId &&
        value.uploadedByUserId === attempt.actor.userId &&
        value.s3Key === attempt.ticket?.s3Key &&
        value.fileName === metadata.fileName &&
        value.contentType === metadata.contentType &&
        value.byteSize === attempt.file.size &&
        value.checksumSha256 === attempt.checksumSha256 &&
        value.calculatedSha256 === attempt.checksumSha256 &&
        value.source === "manual",
    ),
    {
      method: "POST",
      body: { ...metadata, s3Key: attempt.ticket.s3Key },
      signal,
    },
  );
  guard();
  return file;
}

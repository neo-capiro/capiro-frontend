import { createApiClient } from "../src/shared/portfolio/api/http";
import {
  selectProspectUpload,
  type ProspectFileCopyReview,
} from "../src/features/portfolio/files/upload-copy/review";
import type { ProspectFileCopyAttempt } from "../src/features/portfolio/files/upload-copy/contracts";
import type { ProspectAttachment } from "../src/features/portfolio/files/prospect-files";
import {
  actor,
  id,
  timestamp,
  review as contactReview,
} from "./prospect-contact-transfer-fixtures";
export { actor, id, timestamp };
export const source: ProspectAttachment = {
  id: id(10),
  tenantId: actor.tenantId,
  prospectId: id(3),
  clientId: null,
  meetingId: null,
  mailMessageId: null,
  fileName: "Synthetic confidential upload.txt",
  contentType: "text/plain",
  byteSize: 12,
  source: "manual",
  folder: null,
  metadataRevision: 3,
  viewerMode: "restricted",
  viewerUserIds: [],
  uploadedByUserId: actor.userId,
  createdAt: timestamp,
  lifecycleStatus: "ready",
  scanStatus: "clean",
  extractionStatus: null,
  indexedAt: null,
  usable: true,
  s3Key: "synthetic/upload",
  checksumSha256: "a".repeat(64),
  calculatedSha256: "a".repeat(64),
};
export const review: ProspectFileCopyReview = {
  prospect: contactReview.prospect,
  client: contactReview.client,
  selection: selectProspectUpload(source),
};
export function receiptFor(
  attempt: ProspectFileCopyAttempt,
  status: "pending" | "completed" = "completed",
  available = true,
) {
  return {
    schemaVersion: 1,
    operation: "copy_prospect_upload",
    tenantId: actor.tenantId,
    actorUserId: actor.userId,
    requestId: attempt.command.requestId,
    prospectId: id(3),
    clientId: id(4),
    payloadDigest: attempt.payloadDigest,
    status,
    sourceId: attempt.command.sourceId,
    expectedRevision: attempt.command.expectedRevision,
    destinationId: id(40),
    createdAt: timestamp,
    completedAt: status === "completed" ? timestamp : null,
    available: status === "completed" && available,
    result:
      status === "completed"
        ? {
            id: id(40),
            fileName: source.fileName,
            folder: attempt.command.folder,
            revision: 0,
            lifecycleStatus: "ready",
            scanStatus: "clean",
          }
        : null,
  };
}
export function fixture(
  options: {
    current?: ProspectFileCopyReview;
    files?: ProspectAttachment[];
    identity?: unknown;
    override?: (
      path: string,
      method: string,
      body: unknown,
    ) => Response | undefined | Promise<Response | undefined>;
    copy?: (method: string, body: unknown) => unknown | Promise<unknown>;
  } = {},
) {
  const current = options.current ?? review;
  const calls: { path: string; method: string; body: unknown }[] = [];
  const api = createApiClient(async (url, init) => {
    const path = String(url),
      method = init?.method ?? "GET",
      body = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ path, method, body });
    const override = await options.override?.(path, method, body);
    if (override) return override;
    if (path.endsWith("/me"))
      return Response.json(
        options.identity ?? {
          user: {
            id: actor.userId,
            clerkUserId: "user_synthetic_copy",
            email: null,
          },
          tenant: { id: actor.tenantId, name: "Synthetic tenant" },
          role: "standard_user",
        },
      );
    if (path.includes("/prospect-copies")) {
      const response = await options.copy?.(method, body);
      return response instanceof Response
        ? response
        : response === undefined
          ? Response.json({ message: "Unavailable" }, { status: 404 })
          : Response.json(response);
    }
    if (path.includes("business-development/prospects/"))
      return Response.json(current.prospect);
    if (path.includes("/clients/"))
      return Response.json({
        ...current.client,
        status: "active",
        profileStatus: "completed",
      });
    if (path.includes("attachments?"))
      return Response.json(options.files ?? [source]);
    throw new Error("Unexpected synthetic request");
  });
  return { api, calls };
}
export const copyCalls = (f: ReturnType<typeof fixture>) =>
  f.calls.filter((call) => call.path.includes("prospect-copies"));

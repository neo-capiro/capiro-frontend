import { createApiClient } from "../src/shared/portfolio/api/http";
import {
  fileDeletionCommandSchema,
  fileDeletionDigest,
  type FileDeletionAttempt,
} from "../src/features/portfolio/files/deletion-contract";
import {
  actor,
  id,
  timestamp,
  review as copyReview,
  source,
} from "./prospect-file-copy-fixtures";
export { actor, id, timestamp };
export const clientId = id(4);
export const file = {
  ...source,
  clientId,
  prospectId: null,
  fileName: "Synthetic private client document.txt",
};
export const review = {
  id: file.id,
  clientId,
  fileName: file.fileName,
  metadataRevision: file.metadataRevision,
};
export async function attempt(): Promise<FileDeletionAttempt> {
  const command = fileDeletionCommandSchema.parse({
    schemaVersion: 1,
    requestId: id(50),
    clientId,
    expectedRevision: 3,
    attachmentId: file.id,
  });
  return {
    tenantId: actor.tenantId,
    userId: actor.userId,
    command,
    payloadDigest: await fileDeletionDigest(actor, command),
    fileName: file.fileName,
  };
}
export function receiptFor(
  saved: FileDeletionAttempt,
  status: "pending" | "completed" = "completed",
) {
  return {
    schemaVersion: 1,
    operation: "delete_client_file",
    tenantId: actor.tenantId,
    actorUserId: actor.userId,
    requestId: saved.command.requestId,
    clientId,
    attachmentId: file.id,
    expectedRevision: 3,
    payloadDigest: saved.payloadDigest,
    status,
    createdAt: timestamp,
    completedAt: status === "completed" ? timestamp : null,
    result:
      status === "completed"
        ? {
            attachmentId: file.id,
            objectAbsent: true,
            indexedChunksAbsent: true,
          }
        : null,
  };
}
export function fixture(
  options: {
    files?: unknown;
    identity?: unknown;
    client?: unknown;
    override?: (
      path: string,
      method: string,
      body: unknown,
    ) => Response | undefined | Promise<Response | undefined>;
    receipt?: (method: string, body: unknown) => unknown | Promise<unknown>;
  } = {},
) {
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
          user: { id: actor.userId, email: null },
          tenant: { id: actor.tenantId, name: "Synthetic tenant" },
          role: "standard_user",
        },
      );
    if (path.includes("/clients/"))
      return Response.json(
        options.client ?? {
          ...copyReview.client,
          status: "active",
          profileStatus: "completed",
        },
      );
    if (path.includes("attachments?"))
      return Response.json(options.files ?? [file]);
    if (method === "DELETE" || path.includes("attachments/deletions/")) {
      const value = await options.receipt?.(method, body);
      return value instanceof Response
        ? value
        : value === undefined
          ? Response.json({ message: "Unavailable" }, { status: 404 })
          : Response.json(value);
    }
    throw new Error("Unexpected synthetic deletion request");
  });
  return { api, calls };
}
export const commandCalls = (f: ReturnType<typeof fixture>) =>
  f.calls.filter(
    (call) =>
      call.method === "DELETE" || call.path.includes("attachments/deletions/"),
  );

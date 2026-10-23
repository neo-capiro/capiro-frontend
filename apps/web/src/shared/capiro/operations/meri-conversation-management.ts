import { z } from "zod";
import { defineOperation } from "../contracts";

export const managementVersion = "meri.conversation-management.v1" as const;
const uuid = z.uuid().refine((value) => value === value.toLowerCase());
const instant = z.iso
  .datetime()
  .refine((value) => new Date(value).toISOString() === value);
const revision = z.string().regex(/^(0|[1-9][0-9]{0,17})$/);
const title = z
  .string()
  .min(1)
  .max(200)
  .refine((value) => value === value.trim());
const fields = {
  conversationId: uuid,
  title,
  status: z.enum(["active", "archived", "trashed"]),
  revision,
  updatedAt: instant,
  archivedAt: instant.nullable(),
  trashedAt: instant.nullable(),
  restoreUntil: instant.nullable(),
};
export const managedConversation = z
  .discriminatedUnion("scopeKind", [
    z.strictObject({
      ...fields,
      scopeKind: z.literal("general"),
      clientId: z.null(),
    }),
    z.strictObject({
      ...fields,
      scopeKind: z.literal("client"),
      clientId: uuid,
    }),
  ])
  .refine((row) =>
    row.status === "trashed"
      ? row.trashedAt !== null &&
        row.restoreUntil !== null &&
        Date.parse(row.restoreUntil) - Date.parse(row.trashedAt) ===
          30 * 86400000
      : row.trashedAt === null && row.restoreUntil === null,
  );
export type ManagedConversation = z.infer<typeof managedConversation>;
const identity = {
  version: z.literal(managementVersion),
  requestId: uuid,
  conversationId: uuid,
  expectedRevision: revision,
};
export const managementRequest = z.discriminatedUnion("operation", [
  z.strictObject({ ...identity, operation: z.literal("rename"), title }),
  z.strictObject({ ...identity, operation: z.literal("archive") }),
  z.strictObject({ ...identity, operation: z.literal("restore") }),
  z.strictObject({ ...identity, operation: z.literal("trash") }),
]);
export type ManagementRequest = z.infer<typeof managementRequest>;
const before = z
  .strictObject({ updatedAt: instant, conversationId: uuid })
  .nullable();
export const managedListRequest = z.strictObject({
  version: z.literal(managementVersion),
  status: fields.status,
  title: z.string().trim().max(200),
  before,
});
export const managedListReceipt = z.strictObject({
  version: z.literal(managementVersion),
  conversations: z.array(managedConversation).max(20),
  nextBefore: before,
  managementAvailable: z.boolean(),
});
const managementReceipt = z.strictObject({
  version: z.literal(managementVersion),
  requestId: uuid,
  conversation: managedConversation,
});
const source =
  "capiro-backend Wave2 conversation-management source; trusted runtime composition and gateway receiving held pending qualification";
export const managedListKey = "meri.conversation.management.list.v1";
export const managedChangeKey = "meri.conversation.management.change.v1";
export const managedConversationOperations = {
  [managedListKey]: defineOperation({
    service: "core",
    method: "POST",
    path: "/clio/conversations/management/v1/list",
    authentication: "clerk-session",
    request: z.strictObject({ body: managedListRequest }),
    response: managedListReceipt,
    source,
    requestLimitBytes: 2048,
  }),
  [managedChangeKey]: defineOperation({
    service: "core",
    method: "POST",
    path: "/clio/conversations/management/v1/change",
    authentication: "clerk-session",
    request: z.strictObject({ body: managementRequest }),
    response: managementReceipt,
    source,
    requestLimitBytes: 2048,
  }),
};
export function requireManagementReceipt(
  value: unknown,
  request: ManagementRequest,
  previous: ManagedConversation,
) {
  const result = managementReceipt.parse(value);
  const row = result.conversation;
  if (
    result.requestId !== request.requestId ||
    row.conversationId !== request.conversationId ||
    row.scopeKind !== previous.scopeKind ||
    row.clientId !== previous.clientId ||
    BigInt(row.revision) !== BigInt(request.expectedRevision) + 1n ||
    row.status !==
      (request.operation === "rename"
        ? previous.status
        : request.operation === "restore"
          ? "active"
          : request.operation === "archive"
            ? "archived"
            : "trashed") ||
    row.title !==
      (request.operation === "rename" ? request.title : previous.title)
  )
    throw new Error("Chat change receipt did not match the request.");
  return result;
}

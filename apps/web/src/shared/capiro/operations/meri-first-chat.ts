import { z } from "zod";
import { defineOperation } from "../contracts";

const canonicalUuid = z
  .uuid()
  .refine((value) => value === value.toLowerCase(), "Use a canonical UUID.");

export const firstChatCoreRequest = z.strictObject({
  schemaVersion: z.literal(1),
  requestId: canonicalUuid,
  clientId: canonicalUuid,
});

export const firstChatCoreReceipt = z.strictObject({
  schemaVersion: z.literal(1),
  requestId: canonicalUuid,
  conversationId: canonicalUuid,
  tenantId: canonicalUuid,
  actorId: canonicalUuid,
  clientId: canonicalUuid,
});

export type FirstChatCoreRequest = z.infer<typeof firstChatCoreRequest>;
export type FirstChatCoreReceipt = z.infer<typeof firstChatCoreReceipt>;

export const firstChatCoreScope = firstChatCoreReceipt.omit({
  schemaVersion: true,
  requestId: true,
  conversationId: true,
});
const expectedReceipt = firstChatCoreScope.extend({
  requestId: canonicalUuid,
});
export type FirstChatCoreExpected = z.infer<typeof expectedReceipt>;

export class FirstChatCoreReceiptError extends Error {
  constructor() {
    super("The conversation response does not match the current request.");
    this.name = "FirstChatCoreReceiptError";
  }
}

/** Require this after the gateway response, before confirming an intent or issuing a Meri session. Browser data is only a hint. */
export function requireFirstChatCoreReceipt(
  value: unknown,
  expected: FirstChatCoreExpected,
): FirstChatCoreReceipt {
  const receipt = firstChatCoreReceipt.safeParse(value);
  const scope = expectedReceipt.safeParse(expected);
  if (!receipt.success || !scope.success) throw new FirstChatCoreReceiptError();
  if (
    receipt.data.requestId !== scope.data.requestId ||
    receipt.data.tenantId !== scope.data.tenantId ||
    receipt.data.actorId !== scope.data.actorId ||
    receipt.data.clientId !== scope.data.clientId
  )
    throw new FirstChatCoreReceiptError();
  return receipt.data;
}

export const firstChatCoreOperationKey = "meri.conversation.bootstrap";

/** Opt-in Core operation; route policy holds it until the reviewed deployment bindings are set. */
export const firstChatCoreOperation = defineOperation({
  service: "core",
  method: "POST",
  path: "/clio/conversations/bootstrap",
  authentication: "clerk-session",
  request: z.strictObject({ body: firstChatCoreRequest }),
  response: firstChatCoreReceipt,
  source:
    "capiro-backend@c64f0005cf14d69683aabafa11def4964d766832 apps/api/src/meri/{meri.controller,meri.service}.ts; draft PR43 source, deployment pending",
  requestLimitBytes: 1024,
});

/** Server-only narrowing: the preview admits only Meri's configured selected client. */
export function firstChatCoreOperationForClient(clientId: string) {
  return {
    ...firstChatCoreOperation,
    request: firstChatCoreOperation.request.refine(
      ({ body }) => body.clientId === clientId,
    ),
  };
}

/** Explicit immutable scope. Legacy null-client records are never General chats. */
export const conversationBinding = z.discriminatedUnion("scopeKind", [
  z.strictObject({ scopeKind: z.literal("client"), clientId: canonicalUuid }),
  z.strictObject({ scopeKind: z.literal("general"), clientId: z.null() }),
]);
const bootstrapV2Identity = {
  schemaVersion: z.literal(2),
  requestId: canonicalUuid,
};
export const firstChatV2Request = z.discriminatedUnion("scopeKind", [
  z.strictObject({
    ...bootstrapV2Identity,
    scopeKind: z.literal("client"),
    clientId: canonicalUuid,
  }),
  z.strictObject({
    ...bootstrapV2Identity,
    scopeKind: z.literal("general"),
    clientId: z.null(),
  }),
]);
const receiptIdentity = {
  ...bootstrapV2Identity,
  conversationId: canonicalUuid,
  tenantId: canonicalUuid,
  actorId: canonicalUuid,
};
export const firstChatV2Receipt = z.discriminatedUnion("scopeKind", [
  z.strictObject({
    ...receiptIdentity,
    scopeKind: z.literal("client"),
    clientId: canonicalUuid,
  }),
  z.strictObject({
    ...receiptIdentity,
    scopeKind: z.literal("general"),
    clientId: z.null(),
  }),
]);
export type FirstChatV2Request = z.infer<typeof firstChatV2Request>;
export const firstChatV2OperationKey = "meri.conversation.bootstrap.v2";
export const firstChatV2Operation = defineOperation({
  ...firstChatCoreOperation,
  request: z.strictObject({ body: firstChatV2Request }),
  response: firstChatV2Receipt,
  source:
    "Core Wave2 explicit General binding; source only, reviewed gateway activation required",
});

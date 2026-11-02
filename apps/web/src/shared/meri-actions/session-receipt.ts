import { z } from "zod";

// PR47 session/owner.mjs@9ec0c2970949f1c66eb790aa53c2170a00c8a581.
// A server-selected receipt, never browser authority. This bootstrap contract
// is separate from the four public action-application response envelopes.
export const actionUuid = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
export const actionContextSchema = z.strictObject({
  tenantId: z.string().min(1).max(256),
  actorId: z.string().min(1).max(256),
  conversationId: actionUuid,
  runId: actionUuid,
  selectedClientId: actionUuid,
});
const receipt = z.strictObject({
  credential: z.string().regex(/^action_session_[A-Za-z0-9_-]{43}$/),
  expiresAtMs: z.number().int().safe().positive(),
  context: actionContextSchema,
});
export type ActionSessionReceipt = Readonly<z.infer<typeof receipt>>;
export type ActionContext = Readonly<ActionSessionReceipt["context"]>;

/**
 * This client never holds a session longer than Meri's own cap (sessions.maxTtlMs, 300 s). Meri's receipt expiry is the
 * minimum of the Clerk token's exp, Core's receipt and that cap, all on server clocks, so with the 300 s identity token
 * it sits at this bound to within the issuance latency: a browser clock a second or two behind would otherwise refuse
 * every receipt. The bound is applied, not refused; the server-side expiry stays wherever Meri set it.
 */
export const SESSION_RECEIPT_MAX_TTL_MS = 300_000;

export function receiveSessionReceipt(
  text: string,
  now: number,
): ActionSessionReceipt {
  const value = receipt.parse(JSON.parse(text));
  if (
    !Number.isSafeInteger(now) ||
    now < 0 ||
    value.expiresAtMs <= now ||
    new TextEncoder().encode(JSON.stringify(value)).byteLength > 4096
  )
    throw new Error("Action session is unavailable");
  return Object.freeze({
    ...value,
    expiresAtMs: Math.min(value.expiresAtMs, now + SESSION_RECEIPT_MAX_TTL_MS),
    context: Object.freeze(value.context),
  });
}

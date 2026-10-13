import { z } from "zod";

// PR47 session/owner.mjs@9ec0c2970949f1c66eb790aa53c2170a00c8a581.
// A server-selected receipt, never browser authority. This bootstrap contract
// is separate from the four public action-application response envelopes.
const context = z.strictObject({
  tenantId: z.string().min(1),
  actorId: z.string().min(1),
  conversationId: z.uuid(),
  runId: z.uuid(),
  selectedClientId: z.uuid(),
});
const receipt = z.strictObject({
  credential: z.string().regex(/^action_session_[A-Za-z0-9_-]{43}$/),
  expiresAtMs: z.number().int().safe().positive(),
  context,
});
export type ActionSessionReceipt = Readonly<z.infer<typeof receipt>>;
export type ActionContext = Readonly<ActionSessionReceipt["context"]>;

export function receiveSessionReceipt(
  text: string,
  now: number,
): ActionSessionReceipt {
  const value = receipt.parse(JSON.parse(text));
  if (
    !Number.isSafeInteger(now) ||
    value.expiresAtMs <= now ||
    value.expiresAtMs > now + 300_000
  )
    throw new Error("Action session is unavailable");
  return Object.freeze({ ...value, context: Object.freeze(value.context) });
}

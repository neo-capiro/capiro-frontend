import { z } from "zod";
import { boundedJsonText, withActionDeadline } from "./bounded-json";
import { receiveSessionReceipt } from "./session-receipt";

/** Hints constrain a server-selected context; they never establish one. */
export const actionSessionHints = z.strictObject({
  conversationId: z.uuid().optional(),
  runId: z.uuid().optional(),
  clientId: z.uuid().optional(),
});
export type ActionSessionHints = z.infer<typeof actionSessionHints>;
export async function bootstrapActionSession(
  hints: ActionSessionHints,
  lifetime: AbortSignal,
  fetcher: typeof fetch = fetch,
  now: () => number = Date.now,
) {
  const captured = actionSessionHints.parse(hints);
  return withActionDeadline([lifetime], async (signal) => {
    const response = await fetcher("/api/action-followthrough/session", {
      method: "POST",
      body: JSON.stringify(captured),
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      cache: "no-store",
      redirect: "error",
      signal,
    });
    const text = await boundedJsonText(response, signal, 4096);
    if (response.status !== 200) throw new Error("Action session unavailable");
    const receipt = receiveSessionReceipt(text, now());
    if (
      (captured.clientId &&
        receipt.context.selectedClientId !== captured.clientId) ||
      (captured.conversationId &&
        receipt.context.conversationId !== captured.conversationId) ||
      (captured.runId && receipt.context.runId !== captured.runId)
    )
      throw new Error("Action context mismatch");
    signal.throwIfAborted();
    return receipt;
  });
}

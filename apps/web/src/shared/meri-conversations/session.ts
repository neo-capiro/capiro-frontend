import { z } from "zod";
import {
  receiveConversationSessionReceipt,
  type ConversationSessionReceipt,
} from "@capiro/meri-contracts/conversation-session";
import {
  boundedJsonText,
  withActionDeadline,
} from "../meri-actions/bounded-json";
import { actionUuid } from "../meri-actions/session-receipt";
import { ActionSessionUnavailable } from "../meri-actions/session-bootstrap";
export type ConversationContext = Readonly<
  ConversationSessionReceipt["context"]
>;
export const conversationSessionHints = z
  .strictObject({
    conversationId: actionUuid.optional(),
    runId: actionUuid.optional(),
    clientId: actionUuid.nullable(),
  })
  .refine(
    (hints) => hints.clientId !== null || hints.conversationId !== undefined,
  );
export type ConversationSessionHints = z.infer<typeof conversationSessionHints>;

/** Explicit Core-resolved General conversation required; nullable response alone is never eligibility. */
export async function bootstrapConversationSession(
  hints: ConversationSessionHints,
  account: { tenantId: string; actorId: string },
  lifetime: AbortSignal,
  fetcher: typeof fetch = fetch,
  now = Date.now,
  purpose: "conversation" | "browser" = "conversation",
) {
  const captured = conversationSessionHints.parse(hints);
  if (purpose === "browser" && (!captured.conversationId || !captured.runId))
    throw new Error("Browser access requires an existing exact run");
  return withActionDeadline([lifetime], async (signal) => {
    const response = await fetcher(
      `/api/action-followthrough/${purpose === "browser" ? "browser-session" : "session"}`,
      {
        method: "POST",
        body: JSON.stringify(captured),
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        redirect: "error",
        signal,
      },
    );
    const text = await boundedJsonText(response, signal, 4096);
    if (response.status !== 200)
      throw new ActionSessionUnavailable(response.status);
    const expected = {
      ...account,
      selectedClientId: captured.clientId,
      scopeKind: captured.clientId === null ? "general" : "client",
      ...(captured.conversationId
        ? { conversationId: captured.conversationId }
        : {}),
      ...(captured.runId ? { runId: captured.runId } : {}),
    };
    const encode = (value: string) => new TextEncoder().encode(value);
    const result = receiveConversationSessionReceipt(
      encode(text),
      encode(JSON.stringify(expected)),
      now(),
    );
    if (
      purpose === "browser" &&
      (result.initialRunRebind || result.context.runId !== captured.runId)
    )
      throw new Error("Browser session cannot rebind a run");
    signal.throwIfAborted();
    return result;
  });
}

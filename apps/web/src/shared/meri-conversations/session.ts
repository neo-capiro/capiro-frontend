import { z } from "zod";
import {
  receiveConversationSessionReceipt,
  receiveConversationSessionExpectedContext,
  type ConversationSessionReceipt,
  type ResearchPortfolioCapture,
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
const legacySessionHints = z
  .strictObject({
    conversationId: actionUuid.optional(),
    runId: actionUuid.optional(),
    clientId: actionUuid.nullable(),
  })
  .refine(
    (hints) => hints.clientId !== null || hints.conversationId !== undefined,
  );
const researchSessionSelector = z.strictObject({
  conversationId: actionUuid,
  runId: actionUuid.optional(),
  clientId: z.null(),
  scopeKind: z.literal("research_portfolio"),
});
export const conversationSessionSelector = z.union([
  legacySessionHints,
  researchSessionSelector,
]);
export const conversationSessionHints = z.union([
  legacySessionHints,
  researchSessionSelector.extend({
    // The public expected-context receiver below owns capture validation before dispatch.
    scope: z.custom<ResearchPortfolioCapture>((value) => value !== undefined),
  }),
]);
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
  const encode = (value: string) => new TextEncoder().encode(value);
  const expected = receiveConversationSessionExpectedContext(
    encode(
      JSON.stringify({
        ...account,
        selectedClientId: captured.clientId,
        ...("scopeKind" in captured
          ? { scopeKind: captured.scopeKind, scope: captured.scope }
          : { scopeKind: captured.clientId === null ? "general" : "client" }),
        ...(captured.conversationId
          ? { conversationId: captured.conversationId }
          : {}),
        ...(captured.runId ? { runId: captured.runId } : {}),
      }),
    ),
  );
  // The capture constrains receiving locally; issuance resolves it again from Core.
  const selector =
    "scopeKind" in captured
      ? {
          clientId: captured.clientId,
          conversationId: captured.conversationId,
          ...(captured.runId ? { runId: captured.runId } : {}),
          scopeKind: captured.scopeKind,
        }
      : captured;
  return withActionDeadline([lifetime], async (signal) => {
    const response = await fetcher(
      `/api/action-followthrough/${purpose === "browser" ? "browser-session" : "session"}`,
      {
        method: "POST",
        body: JSON.stringify(selector),
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

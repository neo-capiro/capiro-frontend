import { auth } from "@clerk/nextjs/server";
import { previewBackendRejection } from "../../../../../shared/preview/backend-policy.server";
import { readConversationConfig } from "../../../../../shared/meri-conversations/config";
import { proxyConversationNativeRead } from "../../../../../shared/meri-conversations/history-proxy";
import { readIntentsConfig } from "../../../../../shared/meri-intents/config";
import {
  inboxCountReadOperation,
  inboxReadOperation,
} from "../../../../../shared/meri-intents/inbox";
import { proxyIntentsRequest } from "../../../../../shared/meri-intents/proxy";

// Meri's membership-gated product routes verify the native Clerk session token through Core,
// the same bearer the conversation history, settings and memory routes forward. The capiro
// template token is Core's own API credential and is refused there.
async function nativeToken() {
  const session = await auth();
  return session.userId ? session.getToken() : null;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ operation: string }> },
) {
  // Held in the read-only preview like documents, settings and task commands: no activation path.
  const held = previewBackendRejection(process.env);
  if (held) return held;
  const { operation } = await context.params;
  // The actor-wide inbox is a current native-auth read (no conversation session); Meri's intents
  // family answers 503 INTENTS_UNAVAILABLE itself when it is not composed.
  if (operation === "inbox")
    return proxyConversationNativeRead(
      request,
      inboxReadOperation,
      readConversationConfig(process.env),
      nativeToken,
    );
  // The approvals badge reads its count through this same native-auth family. Without this
  // branch the read fell through to the list/decide adapter below, which refuses any other
  // operation as unknown (404 FRONTEND_INTENTS_UNAVAILABLE) — so the count never loaded.
  if (operation === "inbox-count")
    return proxyConversationNativeRead(
      request,
      inboxCountReadOperation,
      readConversationConfig(process.env),
      nativeToken,
    );
  return proxyIntentsRequest(
    request,
    operation,
    readIntentsConfig(process.env),
    nativeToken,
  );
}

import { auth } from "@clerk/nextjs/server";
import { previewBackendRejection } from "../../../../shared/preview/backend-policy.server";
import { readConversationConfig } from "../../../../shared/meri-conversations/config";
import { proxyConversationRequest } from "../../../../shared/meri-conversations/proxy";
import {
  conversationHistoryRoute,
  proxyConversationHistory,
} from "../../../../shared/meri-conversations/history-proxy";

async function receive(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const held = previewBackendRejection(process.env, request);
  if (held) return held;
  const { path } = await context.params;
  const nativeRoute = conversationHistoryRoute(path.join("/"));
  const nativeToken = async () => {
    const session = await auth();
    return session.userId ? session.getToken() : null;
  };
  if (nativeRoute)
    return proxyConversationHistory(
      request,
      nativeRoute,
      readConversationConfig(process.env),
      nativeToken,
    );
  return proxyConversationRequest(
    request,
    path.join("/"),
    readConversationConfig(process.env),
    nativeToken,
  );
}

export {
  receive as POST,
  receive as GET,
  receive as HEAD,
  receive as OPTIONS,
  receive as PUT,
  receive as PATCH,
  receive as DELETE,
};

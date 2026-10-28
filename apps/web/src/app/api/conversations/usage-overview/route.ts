import { auth } from "@clerk/nextjs/server";
import { previewBackendRejection } from "../../../../shared/preview/backend-policy.server";
import { readConversationConfig } from "../../../../shared/meri-conversations/config";
import { proxyConversationNativeRead } from "../../../../shared/meri-conversations/history-proxy";
import { usageOverviewOperation } from "../../../../shared/meri-usage/operations";

async function receive(request: Request) {
  const held = previewBackendRejection(process.env, request);
  if (held) return held;
  return proxyConversationNativeRead(
    request,
    usageOverviewOperation,
    readConversationConfig(process.env),
    async () => {
      const session = await auth();
      return session.userId ? session.getToken() : null;
    },
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

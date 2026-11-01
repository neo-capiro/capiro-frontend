import { auth } from "@clerk/nextjs/server";
import { previewBackendRejection } from "../../../../shared/preview/backend-policy.server";
import { readConversationConfig } from "../../../../shared/meri-conversations/config";
import { proxyConversationNativeRead } from "../../../../shared/meri-conversations/history-proxy";
import { dataAccessReadOperation } from "../../../../shared/meri-data-access/read";

/** Same-origin adapter only: Meri's membership gate and its data-access family decide what is served. */
async function receive(request: Request) {
  const held = previewBackendRejection(process.env, request);
  if (held) return held;
  return proxyConversationNativeRead(
    request,
    dataAccessReadOperation,
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

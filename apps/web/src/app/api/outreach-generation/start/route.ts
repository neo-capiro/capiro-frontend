import { auth } from "@clerk/nextjs/server";
import { previewBackendRejection } from "../../../../shared/preview/backend-policy.server";
import { readConversationConfig } from "../../../../shared/meri-conversations/config";
import { proxyConversationNativeRead } from "../../../../shared/meri-conversations/history-proxy";
import { outreachStartOperation } from "../../../../shared/meri-conversations/outreach-start";
export async function POST(request: Request) {
  const held = previewBackendRejection(process.env, request);
  if (held) return held;
  return proxyConversationNativeRead(
    request,
    outreachStartOperation,
    readConversationConfig(process.env),
    async () => {
      const session = await auth();
      return session.userId ? session.getToken() : null;
    },
    fetch,
    true,
  );
}

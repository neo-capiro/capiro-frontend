import { auth } from "@clerk/nextjs/server";
import { previewBackendRejection } from "../../../../shared/preview/backend-policy.server";
import { readConversationConfig } from "../../../../shared/meri-conversations/config";
import { proxyConversationRequest } from "../../../../shared/meri-conversations/proxy";

async function receive(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const held = previewBackendRejection(process.env);
  if (held) return held;
  const { path } = await context.params;
  return proxyConversationRequest(
    request,
    path.join("/"),
    readConversationConfig(process.env),
    async () => {
      const session = await auth();
      return session.userId ? session.getToken({ template: "capiro" }) : null;
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

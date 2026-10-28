import { auth } from "@clerk/nextjs/server";
import { previewBackendRejection } from "../../../../../shared/preview/backend-policy.server";
import { readConversationConfig } from "../../../../../shared/meri-conversations/config";
import { proxyConversationNativeRead } from "../../../../../shared/meri-conversations/history-proxy";
import { runReadOperation } from "../../../../../shared/meri-runs/operations";

async function receive(
  request: Request,
  context: { params: Promise<{ operation: string }> },
) {
  const held = previewBackendRejection(process.env, request);
  if (held) return held;
  const { operation } = await context.params;
  if (operation !== "list" && operation !== "detail")
    return Response.json(
      { error: { code: "ROUTE_NOT_FOUND" } },
      { status: 404, headers: { "Cache-Control": "private, no-store" } },
    );
  return proxyConversationNativeRead(
    request,
    runReadOperation(operation),
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

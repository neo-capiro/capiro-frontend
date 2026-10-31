import { auth } from "@clerk/nextjs/server";
import { previewBackendRejection } from "../../../../../../../shared/preview/backend-policy.server";
import { proxyOwnerHistory } from "../../../../../../../features/meri/memory-review/owner-history-proxy.server";
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const held = previewBackendRejection(process.env, request);
  if (held) return held;
  const { id } = await context.params;
  return proxyOwnerHistory(
    request,
    { kind: "item", id },
    "evidence",
    process.env,
    async () => {
      const session = await auth();
      return session.userId ? session.getToken() : null;
    },
  );
}

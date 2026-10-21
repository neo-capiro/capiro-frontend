import { auth } from "@clerk/nextjs/server";
import { previewBackendRejection } from "../../../../../shared/preview/backend-policy.server";
import { proxyOwnerMemoryInbox } from "../../../../../features/meri/memory-review/owner-inbox-proxy.server";

export async function GET(request: Request) {
  const held = previewBackendRejection(process.env, request);
  if (held) return held;
  return proxyOwnerMemoryInbox(
    request,
    { kind: "page" },
    process.env,
    async () => {
      const session = await auth();
      return session.userId ? session.getToken() : null;
    },
  );
}

import { auth } from "@clerk/nextjs/server";
import { previewBackendRejection } from "../../../../../shared/preview/backend-policy.server";
import { proxyOwnerMemoryReview } from "../../../../../features/meri/memory-review/owner-review-proxy.server";

export async function GET(request: Request) {
  const held = previewBackendRejection(process.env, request);
  if (held) return held;
  return proxyOwnerMemoryReview(
    request,
    { kind: "list" },
    process.env,
    async () => {
      const session = await auth();
      return session.userId ? session.getToken() : null;
    },
  );
}

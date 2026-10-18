import { auth } from "@clerk/nextjs/server";
import { previewBackendRejection } from "../../../../../../../shared/preview/backend-policy.server";
import { proxyOwnerMemoryReview } from "../../../../../../../features/meri/memory-review/owner-review-proxy.server";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const held = previewBackendRejection(process.env, request);
  if (held) return held;
  const { id } = await context.params;
  return proxyOwnerMemoryReview(
    request,
    { kind: "version-decision", id },
    process.env,
    async () => {
      const session = await auth();
      return session.userId ? session.getToken() : null;
    },
  );
}

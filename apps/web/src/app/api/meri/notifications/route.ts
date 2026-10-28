import { auth } from "@clerk/nextjs/server";
import { previewBackendRejection } from "../../../../shared/preview/backend-policy.server";
import { proxyMemoryNotifications } from "../../../../shared/meri-notifications/memory-proxy.server";

/**
 * One closed read adapter for the Updates surface: the browser supplies only an
 * opaque cursor to its own origin, and Core remains the authority for the
 * participant-scoped notification rows this route returns.
 */
export async function GET(request: Request) {
  const held = previewBackendRejection(process.env, request);
  if (held) return held;
  return proxyMemoryNotifications(request, process.env, async () => {
    const session = await auth();
    return session.userId ? session.getToken() : null;
  });
}

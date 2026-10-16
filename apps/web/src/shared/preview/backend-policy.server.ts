import { previewReadTarget } from "./read-config.server";
import { previewReadRoute } from "./read-route.server";
import { previewFirstChatWriteTarget } from "./first-chat-write.server";

/** Deployment containment, not authorization. Server configuration alone owns opt-in. */
export function previewBackendRejection(
  env: Record<string, string | undefined>,
  request?: Request,
): Response | null {
  const mode = env.CAPIRO_PREVIEW_READ_ONLY;
  // Preserve the ordinary app; malformed configured preview values fail closed.
  if (mode === undefined || mode === "false") return null;
  if (request && previewReadTarget(env, request) && previewReadRoute(request))
    return null;
  if (request && previewFirstChatWriteTarget(env, request)) return null;
  return previewHeldResponse();
}

export function previewHeldResponse(): Response {
  return Response.json(
    {
      error: { code: "PREVIEW_BACKEND_HELD" },
      message: "Backend access is held for read-only preview review.",
    },
    {
      status: 503,
      headers: {
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}

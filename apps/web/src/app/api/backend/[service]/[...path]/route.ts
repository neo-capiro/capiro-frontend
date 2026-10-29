import { auth } from "@clerk/nextjs/server";
import { previewBackendRejection } from "@/shared/preview/backend-policy.server";
import { proxyPreviewRead } from "@/shared/preview/read-proxy.server";
import { proxyPreviewNotetakerWrite } from "@/shared/preview/notetaker-write-proxy.server";
import { previewNotetakerWriteRoute } from "@/shared/preview/notetaker-write.server";
import { readConfig } from "@/shared/portfolio/config/config";
import { proxyRequest } from "@/shared/portfolio/api/proxy";
type Context = { params: Promise<{ service: string; path: string[] }> };
async function handle(request: Request, context: Context) {
  const held = previewBackendRejection(process.env, request);
  if (held) return held;
  const { service, path } = await context.params;
  const getToken = async (authentication?: "clerk-session") => {
    const session = await auth();
    if (!session.userId) return null;
    return authentication === "clerk-session"
      ? session.getToken()
      : session.getToken({ template: "capiro" });
  };
  if (process.env.CAPIRO_PREVIEW_READ_ONLY === "true") {
    // The note-taker preview writes go to the same preview backend as preview reads,
    // authorized by the signed-in user's own token.
    if (previewNotetakerWriteRoute(request))
      return proxyPreviewNotetakerWrite(request, process.env, async () => {
        const session = await auth();
        return session.userId ? session.getToken() : null;
      });
    return proxyPreviewRead(
      request,
      process.env,
      `/api/backend/${service}/${path.join("/")}`,
      async () => {
        const session = await auth();
        return session.userId ? session.getToken() : null;
      },
    );
  }
  return proxyRequest(
    request,
    service,
    path,
    readConfig(process.env),
    getToken,
  );
}
export {
  handle as GET,
  handle as POST,
  handle as PUT,
  handle as PATCH,
  handle as DELETE,
};

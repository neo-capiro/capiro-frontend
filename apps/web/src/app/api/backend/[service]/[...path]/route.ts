import { auth } from "@clerk/nextjs/server";
import { previewBackendRejection } from "@/shared/preview/backend-policy.server";
import { proxyPreviewRead } from "@/shared/preview/read-proxy.server";
import { readConfig } from "@/shared/portfolio/config/config";
import { proxyRequest } from "@/shared/portfolio/api/proxy";
type Context = { params: Promise<{ service: string; path: string[] }> };
async function handle(request: Request, context: Context) {
  const held = previewBackendRejection(process.env, request);
  if (held) return held;
  const { service, path } = await context.params;
  const getToken = async () => {
    const session = await auth();
    return session.userId ? session.getToken({ template: "capiro" }) : null;
  };
  if (process.env.CAPIRO_PREVIEW_READ_ONLY === "true")
    return proxyPreviewRead(
      request,
      process.env,
      `/api/backend/${service}/${path.join("/")}`,
      async () => {
        const session = await auth();
        return session.userId ? session.getToken() : null;
      },
    );
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

import { auth } from "@clerk/nextjs/server";
import { previewBackendRejection } from "../../../../../shared/preview/backend-policy.server";
import {
  proxyBrowserViewerRequest,
  readBrowserViewerConfig,
} from "../../../../../shared/meri-browser/proxy";

export async function POST(
  request: Request,
  context: { params: Promise<{ operation: string }> },
) {
  const held = previewBackendRejection(process.env);
  if (held) return held;
  const { operation } = await context.params;
  return proxyBrowserViewerRequest(
    request,
    operation,
    readBrowserViewerConfig(process.env),
    async () => {
      const session = await auth();
      return session.userId ? session.getToken({ template: "capiro" }) : null;
    },
  );
}

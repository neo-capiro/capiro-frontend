import { auth } from "@clerk/nextjs/server";
import { previewBackendRejection } from "../../../../../shared/preview/backend-policy.server";
import { readDocumentConfig } from "../../../../../shared/meri-documents/config";
import { proxyDocumentLinkRequest } from "../../../../../shared/meri-documents/link-proxy";

export async function POST(
  request: Request,
  context: { params: Promise<{ action: string }> },
) {
  const held = previewBackendRejection(process.env);
  if (held) return held;
  const { action } = await context.params;
  return proxyDocumentLinkRequest(
    request,
    action,
    readDocumentConfig(process.env),
    async () => {
      const session = await auth();
      return session.userId ? session.getToken({ template: "capiro" }) : null;
    },
  );
}

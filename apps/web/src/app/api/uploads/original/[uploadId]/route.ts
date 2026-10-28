import { auth } from "@clerk/nextjs/server";
import { previewBackendRejection } from "../../../../../shared/preview/backend-policy.server";
import { readUploadConfig } from "../../../../../shared/meri-uploads/config";
import { proxyUploadOriginal } from "../../../../../shared/meri-uploads/proxy";

export async function PUT(
  request: Request,
  context: { params: Promise<{ uploadId: string }> },
) {
  const held = previewBackendRejection(process.env);
  if (held) return held;
  const { uploadId } = await context.params;
  return proxyUploadOriginal(
    request,
    uploadId,
    readUploadConfig(process.env),
    async () => {
      const session = await auth();
      return session.userId ? session.getToken({ template: "capiro" }) : null;
    },
  );
}

import { auth } from "@clerk/nextjs/server";
import { previewBackendRejection } from "../../../../../shared/preview/backend-policy.server";
import { readOfficeConfig } from "../../../../../shared/meri-office/config";
import { proxyOfficeRequest } from "../../../../../shared/meri-office/proxy";

export async function POST(
  request: Request,
  context: { params: Promise<{ operation: string }> },
) {
  const held = previewBackendRejection(process.env);
  if (held) return held;
  const { operation } = await context.params;
  return proxyOfficeRequest(
    request,
    operation,
    readOfficeConfig(process.env),
    async () => {
      const session = await auth();
      return session.userId ? session.getToken({ template: "capiro" }) : null;
    },
  );
}

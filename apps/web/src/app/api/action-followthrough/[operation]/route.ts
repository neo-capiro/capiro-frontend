import { auth } from "@clerk/nextjs/server";
import { previewBackendRejection } from "../../../../shared/preview/backend-policy.server";
import { readOpaqueSessionConfig } from "../../../../shared/meri-actions/connection-config";
import { readActionConfig } from "../../../../shared/meri-actions/config";
import { proxyActionRequest } from "../../../../shared/meri-actions/proxy";

export async function POST(
  request: Request,
  context: { params: Promise<{ operation: string }> },
) {
  const held = previewBackendRejection(process.env);
  if (held) return held;
  const { operation } = await context.params;
  return proxyActionRequest(
    request,
    operation,
    operation === "session"
      ? readOpaqueSessionConfig(process.env)
      : readActionConfig(process.env),
    async () => {
      const session = await auth();
      return session.userId ? session.getToken({ template: "capiro" }) : null;
    },
  );
}

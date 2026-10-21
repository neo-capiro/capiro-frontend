import { auth } from "@clerk/nextjs/server";
import { previewBackendRejection } from "../../../../../shared/preview/backend-policy.server";
import { readIntentsConfig } from "../../../../../shared/meri-intents/config";
import { proxyIntentsRequest } from "../../../../../shared/meri-intents/proxy";

export async function POST(
  request: Request,
  context: { params: Promise<{ operation: string }> },
) {
  // Held in the read-only preview like documents, settings and task commands: no activation path.
  const held = previewBackendRejection(process.env);
  if (held) return held;
  const { operation } = await context.params;
  return proxyIntentsRequest(
    request,
    operation,
    readIntentsConfig(process.env),
    async () => {
      const session = await auth();
      return session.userId ? session.getToken({ template: "capiro" }) : null;
    },
  );
}

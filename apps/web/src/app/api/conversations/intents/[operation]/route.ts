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
      // Meri's membership-gated product routes verify the native Clerk session token through Core,
      // the same bearer the conversation history, settings and memory routes forward. The capiro
      // template token is Core's own API credential and is refused there.
      return session.userId ? session.getToken() : null;
    },
  );
}

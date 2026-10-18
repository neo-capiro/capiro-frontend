import { auth } from "@clerk/nextjs/server";
import { previewBackendRejection } from "../../../../shared/preview/backend-policy.server";
import { readTaskCommandConfig } from "../../../../shared/meri-task-commands/config";
import { proxyTaskCommandRequest } from "../../../../shared/meri-task-commands/proxy";

export async function POST(
  request: Request,
  context: { params: Promise<{ operation: string }> },
) {
  // Held in the read-only preview like documents and settings: no activation path.
  const held = previewBackendRejection(process.env);
  if (held) return held;
  const { operation } = await context.params;
  return proxyTaskCommandRequest(
    request,
    operation,
    readTaskCommandConfig(process.env),
    async () => {
      const session = await auth();
      return session.userId ? session.getToken({ template: "capiro" }) : null;
    },
  );
}

import { auth } from "@clerk/nextjs/server";
import { previewBackendRejection } from "../../../../shared/preview/backend-policy.server";
import {
  readMeriConnectionConfig,
  readOpaqueSessionConfig,
} from "../../../../shared/meri-actions/connection-config";
import { readActionConfig } from "../../../../shared/meri-actions/config";
import { proxyActionRequest } from "../../../../shared/meri-actions/proxy";
import { meriIdentityToken } from "../../../../shared/meri-actions/identity-token.server";
import { routineRoute } from "../../../../shared/meri-routines/routes";

export async function POST(
  request: Request,
  context: { params: Promise<{ operation: string }> },
) {
  const held = previewBackendRejection(process.env, request);
  if (held) return held;
  const { operation } = await context.params;
  const connection = readMeriConnectionConfig(process.env);
  return proxyActionRequest(
    request,
    operation,
    operation === "browser-session" ||
      operation === "objective-start" ||
      operation === "routine-session" ||
      routineRoute(operation)
      ? {
          enabled: connection.conversationEnabled,
          baseUrl: connection.baseUrl,
          requestOrigin: connection.requestOrigin,
        }
      : operation === "session"
        ? readOpaqueSessionConfig(process.env)
        : readActionConfig(process.env),
    async () => {
      const session = await auth();
      return session.userId
        ? operation === "session" ||
          operation === "browser-session" ||
          operation === "objective-start" ||
          operation === "routine-session"
          ? meriIdentityToken(session.sessionId, () => session.getToken())
          : session.getToken({ template: "capiro" })
        : null;
    },
  );
}

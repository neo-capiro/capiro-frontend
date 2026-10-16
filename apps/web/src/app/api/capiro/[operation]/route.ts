import { auth } from "@clerk/nextjs/server";
import {
  previewBackendRejection,
  previewHeldResponse,
} from "../../../../shared/preview/backend-policy.server";
import { proxyPreviewRead } from "../../../../shared/preview/read-proxy.server";
import { readCapiroConfig } from "../../../../shared/capiro/config";
import {
  handleCapiroRequest,
  handlePublicPlannerFormRequest,
  handlePublicOnboardRequest,
} from "../../../../shared/capiro/gateway";
import { capiroOperations } from "../../../../shared/capiro/registry";
import { jsonError } from "../../../../shared/capiro/gateway-errors";
import { previewFirstChatWriteTarget } from "../../../../shared/preview/first-chat-write.server";
import {
  firstChatCoreOperationForClient,
  firstChatCoreOperationKey,
  firstChatCoreRequest,
} from "../../../../shared/capiro/operations/meri-first-chat";

type Context = { params: Promise<{ operation: string }> };
async function handle(request: Request, context: Context) {
  const held = previewBackendRejection(process.env, request);
  if (held) return held;
  const { operation } = await context.params;
  if (
    operation === firstChatCoreOperationKey &&
    process.env.MERI_FIRST_CHAT_BOOTSTRAP_ENABLED !== "true"
  )
    return jsonError(503, "First chat bootstrap is not enabled.");
  const configuredClient =
    operation === firstChatCoreOperationKey
      ? firstChatCoreRequest.shape.clientId.safeParse(
          process.env.MERI_FIRST_CHAT_CLIENT_ID,
        )
      : null;
  if (configuredClient && !configuredClient.success)
    return jsonError(503, "First chat client is not configured.");
  const operations = configuredClient?.success
    ? {
        ...capiroOperations,
        [firstChatCoreOperationKey]: firstChatCoreOperationForClient(
          configuredClient.data,
        ),
      }
    : capiroOperations;
  const previewWriteTarget = previewFirstChatWriteTarget(process.env, request);
  if (
    previewWriteTarget &&
    (operation !== firstChatCoreOperationKey || !configuredClient?.success)
  )
    return previewHeldResponse();
  if (process.env.CAPIRO_PREVIEW_READ_ONLY === "true" && !previewWriteTarget)
    return proxyPreviewRead(
      request,
      process.env,
      `/api/capiro/${operation}`,
      async () => {
        const session = await auth();
        return session.userId ? session.getToken({ template: "capiro" }) : null;
      },
    );
  if (operation.startsWith("public-form."))
    return handlePublicPlannerFormRequest(
      request,
      operation,
      readCapiroConfig(process.env),
    );
  if (operation.startsWith("public-onboard."))
    return handlePublicOnboardRequest(
      request,
      operation,
      readCapiroConfig(process.env),
    );
  const config = readCapiroConfig(process.env);
  if (previewWriteTarget) config.services = { core: previewWriteTarget.href };
  const dispatchOperations =
    previewWriteTarget && configuredClient?.success
      ? {
          [firstChatCoreOperationKey]: firstChatCoreOperationForClient(
            configuredClient.data,
          ),
        }
      : operations;
  return handleCapiroRequest(
    request,
    operation,
    dispatchOperations,
    config,
    async (authentication) => {
      const session = await auth();
      return session.userId
        ? session.getToken(
            authentication === "clerk-session"
              ? undefined
              : { template: "capiro" },
          )
        : null;
    },
  );
}
export {
  handle as GET,
  handle as POST,
  handle as PUT,
  handle as PATCH,
  handle as DELETE,
};

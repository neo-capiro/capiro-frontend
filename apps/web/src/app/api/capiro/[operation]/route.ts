import { auth } from "@clerk/nextjs/server";
import { previewBackendRejection } from "../../../../shared/preview/backend-policy.server";
import { proxyPreviewRead } from "../../../../shared/preview/read-proxy.server";
import { readCapiroConfig } from "../../../../shared/capiro/config";
import {
  handleCapiroRequest,
  handlePublicPlannerFormRequest,
  handlePublicOnboardRequest,
  handlePublicResearchShareRequest,
  handlePublicShareRequest,
} from "../../../../shared/capiro/gateway";
import { selectFirstChatGateway } from "../../../../shared/preview/first-chat-gateway.server";

type Context = { params: Promise<{ operation: string }> };
async function handle(request: Request, context: Context) {
  const held = previewBackendRejection(process.env, request);
  if (held) return held;
  const { operation } = await context.params;
  const selected = selectFirstChatGateway(process.env, request, operation);
  if (selected.response) return selected.response;
  const { operations, previewWriteTarget } = selected;
  if (process.env.CAPIRO_PREVIEW_READ_ONLY === "true" && !previewWriteTarget)
    return proxyPreviewRead(
      request,
      process.env,
      `/api/capiro/${operation}`,
      async () => {
        const session = await auth();
        return session.userId ? session.getToken() : null;
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
  if (operation.startsWith("public-research-share."))
    return handlePublicResearchShareRequest(
      request,
      operation,
      readCapiroConfig(process.env),
    );
  if (operation.startsWith("public-share."))
    return handlePublicShareRequest(
      request,
      operation,
      readCapiroConfig(process.env),
    );
  const config = readCapiroConfig(process.env);
  if (previewWriteTarget) config.services = { core: previewWriteTarget.href };
  // The campaign-session operations are owned by the separate engagement application. When the
  // cohort states that surface is available, this narrow override points those two operations at
  // that service; every other operation keeps its declared service. An "enabled" selection without
  // a configured engagement base URL has already resolved to "disabled", so an enabled state can
  // never be sent to the main Core application.
  const campaignSessionOperation =
    operation === "engagement.sessions" || operation === "engagement.session";
  const selectedOperations =
    config.engagementSessions === "enabled" &&
    campaignSessionOperation &&
    Object.hasOwn(operations, operation)
      ? {
          ...operations,
          [operation]: { ...operations[operation]!, service: "engagement" as const },
        }
      : operations;
  return handleCapiroRequest(
    request,
    operation,
    selectedOperations,
    config,
    async (authentication) => {
      const session = await auth();
      if (!session.userId) return null;
      return authentication === "clerk-session"
        ? session.getToken()
        : session.getToken({ template: "capiro" });
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

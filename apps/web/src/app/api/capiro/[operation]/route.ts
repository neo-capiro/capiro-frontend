import { auth } from "@clerk/nextjs/server";
import { previewBackendRejection } from "../../../../shared/preview/backend-policy.server";
import { proxyPreviewRead } from "../../../../shared/preview/read-proxy.server";
import { readCapiroConfig } from "../../../../shared/capiro/config";
import {
  handleCapiroRequest,
  handlePublicPlannerFormRequest,
  handlePublicOnboardRequest,
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
  return handleCapiroRequest(
    request,
    operation,
    operations,
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

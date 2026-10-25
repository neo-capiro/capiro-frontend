import { auth } from "@clerk/nextjs/server";
import { previewBackendRejection } from "../../../../../shared/preview/backend-policy.server";
import {
  readTenantSettingsConfig,
  proxyTenantSettingsRequest,
} from "../../../../../shared/meri-tenant-settings/proxy";

export async function POST(
  request: Request,
  context: { params: Promise<{ operation: string }> },
) {
  const held = previewBackendRejection(process.env);
  if (held) return held;
  const { operation } = await context.params;
  return proxyTenantSettingsRequest(
    request,
    operation,
    readTenantSettingsConfig(process.env),
    async () => {
      const session = await auth();
      return session.userId ? session.getToken() : null;
    },
  );
}

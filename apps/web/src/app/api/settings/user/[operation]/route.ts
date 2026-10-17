import { auth } from "@clerk/nextjs/server";
import { previewBackendRejection } from "../../../../../shared/preview/backend-policy.server";
import { readUserPreferencesConfig } from "../../../../../shared/meri-user-preferences/config";
import { proxyUserPreferencesRequest } from "../../../../../shared/meri-user-preferences/proxy";

export async function POST(
  request: Request,
  context: { params: Promise<{ operation: string }> },
) {
  const held = previewBackendRejection(process.env);
  if (held) return held;
  const { operation } = await context.params;
  return proxyUserPreferencesRequest(
    request,
    operation,
    readUserPreferencesConfig(process.env),
    async () => {
      const session = await auth();
      return session.userId ? session.getToken({ template: "capiro" }) : null;
    },
  );
}

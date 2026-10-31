import { auth } from "@clerk/nextjs/server";
import { readConfig } from "@/shared/portfolio/config/config";
import { clientLogoResponse } from "@/shared/portfolio/api/client-logo";

type Context = { params: Promise<{ clientId: string }> };

/**
 * M1: stable client-logo bytes for the signed-in app session.
 *
 * Same authentication chain as the backend proxy route (Clerk `auth()` and the
 * native `capiro` session token) against the Core base URL from the runtime
 * config — but returning bytes rather than JSON.
 */
async function handle(request: Request, context: Context) {
  const { clientId } = await context.params;
  return clientLogoResponse(
    request,
    clientId,
    readConfig(process.env),
    async () => {
      const session = await auth();
      if (!session.userId) return null;
      return session.getToken({ template: "capiro" });
    },
  );
}

export { handle as GET, handle as HEAD };

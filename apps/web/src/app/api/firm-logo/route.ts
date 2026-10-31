import { auth } from "@clerk/nextjs/server";
import { readConfig } from "@/shared/portfolio/config/config";
import { firmLogoResponse } from "@/shared/portfolio/api/firm-logo";

/**
 * M1 (firm half): stable firm-logo bytes for the signed-in app session.
 *
 * Same authentication chain as the client-logo and backend proxy routes (Clerk `auth()` and the
 * native `capiro` session token) against the Core base URL from the runtime config — returning
 * bytes rather than JSON. Without the matching proxy matcher entry Clerk never runs and this
 * handler would answer 401 for a signed-in session.
 */
async function handle(request: Request) {
  return firmLogoResponse(request, readConfig(process.env), async () => {
    const session = await auth();
    if (!session.userId) return null;
    return session.getToken({ template: "capiro" });
  });
}

export { handle as GET, handle as HEAD };

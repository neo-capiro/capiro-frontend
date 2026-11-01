import { clerkMiddleware } from "@clerk/nextjs/server";
import {
  NextResponse,
  type NextRequest,
  type NextFetchEvent,
} from "next/server";
import { readCapiroConfig } from "./shared/capiro/config";
import { responseHeaders } from "./shared/response-headers";
import { previewBackendRejection } from "./shared/preview/backend-policy.server";

const clerk = clerkMiddleware();
export default function proxy(request: NextRequest, event: NextFetchEvent) {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    const held = previewBackendRejection(process.env, request);
    if (held) return held;
  }
  // These namespaces have their own closed public capability allowlists in the route.
  if (
    request.nextUrl.pathname.startsWith("/api/capiro/public-onboard.") ||
    request.nextUrl.pathname.startsWith("/api/capiro/public-share.") ||
    request.nextUrl.pathname.startsWith("/api/capiro/public-research-share.")
  )
    return NextResponse.next();
  if (request.nextUrl.pathname === "/settings") {
    const destination = request.nextUrl.clone();
    destination.pathname = "/settings/personal";
    return NextResponse.redirect(destination, {
      status: 307,
      headers: Object.fromEntries(
        responseHeaders.map(({ key, value }) => [key, value]),
      ),
    });
  }
  if (!readCapiroConfig(process.env).authConfigured) return NextResponse.next();
  return clerk(request, event);
}
export const config = {
  matcher: [
    "/",
    "/portfolio/:path*",
    "/calendar/:path*",
    "/meri/:path*",
    "/api/backend/:path*",
    // The client-logo route calls Clerk auth(); without this entry the proxy never runs
    // and the handler answers 401 for a signed-in session (PR #369 return).
    "/api/client-logo/:path*",
    // Same reason for the firm-logo route: it is one exact path (the tenant comes from the
    // session), and without this entry Clerk never runs for it.
    "/api/firm-logo",
    "/modules/:path*",
    // The bill detail receiver is an authenticated product route; Clerk must see it
    // so the page renders under the existing SessionBoundary.
    "/bills/:path*",
    "/settings/:path*",
    "/sign-in/:path*",
    "/register",
    "/verify",
    "/plan",
    "/legal",
    "/billing",
    "/admins",
    "/clients",
    "/org",
    "/confirm",
    "/accept-invite",
    "/setup",
    "/api/capiro/:path*",
    "/api/action-followthrough/:path*",
    "/api/conversations/:path*",
    // Their handlers call Clerk auth(), which requires this proxy on the request.
    "/api/documents/:path*",
    "/api/task-commands/:path*",
    "/api/settings/:path*",
    "/api/data-access/:path*",
    "/api/memory/owner/:path*",
    "/api/uploads/:path*",
    "/api/meri/notifications",
  ],
};

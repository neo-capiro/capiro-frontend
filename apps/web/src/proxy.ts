import { clerkMiddleware } from "@clerk/nextjs/server";
import {
  NextResponse,
  type NextRequest,
  type NextFetchEvent,
} from "next/server";
import { readCapiroConfig } from "./shared/capiro/config";
import { responseHeaders } from "./shared/response-headers";

const clerk = clerkMiddleware();
export default function proxy(request: NextRequest, event: NextFetchEvent) {
  // This namespace has its own closed public capability allowlist in the route.
  if (request.nextUrl.pathname.startsWith("/api/capiro/public-onboard."))
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
    "/modules/:path*",
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
  ],
};

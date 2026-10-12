import { clerkMiddleware } from "@clerk/nextjs/server";
import {
  NextResponse,
  type NextRequest,
  type NextFetchEvent,
} from "next/server";
import { readCapiroConfig } from "./shared/capiro/config";

const clerk = clerkMiddleware();
export default function proxy(request: NextRequest, event: NextFetchEvent) {
  if (!readCapiroConfig(process.env).authConfigured) return NextResponse.next();
  return clerk(request, event);
}
export const config = {
  matcher: [
    "/modules/:path*",
    "/settings/:path*",
    "/sign-in/:path*",
    "/api/capiro/:path*",
  ],
};

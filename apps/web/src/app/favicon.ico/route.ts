/** Reuse the existing public brand icon for conventional browser requests. */
export function GET(request: Request): Response {
  return Response.redirect(new URL("/onboard/favicon.svg", request.url), 308);
}

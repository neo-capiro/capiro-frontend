/**
 * While this frontend serves the `app.capiro.ai` browser origin, a small set of
 * already-issued app-host capabilities still terminate on the original Core and
 * Workspace edge. These Next external rewrites are the smallest existing mechanism
 * that keeps those exact paths working without a new handler, proxy or auth layer:
 * every entry is gated on the app host alone, and its destination is the same path
 * on one fixed retained origin, so each provider keeps its existing verification,
 * state and signature owner and still receives the original body and query.
 */

/** The frontend's own browser host. No other host is admitted by these rewrites. */
export const appBrowserHost = "app.capiro.ai";

/**
 * Next compiles `has.value` as a regular expression, so an unescaped literal host
 * would also admit `app-capiro.ai` or `appxcapiroyai`. The gate is this escaped form.
 */
export const appBrowserHostPattern = "app\\.capiro\\.ai";

/** The original edge that still owns the retained app-host callbacks and links. */
export const retainedAppCapabilitiesOrigin = "https://os.capiro.ai";

/**
 * Exact app-host paths whose owner is not this frontend.
 *
 * `/webhooks/recall` has no suffix route in the current Core route table, so it is
 * matched exactly. `/newsletter/*` is deliberately absent: `apps/web/public/newsletter`
 * already serves that namespace here.
 */
const forwardedPaths = [
  "/api/engagement/integrations/microsoft/callback",
  "/api/engagement/integrations/google/callback",
  "/api/engagement/integrations/microsoft/notifications",
  "/webhooks/recall",
  "/webhooks/clerk",
  "/api/engagement/newsletter-public/:token/archive",
  "/api/engagement/newsletter-public/:token/unsubscribe",
  "/api/engagement/newsletter-public/:token/preferences",
  "/api/engagement/newsletter-public/:token/survey",
  "/workspace-api/newsletters/assets/file/:token",
] as const;

export type AppOriginRewrite = {
  source: string;
  destination: string;
  has: { type: "host"; value: string }[];
};

/** Host-gated external rewrites. Never a wildcard prefix, never a second origin. */
export function appOriginRewrites(): AppOriginRewrite[] {
  return forwardedPaths.map((path) => ({
    source: path,
    destination: `${retainedAppCapabilitiesOrigin}${path}`,
    has: [{ type: "host" as const, value: appBrowserHostPattern }],
  }));
}

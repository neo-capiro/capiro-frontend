/**
 * While this frontend serves the `app.capiro.ai` browser origin, a small set of
 * already-issued app-host capabilities still terminate on the original Core and
 * Workspace edge. These Next external rewrites are the smallest existing mechanism
 * that keeps those exact paths working without a new handler, proxy or auth layer:
 * every entry is gated on the app host alone, and its destination is the same path
 * on one fixed retained origin, so each provider keeps its existing verification,
 * state and signature owner and still receives the original body and query.
 *
 * One entry is carried to the selected Core backend instead: the MCP OAuth
 * callback must reach the Core that issued the state and owns the connector rows
 * (the origin `CORE_API_BASE_URL` names), not the original edge. The browser keeps
 * `https://app.capiro.ai/api/clio/mcp-oauth/callback` as the registered redirect;
 * only the service transport host differs, and the path/query are unchanged.
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
 * The selected Core backend origin that owns the connector library, OAuth state and
 * connection rows — the deployment `CORE_API_BASE_URL` points at. The MCP OAuth
 * callback is transported here while the browser keeps the public app callback.
 * Release must keep this rewrite and that value on the same Core.
 */
export const selectedCoreServiceOrigin =
  "https://first-chat-preview.app-dev.capiro.ai";

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
  // Clio MCP OAuth callback: the selected Core owns the handler, the state
  // signature and the state/token record, so only this path is transported there.
  "/api/clio/mcp-oauth/callback",
  "/webhooks/recall",
  "/webhooks/clerk",
  "/api/engagement/newsletter-public/:token/archive",
  "/api/engagement/newsletter-public/:token/unsubscribe",
  "/api/engagement/newsletter-public/:token/preferences",
  "/api/engagement/newsletter-public/:token/survey",
  "/workspace-api/newsletters/assets/file/:token",
] as const;

/**
 * The one existing path whose fixed origin is the selected Core backend rather than
 * the original edge. Every other path keeps `retainedAppCapabilitiesOrigin`.
 */
const selectedCorePaths: ReadonlySet<string> = new Set([
  "/api/clio/mcp-oauth/callback",
]);

export type AppOriginRewrite = {
  source: string;
  destination: string;
  has: { type: "host"; value: string }[];
};

/** Host-gated external rewrites. Never a wildcard prefix, never a second origin. */
export function appOriginRewrites(): AppOriginRewrite[] {
  return forwardedPaths.map((path) => ({
    source: path,
    destination: `${selectedCorePaths.has(path) ? selectedCoreServiceOrigin : retainedAppCapabilitiesOrigin}${path}`,
    has: [{ type: "host" as const, value: appBrowserHostPattern }],
  }));
}

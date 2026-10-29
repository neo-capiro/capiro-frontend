import { publicRequestOrigin, readRequestOrigin } from "../request-origin";

/** Preview browser authority is fixed by the reviewed Portfolio deployment source. */
export const portfolioPreviewFrontendOrigin = "https://app.capiro.ai";

/** Never derive the Meri listener's Origin from browser or forwarded headers. */
export function readConversationFrontendOrigin(
  env: Record<string, string | undefined>,
): string | undefined {
  const issues: string[] = [];
  const origin = readRequestOrigin(env.CAPIRO_REQUEST_ORIGIN, issues);
  if (!origin || issues.length) return undefined;
  if (
    env.CAPIRO_PREVIEW_READ_ONLY === "true" &&
    (origin !== portfolioPreviewFrontendOrigin ||
      env.CAPIRO_EXISTING_APP_URL !== portfolioPreviewFrontendOrigin)
  )
    return undefined;
  return origin;
}

/** The upstream Origin must equal the browser-visible origin admitted at this adapter. */
export function trustedConversationFrontendOrigin(
  request: Request,
  configured: string | undefined,
  requestOrigin?: string | null,
): string | undefined {
  const issues: string[] = [];
  const origin = readRequestOrigin(configured, issues);
  if (!origin || issues.length || origin !== configured) return undefined;
  return publicRequestOrigin(request, requestOrigin) === origin
    ? origin
    : undefined;
}

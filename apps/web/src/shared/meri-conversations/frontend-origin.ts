import { readRequestOrigin } from "../request-origin";

/** Preview browser authority is fixed by the reviewed Portfolio deployment source. */
export const portfolioPreviewFrontendOrigin =
  "https://portfolio-preview.app.capiro.ai";

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

/** A configured origin must also be the origin of the admitted same-origin request. */
export function trustedConversationFrontendOrigin(
  request: Request,
  configured: string | undefined,
): string | undefined {
  const issues: string[] = [];
  const origin = readRequestOrigin(configured, issues);
  if (!origin || issues.length || origin !== configured) return undefined;
  try {
    return new URL(request.url).origin === origin ? origin : undefined;
  } catch {
    return undefined;
  }
}

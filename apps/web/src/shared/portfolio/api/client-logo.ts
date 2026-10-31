import type { RuntimeConfig } from "../config/config";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const noStore = (status: number) =>
  new Response(null, { status, headers: { "Cache-Control": "no-store" } });

/**
 * M1: the app's own address for a client logo.
 *
 * Core used to hand the app a presigned S3 GET URL, which embedded temporary AWS
 * credentials in every client payload and expired after 300 s. This route carries
 * the stored bytes instead, authenticated by the signed-in session, so the image
 * stays stable and no payload can leak `X-Amz-Security-Token`.
 *
 * It deliberately does not reuse the JSON proxy: that proxy pins
 * `application/json` on both the upstream request and the response, so an image
 * cannot ride it.
 */
export async function clientLogoResponse(
  request: Request,
  clientId: string,
  config: RuntimeConfig,
  getToken: () => Promise<string | null>,
  fetcher: typeof fetch = fetch,
): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD")
    return noStore(405);
  // Absent, foreign and malformed ids look the same to the caller.
  if (!UUID.test(clientId)) return noStore(404);

  const base = config.services.core;
  if (!base || !config.authConfigured || config.issues.length)
    return noStore(503);

  let token: string | null;
  try {
    token = await getToken();
  } catch {
    return noStore(401);
  }
  // Never fall back to an unauthenticated fetch.
  if (!token) return noStore(401);

  let upstream: Response;
  try {
    upstream = await fetcher(
      `${base}/clients/${encodeURIComponent(clientId)}/logo`,
      {
        method: request.method,
        headers: { Authorization: `Bearer ${token}`, Accept: "image/*" },
        cache: "no-store",
      },
    );
  } catch {
    return noStore(502);
  }
  if (upstream.status === 404) {
    void upstream.body?.cancel().catch(() => {});
    return noStore(404);
  }
  if (!upstream.ok) {
    void upstream.body?.cancel().catch(() => {});
    // Errors are never cached and never expose the upstream body.
    return noStore(502);
  }
  // Core has already restricted this to the logo whitelist; re-assert it so a
  // misbehaving upstream cannot turn this route into a scriptable document.
  const contentType = upstream.headers.get("Content-Type") ?? "";
  if (!/^image\/(png|jpeg|svg\+xml|webp)$/i.test(contentType)) {
    void upstream.body?.cancel().catch(() => {});
    return noStore(502);
  }
  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, max-age=300",
    },
  });
}

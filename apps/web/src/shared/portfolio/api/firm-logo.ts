import type { RuntimeConfig } from "../config/config";

const noStore = (status: number) =>
  new Response(null, { status, headers: { "Cache-Control": "no-store" } });

/**
 * M1 (firm half): the app's own address for the tenant's firm logo.
 *
 * The branding payload used to carry a presigned S3 GET URL, which embedded temporary AWS
 * credentials in every settings read and expired after 300 s. This route carries the stored
 * bytes instead, authenticated by the signed-in session, so the image stays stable and no
 * payload can leak `X-Amz-Security-Token`.
 *
 * There is no id in the path: the tenant is the caller's own session tenant, which Core
 * resolves. Like the client-logo route it cannot ride the JSON proxy (that proxy pins
 * `application/json` on both legs).
 */
export async function firmLogoResponse(
  request: Request,
  config: RuntimeConfig,
  getToken: () => Promise<string | null>,
  fetcher: typeof fetch = fetch,
): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD")
    return noStore(405);

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
    upstream = await fetcher(`${base}/tenant-admin/branding/logo`, {
      method: request.method,
      headers: { Authorization: `Bearer ${token}`, Accept: "image/*" },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(15_000)]),
    });
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
  // MIME validation is separate from the sandbox policy that makes SVG documents inert.
  const contentType = upstream.headers.get("Content-Type") ?? "";
  if (!/^image\/(png|jpeg|svg\+xml|webp)$/i.test(contentType)) {
    void upstream.body?.cancel().catch(() => {});
    return noStore(502);
  }
  if (request.method === "HEAD") await upstream.body?.cancel().catch(() => {});
  return new Response(request.method === "HEAD" ? null : upstream.body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-store",
      "Content-Security-Policy":
        "sandbox; default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'",
    },
  });
}

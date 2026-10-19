/** Server configuration supplies authority; request/forwarded headers never do. */
export function readRequestOrigin(
  value: string | undefined,
  issues: string[],
): string | null | undefined {
  if (value === undefined) return undefined;
  try {
    if (!value || /\s/.test(value)) throw new Error();
    const url = new URL(value);
    const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== "/" ||
      url.hostname.includes("*") ||
      (value !== url.origin && value !== `${url.origin}/`) ||
      url.hostname === "0.0.0.0" ||
      (url.protocol !== "https:" && !(loopback && url.protocol === "http:"))
    )
      throw new Error();
    return url.origin;
  } catch {
    issues.push(
      "CAPIRO_REQUEST_ORIGIN requires a canonical HTTPS origin (HTTP only on loopback), without credentials, path, query or fragment.",
    );
    return null;
  }
}

/**
 * The origin a browser sees for this request. Behind the ALB the standalone Next server
 * reconstructs `request.url` from its bind address (`https://0.0.0.0:5188/...`), so the
 * configured CAPIRO_REQUEST_ORIGIN is authoritative there; `request.url` serves only when no
 * origin is configured (dev, tests). An invalid configuration resolves to null (fail closed).
 */
export function publicRequestOrigin(
  request: Request,
  configured?: string | null,
): string | null {
  if (configured === null) return null;
  return configured ?? new URL(request.url).origin;
}

export function sameRequestOrigin(
  request: Request,
  configured?: string | null,
): boolean {
  const expected = publicRequestOrigin(request, configured);
  return expected !== null && request.headers.get("origin") === expected;
}

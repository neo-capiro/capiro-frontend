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

export function sameRequestOrigin(
  request: Request,
  configured?: string | null,
): boolean {
  if (configured === null) return false;
  const expected = configured ?? new URL(request.url).origin;
  return request.headers.get("origin") === expected;
}

/** A route selection is a hint. Only a current service response admits a client. */
export function routeClientId(
  pathname: string,
  search: Pick<URLSearchParams, "get">,
) {
  const segment = pathname.match(/^\/portfolio\/([^/]+)(?:\/|$)/)?.[1];
  if (segment && segment !== "prospects") {
    try {
      return decodeURIComponent(segment);
    } catch {
      return segment;
    }
  }
  if (/^\/(?:meri|modules|calendar|settings)(?:\/|$)/.test(pathname))
    return search.get("clientId") || undefined;
  return undefined;
}
export const productModes = [
  { id: "meri", label: "Meri", href: "/meri" },
  { id: "portfolio", label: "Portfolio", href: "/" },
  { id: "modules", label: "Modules", href: "/modules" },
] as const;
export type ProductMode = (typeof productModes)[number]["id"];
export function productHref(mode: ProductMode, clientId?: string) {
  if (mode === "portfolio")
    return clientId ? `/portfolio/${encodeURIComponent(clientId)}` : "/";
  return `/${mode}${clientId ? `?clientId=${encodeURIComponent(clientId)}` : ""}`;
}

export function scopedHref(href: string, clientId?: string) {
  if (!clientId) return href;
  const [path, query = ""] = href.split("?");
  const params = new URLSearchParams(query);
  params.set("clientId", clientId);
  return `${path}?${params}`;
}

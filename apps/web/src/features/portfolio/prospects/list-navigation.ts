const listPaths = new Set(["/portfolio/prospects", "/portfolio", "/"]);
const listKeys = new Set([
  "q",
  "stage",
  "ownerId",
  "owner",
  "status",
  "sort",
  "view",
  "layout",
  "type",
  "sector",
  "pipeline",
]);

/** Only local Portfolio list routes can be return destinations. */
export function prospectReturnTo(value: string | null | undefined) {
  if (
    !value?.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("#") ||
    /[\\\x00-\x1f]/.test(value)
  )
    return "/portfolio/prospects";
  const boundary = value.indexOf("?");
  const pathname = boundary < 0 ? value : value.slice(0, boundary);
  if (!listPaths.has(pathname)) return "/portfolio/prospects";
  const incoming = new URLSearchParams(
    boundary < 0 ? "" : value.slice(boundary + 1),
  );
  const query = new URLSearchParams();
  for (const [key, item] of incoming)
    if (listKeys.has(key) && item.length <= 200) query.set(key, item);
  return `${pathname}${query.size ? `?${query}` : ""}`;
}

export function prospectDetailHref(id: string, listUrl: string) {
  return `/portfolio/prospects/${encodeURIComponent(id)}?${new URLSearchParams({ returnTo: prospectReturnTo(listUrl) })}`;
}

export function rememberProspectListScroll(listUrl: string) {
  try {
    sessionStorage.setItem(
      `portfolio-scroll:${prospectReturnTo(listUrl)}`,
      String(document.getElementById("main")?.scrollTop ?? window.scrollY),
    );
  } catch {
    /* Navigation still works when browser storage is unavailable. */
  }
}

export function restoreProspectListScroll(listUrl: string) {
  try {
    const value = sessionStorage.getItem(
      `portfolio-scroll:${prospectReturnTo(listUrl)}`,
    );
    if (value !== null && /^\d+(\.\d+)?$/.test(value))
      (document.getElementById("main") ?? window).scrollTo({
        top: Math.min(Number(value), 1_000_000),
        behavior: "instant",
      });
  } catch {
    /* Browser Back retains its native scroll behavior. */
  }
}

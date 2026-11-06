/** Both tracker destinations retain their surrounding route and client scope. */
export function trackerViewParameter(pathname: string) {
  return pathname.startsWith("/modules/") ? "trackerView" : "view";
}

export function trackerRouteHref(
  pathname: string,
  search: string,
  key: "view" | "q",
  value: string,
) {
  const next = new URLSearchParams(search);
  const parameter = key === "view" ? trackerViewParameter(pathname) : key;
  if (value) next.set(parameter, value);
  else next.delete(parameter);
  const query = next.toString();
  return `${pathname}${query ? `?${query}` : ""}`;
}

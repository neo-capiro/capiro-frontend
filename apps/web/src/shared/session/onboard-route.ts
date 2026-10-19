const onboardPaths = new Set([
  "/register",
  "/verify",
  "/plan",
  "/legal",
  "/billing",
  "/admins",
  "/clients",
  "/org",
  "/confirm",
  "/accept-invite",
  "/setup",
]);

/** Narrow public capability pages retain their independent IT authorization. */
export function isPublicOnboardPath(pathname: string) {
  return /^\/it\/[^/]+\/?$/.test(pathname);
}

export function isOnboardPath(pathname: string) {
  return (
    onboardPaths.has(pathname.replace(/\/$/, "")) ||
    isPublicOnboardPath(pathname)
  );
}

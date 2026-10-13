/**
 * Deployment containment, not authorization. No backend read route is admitted:
 * even GET can trigger tenant self-healing or internal admin mapping upstream.
 * Admission requires a reviewed source change with backend side-effect evidence.
 * Never derive this setting from a request, browser context or public variable.
 */
export function previewBackendRejection(
  env: Record<string, string | undefined>,
): Response | null {
  const mode = env.CAPIRO_PREVIEW_READ_ONLY;
  // Preserve the ordinary app; malformed configured preview values fail closed.
  if (mode === undefined || mode === "false") return null;
  return Response.json(
    {
      error: { code: "PREVIEW_BACKEND_HELD" },
      message: "Backend access is held for read-only preview review.",
    },
    {
      status: 503,
      headers: {
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}

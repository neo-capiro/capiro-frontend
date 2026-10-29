/**
 * Meri note-taker preview writes.
 *
 * CAPIRO_PREVIEW_READ_ONLY holds every backend call except an explicit, separately
 * reviewed allowlist. The note-taker surfaces (Meri attendance on a meeting, the
 * client notetaker preference, meeting preparation, meeting notes and the debrief)
 * are part of the preview, so their exact write routes are admitted here.
 *
 * Scope is deliberately tiny and method+path anchored:
 *  - no wildcard segments beyond one opaque id,
 *  - no path outside /api/backend/core/engagement,
 *  - tenant/actor impersonation headers stay refused,
 *  - reads are unaffected (the existing preview read proxy already admits GETs).
 *
 * Anything not listed still gets PREVIEW_BACKEND_HELD.
 */
const backendPath = /^\/api\/backend\/core(\/engagement(?:\/[A-Za-z0-9._~-]+)+)$/;

const forbiddenHeaders = [
  "x-http-method-override",
  "x-method-override",
  "x-http-method",
  "x-capiro-tenant",
  "x-capiro-impersonate-tenant",
  "x-tenant-id",
  "x-client-id",
  "x-user-id",
];

const id = "[0-9a-fA-F-]{1,64}";
const meeting = `/engagement/meetings/${id}`;

type Rule = { method: "POST" | "PATCH" | "DELETE"; path: RegExp };

/** One rule per notetaker write the preview UI actually performs. */
const rules: readonly Rule[] = [
  // Meri attendance: dispatch/remove the bot on a meeting, client auto-join preference.
  { method: "POST", path: new RegExp(`^${meeting}/notetaker$`) },
  { method: "DELETE", path: new RegExp(`^${meeting}/notetaker$`) },
  { method: "POST", path: new RegExp(`^/engagement/clients/${id}/notetaker$`) },
  { method: "DELETE", path: new RegExp(`^/engagement/clients/${id}/notetaker$`) },
  // Meeting preparation: submit the durable job, resume or cancel it, edit a saved prep.
  { method: "POST", path: new RegExp(`^${meeting}/prep$`) },
  { method: "POST", path: new RegExp(`^${meeting}/prep-jobs/${id}/resume$`) },
  { method: "DELETE", path: new RegExp(`^${meeting}/prep-jobs/${id}$`) },
  { method: "PATCH", path: new RegExp(`^/engagement/meeting-preps/${id}$`) },
  { method: "POST", path: new RegExp(`^/engagement/meeting-preps/${id}/pdf-attachment$`) },
  // Debrief draft generation.
  { method: "POST", path: new RegExp(`^${meeting}/debrief-draft$`) },
  // Attachment approval (the prep PDF reaches the email flow through this).
  { method: "POST", path: new RegExp(`^${meeting}/attachments/${id}/approve$`) },
  // Notes and debriefs are created, edited, approved and shared through the reviewed
  // meeting-command writer; its replay read is a GET and already preview-admitted.
  { method: "POST", path: /^\/engagement\/meeting-commands$/ },
] as const;

export function previewNotetakerWriteRoute(
  request: Request,
): { browserPath: string; path: string } | null {
  if (request.method === "GET" || request.method === "HEAD" || request.method === "OPTIONS")
    return null;
  if (forbiddenHeaders.some((header) => request.headers.has(header))) return null;
  try {
    const { pathname } = new URL(request.url);
    const match = backendPath.exec(pathname);
    if (!match) return null;
    const path = match[1] ?? "";
    return rules.some((rule) => rule.method === request.method && rule.path.test(path))
      ? { browserPath: pathname, path }
      : null;
  } catch {
    return null;
  }
}

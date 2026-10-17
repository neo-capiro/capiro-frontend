/**
 * The opaque Meri action session travels browser-to-proxy in its own header. Clerk's `auth()`
 * gives a bearer Authorization header precedence over the session cookie, so an opaque credential
 * sent there reads as signed out. The proxies forward it to Meri as the bearer Meri expects.
 */
export const actionSessionHeader = "X-Meri-Action-Session";
const actionSessionShape = /^action_session_[A-Za-z0-9_-]{43}$/;

/** The exact browser-supplied session credential, or null when absent or malformed. */
export function receivedActionSession(request: Request): string | null {
  const value = request.headers.get(actionSessionHeader);
  return value !== null && actionSessionShape.test(value) ? value : null;
}

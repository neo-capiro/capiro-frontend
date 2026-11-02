/**
 * The Settings footer names only this image's own commit, read from the server environment at
 * build time. The Core and Meri sources the deployment is configured against are stack inputs
 * gated by a fixed list, not a live read, so they are not shown as a serving identity.
 */
type Env = Record<string, string | undefined>;

export function readBuildIdentity(env: Env) {
  return { frontend: env.GIT_SHA?.trim() || null };
}
export type BuildIdentity = ReturnType<typeof readBuildIdentity>;

/** The footer line, or null when the image did not record its own commit. */
export function buildIdentityLine(identity: BuildIdentity) {
  return identity.frontend ? `frontend ${identity.frontend.slice(0, 8)}` : null;
}

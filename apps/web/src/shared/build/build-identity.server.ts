/**
 * The serving tuple a tester records from the Settings footer: this image's own commit, plus the
 * Core and Meri commits the deployment is configured against. Every value is a deployment input
 * read from the server environment; none is attested by the running services.
 */
type Env = Record<string, string | undefined>;
const value = (raw: string | undefined) => raw?.trim() || null;

export function readBuildIdentity(env: Env) {
  return {
    frontend: value(env.GIT_SHA),
    core: [
      ...new Set(
        [
          env.CAPIRO_PREVIEW_READ_BACKEND_SOURCE,
          env.CAPIRO_PREVIEW_CLIENT_ROSTER_BACKEND_SOURCE,
          env.CAPIRO_PREVIEW_FIRST_CHAT_BACKEND_SOURCE,
          env.CAPIRO_PREVIEW_MEMORY_CORE_BACKEND_SOURCE,
        ]
          .map(value)
          .filter((sha): sha is string => sha !== null),
      ),
    ],
    meri: value(env.CAPIRO_PREVIEW_MERI_RUNTIME_SOURCE),
  };
}
export type BuildIdentity = ReturnType<typeof readBuildIdentity>;

const short = (sha: string) => sha.slice(0, 8);

/**
 * The footer line, or null when the image did not record its own commit. Core and Meri appear
 * only when their inputs are configured; Core lists each distinct configured source.
 */
export function buildIdentityLine(identity: BuildIdentity) {
  if (!identity.frontend) return null;
  return [
    `frontend ${short(identity.frontend)}`,
    identity.core.length ? `core ${identity.core.map(short).join("/")}` : null,
    identity.meri ? `meri ${short(identity.meri)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

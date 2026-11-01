/**
 * The serving tuple a tester records: this image's own commit, plus the Core and Meri commits the
 * deployment is configured against. Every value is a deployment input read from the server
 * environment; none is attested by the running services, and nothing here reaches a backend.
 */
type Env = Record<string, string | undefined>;
const value = (raw: string | undefined) => raw?.trim() || null;

export function readBuildIdentity(env: Env) {
  return {
    frontend: { commit: value(env.GIT_SHA), release: value(env.RELEASE_SHA) },
    core: {
      read: value(env.CAPIRO_PREVIEW_READ_BACKEND_SOURCE),
      clientRoster: value(env.CAPIRO_PREVIEW_CLIENT_ROSTER_BACKEND_SOURCE),
      firstChat: value(env.CAPIRO_PREVIEW_FIRST_CHAT_BACKEND_SOURCE),
      memory: value(env.CAPIRO_PREVIEW_MEMORY_CORE_BACKEND_SOURCE),
    },
    meri: {
      runtime: value(env.CAPIRO_PREVIEW_MERI_RUNTIME_SOURCE),
      imageDigest: value(env.CAPIRO_PREVIEW_MERI_RUNTIME_IMAGE_DIGEST),
    },
  };
}
export type BuildIdentity = ReturnType<typeof readBuildIdentity>;

const short = (sha: string | null) => (sha ? sha.slice(0, 8) : "unknown");

/** One footer line of short commits; Core reads "mixed" when its configured sources disagree. */
export function buildIdentityLine(identity: BuildIdentity) {
  const core = [...new Set(Object.values(identity.core).filter(Boolean))];
  return `frontend ${short(identity.frontend.commit)} · core ${
    core.length > 1 ? "mixed" : short(core[0] ?? null)
  } · meri ${short(identity.meri.runtime)}`;
}

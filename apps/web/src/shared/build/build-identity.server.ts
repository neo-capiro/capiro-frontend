import { readConfig } from "../portfolio/config/config";

/**
 * The Settings footer binds an observation to the serving tuple: this image's own commit, the Core
 * answering `CORE_API_BASE_URL` and the Meri answering `MERI_API_BASE_URL`. Core and Meri are read
 * from the running services at render time, never from a deployment input: Core stamps
 * `X-Capiro-Release-Sha` on every response, and Meri's public liveness document names the serving
 * material's commit once the runtime publishes one. The configured Meri source is only a fallback
 * for a runtime that publishes nothing, and the line says so; a configured value is never shown as
 * the live one. Core has no configured fallback: the `CAPIRO_PREVIEW_*_BACKEND_SOURCE` inputs are
 * route-admission pins, not the identity of the Core that answers.
 */
type Env = Record<string, string | undefined>;
type Fetcher = typeof fetch;

/** A service's source commit and where it was read. */
export type SourceReading = { sha: string; origin: "live" | "configured" };
export type BuildIdentity = {
  frontend: string | null;
  core: SourceReading | null;
  meri: SourceReading | null;
};

/** Each probe is bounded so a slow or absent service never holds the Settings render. */
export const SOURCE_PROBE_MS = 1500;
const commit = /^[0-9a-f]{40}$/;
const sha = (raw: unknown) =>
  typeof raw === "string" && commit.test(raw.trim()) ? raw.trim() : null;

async function probe(fetcher: Fetcher, url: string) {
  try {
    return await fetcher(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      credentials: "omit",
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(SOURCE_PROBE_MS),
    });
  } catch {
    return null;
  }
}

/** Core's identity middleware stamps every response, a 401 included, so the probe needs no credential. */
export async function readCoreSource(
  base: string | undefined,
  fetcher: Fetcher,
): Promise<string | null> {
  if (!base) return null;
  const response = await probe(fetcher, `${base}/health`);
  if (!response) return null;
  void response.body?.cancel().catch(() => undefined);
  return sha(response.headers.get("x-capiro-release-sha"));
}

/** Meri's public liveness document; `sourceCommit` is the serving material's commit when published. */
export async function readMeriSource(
  base: string | undefined,
  fetcher: Fetcher,
): Promise<string | null> {
  if (!base) return null;
  const response = await probe(fetcher, `${base}/health/live`);
  if (!response) return null;
  try {
    if (!response.ok) throw new Error("not live");
    const text = await response.text();
    if (text.length > 4096) return null;
    const document: unknown = JSON.parse(text);
    return typeof document === "object" && document !== null
      ? sha((document as { sourceCommit?: unknown }).sourceCommit)
      : null;
  } catch {
    void response.body?.cancel().catch(() => undefined);
    return null;
  }
}

/** The serving tuple as read now: live sources first, the configured Meri input only when Meri publishes none. */
export async function readBuildIdentity(
  env: Env,
  fetcher: Fetcher = fetch,
): Promise<BuildIdentity> {
  const frontend = env.GIT_SHA?.trim() || null;
  const { services } = readConfig(env);
  const [core, meri] = await Promise.all([
    readCoreSource(services.core, fetcher),
    readMeriSource(services.meri, fetcher),
  ]);
  const configuredMeri = sha(env.CAPIRO_PREVIEW_MERI_RUNTIME_SOURCE);
  return {
    frontend,
    core: core ? { sha: core, origin: "live" } : null,
    meri: meri
      ? { sha: meri, origin: "live" }
      : configuredMeri
        ? { sha: configuredMeri, origin: "configured" }
        : null,
  };
}

const short = (value: string) => value.slice(0, 8);
const part = (name: string, reading: SourceReading | null) =>
  reading
    ? `${name} ${short(reading.sha)}${reading.origin === "configured" ? " (configured)" : ""}`
    : null;

/**
 * The footer line, or null when the image did not record its own commit. A service whose source
 * could not be read is left out rather than guessed; a configured fallback is marked as such.
 */
export function buildIdentityLine(identity: BuildIdentity) {
  if (!identity.frontend) return null;
  return [
    `frontend ${short(identity.frontend)}`,
    part("core", identity.core),
    part("meri", identity.meri),
  ]
    .filter(Boolean)
    .join(" · ");
}

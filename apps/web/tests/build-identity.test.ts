import { expect, it } from "vitest";
import {
  buildIdentityLine,
  readBuildIdentity,
  readCoreSource,
  readMeriSource,
} from "../src/shared/build/build-identity.server";

const frontend = "1234567890abcdef1234567890abcdef12345678";
const core = "abcdef1234567890abcdef1234567890abcdef12";
const meri = "fedcba0987654321fedcba0987654321fedcba09";
const configuredMeri = "0123456789012345678901234567890123456789";
const env = {
  GIT_SHA: frontend,
  CORE_API_BASE_URL: "https://core.example.test/api",
  MERI_API_BASE_URL: "https://meri.example.test",
};

type Answer = (url: string) => Response | Promise<Response>;
function fetcher(answer: Answer) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetchLike = (async (input, init) => {
    calls.push({ url: String(input), init: init ?? {} });
    return answer(String(input));
  }) as typeof fetch;
  return { fetch: fetchLike, calls };
}
const coreAnswer = (sha: string | null, status = 401) =>
  new Response('{"message":"Missing bearer token"}', {
    status,
    headers: sha ? { "X-Capiro-Release-Sha": sha } : {},
  });
const meriAnswer = (document: unknown, status = 200) =>
  Response.json(document, { status });
const live = (sha: string) => ({ sha, origin: "live" as const });

it("prints frontend, core and meri from live reads in the serving-tuple format", async () => {
  const { fetch, calls } = fetcher((url) =>
    url.endsWith("/health")
      ? coreAnswer(core)
      : meriAnswer({ status: "live", sourceCommit: meri }),
  );
  const identity = await readBuildIdentity(env, fetch);
  expect(identity).toEqual({
    frontend,
    core: live(core),
    meri: live(meri),
  });
  expect(buildIdentityLine(identity)).toBe(
    "frontend 12345678 · core abcdef12 · meri fedcba09",
  );
  expect(calls.map((call) => call.url).sort()).toEqual([
    "https://core.example.test/api/health",
    "https://meri.example.test/health/live",
  ]);
  for (const { init } of calls) {
    expect(init.cache).toBe("no-store");
    expect(init.redirect).toBe("error");
    expect(init.credentials).toBe("omit");
    expect(init.signal).toBeInstanceOf(AbortSignal);
  }
});

it("prefers the live Meri commit over the configured input and marks a configured fallback", async () => {
  const withConfigured = {
    ...env,
    CAPIRO_PREVIEW_MERI_RUNTIME_SOURCE: configuredMeri,
  };
  const liveMeri = fetcher((url) =>
    url.endsWith("/health")
      ? coreAnswer(core)
      : meriAnswer({ status: "live", sourceCommit: meri }),
  ).fetch;
  expect((await readBuildIdentity(withConfigured, liveMeri)).meri).toEqual(
    live(meri),
  );

  const silentMeri = fetcher((url) =>
    url.endsWith("/health") ? coreAnswer(core) : meriAnswer({ status: "live" }),
  ).fetch;
  const identity = await readBuildIdentity(withConfigured, silentMeri);
  expect(identity.meri).toEqual({ sha: configuredMeri, origin: "configured" });
  expect(buildIdentityLine(identity)).toBe(
    "frontend 12345678 · core abcdef12 · meri 01234567 (configured)",
  );
});

it("leaves out a service whose source cannot be read instead of guessing it", async () => {
  const failing = fetcher(() => {
    throw new Error("unreachable");
  }).fetch;
  expect(await readBuildIdentity(env, failing)).toEqual({
    frontend,
    core: null,
    meri: null,
  });
  expect(buildIdentityLine(await readBuildIdentity(env, failing))).toBe(
    "frontend 12345678",
  );

  const malformed = fetcher((url) =>
    url.endsWith("/health")
      ? coreAnswer("not-a-commit")
      : meriAnswer({ status: "live", sourceCommit: "short" }),
  ).fetch;
  expect(buildIdentityLine(await readBuildIdentity(env, malformed))).toBe(
    "frontend 12345678",
  );

  // The configured Core inputs are route-admission pins, never a Core identity.
  const pinsOnly = await readBuildIdentity(
    {
      ...env,
      CAPIRO_PREVIEW_READ_BACKEND_SOURCE: core,
      CAPIRO_PREVIEW_FIRST_CHAT_BACKEND_SOURCE: core,
    },
    failing,
  );
  expect(pinsOnly.core).toBeNull();
});

it("reads Core's release header from any answer and Meri's commit only from a live document", async () => {
  const headerOn401 = fetcher(() => coreAnswer(core, 401)).fetch;
  expect(
    await readCoreSource("https://core.example.test/api", headerOn401),
  ).toBe(core);
  const headerOn200 = fetcher(() => coreAnswer(core, 200)).fetch;
  expect(
    await readCoreSource("https://core.example.test/api", headerOn200),
  ).toBe(core);
  const unstamped = fetcher(() => coreAnswer(null)).fetch;
  expect(
    await readCoreSource("https://core.example.test/api", unstamped),
  ).toBeNull();

  const stopping = fetcher(() =>
    meriAnswer({ status: "stopping", sourceCommit: meri }, 503),
  ).fetch;
  expect(
    await readMeriSource("https://meri.example.test", stopping),
  ).toBeNull();
  const notJson = fetcher(() => new Response("live", { status: 200 })).fetch;
  expect(await readMeriSource("https://meri.example.test", notJson)).toBeNull();
  const liveMeri = fetcher(() =>
    meriAnswer({ status: "live", sourceCommit: ` ${meri} ` }),
  ).fetch;
  expect(await readMeriSource("https://meri.example.test", liveMeri)).toBe(
    meri,
  );
});

it("probes nothing when a service is not configured", async () => {
  const { fetch, calls } = fetcher(() => coreAnswer(core));
  const identity = await readBuildIdentity({ GIT_SHA: ` ${frontend} ` }, fetch);
  expect(calls).toEqual([]);
  expect(identity).toEqual({ frontend, core: null, meri: null });
  expect(buildIdentityLine(identity)).toBe("frontend 12345678");
  expect(await readCoreSource(undefined, fetch)).toBeNull();
  expect(await readMeriSource(undefined, fetch)).toBeNull();
  expect(calls).toEqual([]);
});

it("prints nothing when the image did not record its commit", async () => {
  const { fetch } = fetcher((url) =>
    url.endsWith("/health")
      ? coreAnswer(core)
      : meriAnswer({ status: "live", sourceCommit: meri }),
  );
  expect(buildIdentityLine(await readBuildIdentity({}, fetch))).toBeNull();
  expect(
    buildIdentityLine(
      await readBuildIdentity({ ...env, GIT_SHA: "  " }, fetch),
    ),
  ).toBeNull();
});

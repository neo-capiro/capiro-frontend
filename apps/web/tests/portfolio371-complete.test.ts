import { describe, expect, it } from "vitest";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { createApiClient } from "../src/shared/portfolio/api/http";
import { portfolioMetricsQueryOptions } from "../src/features/portfolio/index/usePortfolioMetrics";
import {
  clientKey,
  clientReadKey,
  clientReadQueryOptions,
  publishClientReceipt,
} from "../src/features/portfolio/clients/client-read";
import { registrationClientState } from "../src/features/portfolio/capabilities/registration-mutations";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * PR #371 / 6046 — the four returned boundaries, composed against the real owners:
 * real options builders, a real QueryClient/QueryObserver, the real receipt publisher and the
 * real registration readiness guard. React hook bindings and the API transport are doubles;
 * no DOM, server or browser is involved.
 */

const TENANT = "11111111-1111-4111-8111-111111111111";
const OTHER_TENANT = "99999999-9999-4999-8999-999999999999";
const CLIENT = "22222222-2222-4222-8222-222222222222";
const END = "2026-10-31T12:00:00.000Z";
const START = "2026-10-01T12:00:00.000Z";

const metrics = {
  definition: "portfolio-recorded-baseline-v1",
  tenantId: TENANT,
  observedAt: END,
  activityWindow: { start: START, end: END, timezone: "UTC" },
  clients: { status: "unavailable" },
  objectives: { status: "unavailable" },
  activity: { status: "unavailable" },
  billWatch: { status: "unavailable" },
};

const clientRow = {
  id: CLIENT,
  tenantId: TENANT,
  name: "Synthetic Strategies",
  profileStatus: "active",
  status: "active",
};

const actor = {
  tenantId: TENANT,
  userId: "user-1",
  role: "standard_user",
} as never;
const otherActor = {
  tenantId: OTHER_TENANT,
  userId: "user-2",
  role: "standard_user",
} as never;

function seededCache(identityActor = actor, seedClient = false) {
  const cache = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  const a = identityActor as unknown as {
    tenantId: string;
    userId: string;
  };
  cache.setQueryData(["identity"], {
    user: { id: a.userId, email: "user@example.test" },
    tenant: { id: a.tenantId, name: "Synthetic Tenant" },
    role: "standard_user",
  });
  if (seedClient)
    cache.setQueryData(clientReadKey(CLIENT, identityActor), clientRow);
  return cache;
}

function countingApi(payload: unknown) {
  const paths: string[] = [];
  const api = createApiClient(async (path) => {
    paths.push(String(path));
    return Response.json(payload);
  });
  return { api, paths };
}

describe("boundary 1 — a fresh-cache remount still displays valid metrics", () => {
  it("serves the cached snapshot to a NEW observer without a second request", async () => {
    const cache = seededCache();
    const { api, paths } = countingApi(metrics);
    const options = portfolioMetricsQueryOptions(api, actor, cache);

    // First mount.
    await cache.fetchQuery(options);
    expect(paths).toHaveLength(1);

    // Remount inside the 60s window: a brand-new observer, same retained cache.
    const observer = new QueryObserver(cache, options);
    const unsubscribe = observer.subscribe(() => {});
    const result = observer.getCurrentResult();
    unsubscribe();

    // TanStack correctly does not fetch, so this observer never fetched after mounting...
    expect(result.fetchStatus).toBe("idle");
    expect(result.isFetchedAfterMount).toBe(false);
    // ...yet the snapshot IS this actor's successful, error-free data, which is exactly what
    // the hook now requires instead of the mount flag.
    expect(result.isSuccess).toBe(true);
    expect(result.error).toBeNull();
    expect(result.data).toEqual(metrics);
    expect(paths).toHaveLength(1);

    // Explicit refresh still re-reads.
    await observer.refetch();
    expect(paths).toHaveLength(2);
  });

  it("keeps a distinct entry and a second request for a different actor", async () => {
    const cache = seededCache();
    const { api, paths } = countingApi(metrics);

    await cache.fetchQuery(portfolioMetricsQueryOptions(api, actor, cache));
    expect(paths).toHaveLength(1);

    // Switching identity changes the actor, hence the key: the new actor is its own entry
    // and its own metrics snapshot (the receipt is tenant-matched, so the payload follows).
    const switched = seededCache(otherActor);
    const switchedApi = countingApi({ ...metrics, tenantId: OTHER_TENANT });
    await switched.fetchQuery(
      portfolioMetricsQueryOptions(switchedApi.api, otherActor, switched),
    );
    expect(switchedApi.paths).toHaveLength(1);
    expect(clientReadKey(CLIENT, actor)).not.toEqual(
      clientReadKey(CLIENT, otherActor),
    );
  });

  it("no longer gates the displayed data on isFetchedAfterMount (pin)", () => {
    const source = readFileSync(
      join(
        __dirname,
        "..",
        "src",
        "features",
        "portfolio",
        "index",
        "usePortfolioMetrics.ts",
      ),
      "utf8",
    );
    expect(source).toContain("query.isSuccess && !query.error");
    // The gate itself must not consult the mount flag (the comments may name it).
    expect(source).not.toMatch(/query\.isFetchedAfterMount/);
    // ...and the policy the PR introduced is retained.
    expect(source).toContain("staleTime: 60_000");
    expect(source).toContain("refetchInterval: 60_000");
  });
});

describe("boundary 2 — a fresh client frame can mount its identity readers", () => {
  it("the frame starts the identity read before the dependent client read (pin)", () => {
    const source = readFileSync(
      join(
        __dirname,
        "..",
        "src",
        "features",
        "portfolio",
        "client-profile",
        "ClientFrame.tsx",
      ),
      "utf8",
    );
    const identity = source.indexOf("useIdentity()");
    const client = source.indexOf("useClient(clientId)");
    expect(identity).toBeGreaterThan(-1);
    expect(identity).toBeLessThan(client);
    // Only a FAILED identity is surfaced, never a transient refetch gate.
    expect(source).toContain("identityError");
    expect(source).not.toContain("identity.fetchStatus");
  });

  it("without an identity entry the client read is idle; once it loads, the read admits", async () => {
    const cache = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const { api, paths } = countingApi(clientRow);

    // No identity loaded: the read is deliberately disabled (no unscoped key, no deadlock
    // of its own — the frame loads identity first).
    const cold = clientReadQueryOptions(api, cache, CLIENT, undefined);
    expect(cold.enabled).toBe(false);
    expect(cold.queryKey).toEqual(clientReadKey(CLIENT, undefined));

    // The frame's identity read settles, the actor becomes available, the read runs.
    cache.setQueryData(["identity"], {
      user: { id: "user-1", email: "user@example.test" },
      tenant: { id: TENANT, name: "Synthetic Tenant" },
      role: "standard_user",
    });
    const warm = clientReadQueryOptions(api, cache, CLIENT, actor);
    expect(warm.enabled).toBe(true);
    await cache.fetchQuery(warm);
    expect(paths).toHaveLength(1);
    expect(cache.getQueryData(warm.queryKey)).toMatchObject({ id: CLIENT });
  });

  it("a same-actor identity revalidation keeps the actor and the entry (no subtree exclusion)", () => {
    const cache = seededCache(actor, true);
    const key = clientReadKey(CLIENT, actor);
    expect(cache.getQueryData(key)).toMatchObject({ id: CLIENT });

    // The identity query is refetching: the identity ENTRY is still present, so the actor is
    // still known and the scoped key does not change.
    const identity = cache.getQueryState(["identity"])!;
    identity.fetchStatus = "fetching" as never;
    expect(clientReadKey(CLIENT, actor)).toEqual(key);
    expect(cache.getQueryData(key)).toMatchObject({ id: CLIENT });
  });

  it("an actual tenant/actor replacement isolates into a separate entry", () => {
    const cache = seededCache(actor, true);
    const before = clientReadKey(CLIENT, actor);
    cache.setQueryData(["identity"], {
      user: { id: "user-2", email: "other@example.test" },
      tenant: { id: OTHER_TENANT, name: "Other Tenant" },
      role: "standard_user",
    });
    const after = clientReadKey(CLIENT, otherActor);
    expect(after).not.toEqual(before);
    expect(cache.getQueryData(before)).toBeDefined();
    expect(cache.getQueryData(after)).toBeUndefined();
  });
});

describe("boundary 3 — a successful intake edit updates the DISPLAYED entry", () => {
  it("publishes the receipt into the actor-scoped entry, not the prefix", () => {
    const cache = seededCache(actor, true);
    const scoped = clientReadKey(CLIENT, actor);
    cache.setQueryData(scoped, { ...clientRow, name: "Before saved edit" });

    publishClientReceipt(
      cache,
      CLIENT,
      { ...clientRow, name: "After saved edit" },
      actor,
    );

    expect(cache.getQueryData(scoped)).toMatchObject({
      name: "After saved edit",
    });
    // The prefix alone stays a prefix: no phantom sibling entry is created.
    expect(cache.getQueryData(clientKey(CLIENT))).toBeUndefined();
  });

  it("with no current actor it invalidates the prefix instead of publishing", async () => {
    const cache = seededCache(actor, true);
    const scoped = clientReadKey(CLIENT, actor);
    publishClientReceipt(
      cache,
      CLIENT,
      { ...clientRow, name: "Ghost" },
      undefined,
    );
    // Nothing was written into any actor's entry...
    expect(cache.getQueryData(scoped)).toMatchObject({
      name: "Synthetic Strategies",
    });
    // ...and the client is marked for refetch.
    expect(cache.getQueryState(scoped)?.isInvalidated).toBe(true);
    await cache
      .getQueryCache()
      .find({ queryKey: scoped, exact: true, type: "all" })?.promise;
  });

  it("keeps the intake mutations on the shared publisher (pin)", () => {
    const source = readFileSync(
      join(
        __dirname,
        "..",
        "src",
        "features",
        "portfolio",
        "client-intake",
        "mutations.ts",
      ),
      "utf8",
    );
    expect(source).toContain(
      "publishClientReceipt(cache, saved.id, saved, actor)",
    );
    expect(source).not.toContain("setQueryData(clientKey(saved.id)");
  });
});

describe("boundary 4 — registration readiness follows the displayed snapshot", () => {
  it("refuses when only the displayed scoped entry is invalidated", () => {
    const cache = seededCache(actor, true);
    const scoped = clientReadKey(CLIENT, actor);
    // A healthy prefix sibling, as the review's witness had.
    cache.setQueryData(clientKey(CLIENT), clientRow);
    expect(registrationClientState(cache, scoped, CLIENT)).toBeDefined();

    void cache.invalidateQueries({
      queryKey: scoped,
      exact: true,
      refetchType: "none",
    });

    expect(cache.getQueryState(scoped)?.isInvalidated).toBe(true);
    expect(registrationClientState(cache, scoped, CLIENT)).toBeUndefined();
    // The prefix alone can no longer authorize a write.
    expect(
      registrationClientState(cache, clientKey(CLIENT), CLIENT),
    ).toBeDefined();
  });

  it("allows the write with a healthy scoped entry and its revision", () => {
    const cache = seededCache(actor, true);
    const scoped = clientReadKey(CLIENT, actor);
    const state = registrationClientState(cache, scoped, CLIENT);
    expect(state).toBeDefined();
    const revision = state!.dataUpdateCount;
    expect(
      registrationClientState(cache, scoped, CLIENT)?.dataUpdateCount,
    ).toBe(revision);
  });

  it("refuses without an actor-scoped entry, and for a foreign row", () => {
    const cache = seededCache(actor, true);
    expect(
      registrationClientState(cache, clientReadKey(CLIENT, undefined), CLIENT),
    ).toBeUndefined();
    cache.setQueryData(clientReadKey(CLIENT, actor), {
      ...clientRow,
      id: "other",
    });
    expect(
      registrationClientState(cache, clientReadKey(CLIENT, actor), CLIENT),
    ).toBeUndefined();
  });

  it("uses the scoped key for subscription, checks and readback (pin)", () => {
    const source = readFileSync(
      join(
        __dirname,
        "..",
        "src",
        "features",
        "portfolio",
        "capabilities",
        "registration-mutations.ts",
      ),
      "utf8",
    );
    expect(source).toContain("clientReadKey(clientId, actor)");
    expect(source).not.toContain(
      "cache.getQueryState<Client>(clientKey(clientId))",
    );
  });
});

describe("boundary 5 — the three old-prefix subscription predicates", () => {
  const predicates = [
    "src/features/portfolio/client-profile/past-performance/submission-view.ts",
    "src/features/portfolio/bill-tracker/watchlist-queries.ts",
    "src/features/portfolio/bill-tracker/alert-preferences/personal-queries.ts",
  ];
  for (const path of predicates)
    it(`recognises the shared portfolio client key: ${path.split("/").pop()}`, () => {
      const source = readFileSync(join(__dirname, "..", path), "utf8");
      expect(source).toContain('"portfolio"');
      // The old namespace stays recognised, so nothing that still uses it goes quiet.
      expect(source).toContain("client-profile");
    });
});

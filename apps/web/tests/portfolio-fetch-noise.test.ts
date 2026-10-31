import { describe, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { createApiClient } from "../src/shared/portfolio/api/http";
import { portfolioMetricsQueryOptions } from "../src/features/portfolio/index/usePortfolioMetrics";
import {
  clientKey,
  clientReadKey,
  clientReadQueryOptions,
} from "../src/features/portfolio/clients/client-read";
import { profileReadKey } from "../src/features/portfolio/client-profile/profile-keys";

const TENANT = "11111111-1111-4111-8111-111111111111";
const CLIENT = "22222222-2222-4222-8222-222222222222";
const END = "2026-10-31T12:00:00.000Z";
const START = "2026-10-01T12:00:00.000Z";

/** A valid "everything unavailable" metrics payload: the cheapest legal shape. */
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

const actor = {
  tenantId: TENANT,
  userId: "user-1",
  role: "standard_user",
} as never;

/** The canonical actor assertion reads this from the cache, so seed it once. */
function seededClient() {
  const client = new QueryClient();
  client.setQueryData(["identity"], {
    user: { id: "user-1", email: "user@example.test" },
    tenant: { id: TENANT, name: "Synthetic Tenant" },
    role: "standard_user",
  });
  return client;
}

function countingApi(payload: unknown) {
  const paths: string[] = [];
  const api = createApiClient(async (path) => {
    paths.push(String(path));
    return Response.json(payload);
  });
  return { api, paths };
}

/**
 * M6(b): search typing re-renders the portfolio index. The metrics query must serve
 * cache inside one refresh window instead of refetching on every mount/driven render.
 */
describe("portfolio metrics are not refetched per search keystroke", () => {
  it("issues one request across repeated mounts inside the stale window", async () => {
    const { api, paths } = countingApi(metrics);
    const client = seededClient();
    const options = portfolioMetricsQueryOptions(api, actor, client);

    // First mount.
    await client.fetchQuery(options);
    // Search typing: the index re-renders and the subtree can remount. Ten keystrokes
    // must not ten-times the metrics read.
    for (let key = 0; key < 10; key += 1) await client.fetchQuery(options);

    expect(paths).toHaveLength(1);
    expect(paths[0]).toContain("clients/metrics");
    // No forced remount fetch, and the 60s reload behaviour is preserved.
    expect(options).not.toHaveProperty("refetchOnMount");
    expect(options.staleTime).toBe(60_000);
    expect(options.refetchInterval).toBe(60_000);
  });

  it("still refetches when the data is stale or explicitly refreshed", async () => {
    const { api, paths } = countingApi(metrics);
    const client = seededClient();
    const options = portfolioMetricsQueryOptions(api, actor, client);

    await client.fetchQuery(options);
    await client.fetchQuery({ ...options, staleTime: 0 });

    expect(paths).toHaveLength(2);
  });
});

/**
 * M6(a)+(c): one client-detail read shared by the catalogue hook and the profile panels.
 */
describe("one /clients/{id} read per client profile", () => {
  const client = {
    id: CLIENT,
    tenantId: TENANT,
    name: "Synthetic Client",
    profileStatus: "complete",
    status: "active",
    sectorTag: "defense",
  };

  it("shares one cache entry between the catalogue key and the profile section key", () => {
    expect(profileReadKey(CLIENT, "saved-client", actor as never)).toEqual(
      clientReadKey(CLIENT, actor as never),
    );
    // The invalidation prefix every client write uses still matches the entry.
    expect(clientReadKey(CLIENT, actor as never).slice(0, 3)).toEqual([
      ...clientKey(CLIENT),
    ]);
  });

  it("issues exactly one GET when both consumers mount for the same client", async () => {
    const { api, paths } = countingApi(client);
    const cache = seededClient();
    const options = clientReadQueryOptions(api, cache, CLIENT, actor as never);

    // Both surfaces mount at once, as on a profile page (frame + panel).
    await Promise.all([cache.fetchQuery(options), cache.fetchQuery(options)]);
    // Opening the notes panel afterwards is served from the same entry.
    await cache.fetchQuery(options);

    expect(paths).toHaveLength(1);
    expect(paths[0]).toContain(`clients/${CLIENT}`);
  });

  it("keeps a distinct entry (and a second GET) for a different actor", async () => {
    const { api, paths } = countingApi(client);
    const cache = seededClient();
    await cache.fetchQuery(
      clientReadQueryOptions(api, cache, CLIENT, actor as never),
    );
    // The actor changes (same browser, different session): a distinct entry, a new GET.
    const other = {
      tenantId: TENANT,
      userId: "user-2",
      role: "standard_user",
    } as never;
    cache.setQueryData(["identity"], {
      user: { id: "user-2", email: "other@example.test" },
      tenant: { id: TENANT, name: "Synthetic Tenant" },
      role: "standard_user",
    });
    await cache.fetchQuery(clientReadQueryOptions(api, cache, CLIENT, other));

    expect(clientReadKey(CLIENT, actor as never)).not.toEqual(
      clientReadKey(CLIENT, other),
    );
    expect(paths).toHaveLength(2);
  });

  it("never exposes an unscoped key: the read waits for the actor", () => {
    const { api } = countingApi(client);
    const cache = seededClient();
    const options = clientReadQueryOptions(api, cache, CLIENT, undefined);

    expect(options.enabled).toBe(false);
    expect(options.queryKey).toEqual([...clientKey(CLIENT), "unavailable"]);
    expect(options.staleTime).toBe(30_000);
    expect(options).not.toHaveProperty("refetchOnMount");
  });
});

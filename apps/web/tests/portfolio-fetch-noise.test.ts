import { describe, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { createApiClient } from "../src/shared/portfolio/api/http";
import { portfolioMetricsQueryOptions } from "../src/features/portfolio/index/usePortfolioMetrics";
import { profileClientQueryOptions } from "../src/features/portfolio/client-profile/profile-read-queries";

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
 * M6(c): opening a panel must render the client the drawer already loaded. The
 * query no longer forces a mount refetch; it refreshes only when stale.
 */
describe("the client detail read is cache-first for panels opened over it", () => {
  it("declares no forced mount refetch and keeps a stale window", () => {
    const client = seededClient();
    const { api } = countingApi({});
    const options = profileClientQueryOptions(
      api,
      client,
      CLIENT,
      actor as never,
    );

    expect(options).not.toHaveProperty("refetchOnMount");
    expect(options.staleTime).toBe(30_000);
    expect(options.queryKey).toEqual(
      expect.arrayContaining(["client-profile", CLIENT, "saved-client"]),
    );
  });
});

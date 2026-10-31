import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { QueryClient } from "@tanstack/react-query";
import { createApiClient } from "../src/shared/portfolio/api/http";
import {
  clientReadKey,
  clientReadQueryOptions,
} from "../src/shared/portfolio/api/client-read";
import { currentReadActor } from "../src/shared/portfolio/auth/current-actor";
import { currentClientWriter } from "../src/shared/portfolio/auth/client-writer";

const TENANT = "11111111-1111-4111-8111-111111111111";
const OTHER = "99999999-9999-4999-8999-999999999999";
const CLIENT = "22222222-2222-4222-8222-222222222222";

const identity = (tenantId = TENANT, userId = "user-1") => ({
  user: { id: userId, email: "user@example.test" },
  tenant: { id: tenantId, name: "Synthetic Tenant" },
  role: "standard_user",
});

const clientRow = (tenantId: string | undefined = TENANT) => ({
  id: CLIENT,
  name: "Synthetic Strategies",
  profileStatus: "active",
  status: "active",
  ...(tenantId ? { tenantId } : {}),
});

function cacheWith(row: unknown) {
  const cache = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  cache.setQueryData(["identity"], identity());
  const paths: string[] = [];
  const api = createApiClient(async (path) => {
    paths.push(String(path));
    return Response.json(row);
  });
  const actor = currentReadActor(cache)!;
  return { cache, api, paths, actor };
}

describe("finding 1 — a same-actor identity revalidation keeps the admitted read", () => {
  it("keeps the read key, the data and the actor while identity refetches", async () => {
    const { cache, api, paths, actor } = cacheWith(clientRow());
    const options = clientReadQueryOptions(api, cache, CLIENT, actor);
    await cache.fetchQuery(options);
    expect(paths).toHaveLength(1);
    expect(cache.getQueryData(options.queryKey)).toMatchObject({ id: CLIENT });

    // An ordinary same-actor revalidation: the identity entry is fetching, not errored.
    const state = cache.getQueryState(["identity"])!;
    state.fetchStatus = "fetching" as never;

    // The READ identity survives, so the frame keeps its key, its data and its children.
    expect(currentReadActor(cache)?.userId).toBe("user-1");
    expect(currentReadActor(cache)?.tenantId).toBe(TENANT);
    const during = clientReadQueryOptions(
      api,
      cache,
      CLIENT,
      currentReadActor(cache),
    );
    expect(during.queryKey).toEqual(options.queryKey);
    expect(during.enabled).toBe(true);
    expect(cache.getQueryData(during.queryKey)).toMatchObject({ id: CLIENT });
    // ...and no extra GET is issued merely because identity revalidated.
    expect(paths).toHaveLength(1);

    // The WRITE guard is untouched: it still refuses during that revalidation.
    expect(currentClientWriter(cache)).toBeUndefined();

    // Settlement restores normal readiness without another client request.
    state.fetchStatus = "idle" as never;
    expect(currentClientWriter(cache)?.userId).toBe("user-1");
    expect(paths).toHaveLength(1);
  });

  it("still surfaces an identity FAILURE as no actor (error/retry path)", () => {
    const { cache } = cacheWith(clientRow());
    const state = cache.getQueryState(["identity"])!;
    state.status = "error" as never;
    state.error = new Error("identity unavailable") as never;
    expect(currentReadActor(cache)).toBeUndefined();
  });

  it("isolates a real tenant/actor replacement into a different key", async () => {
    const { cache, api, actor } = cacheWith(clientRow());
    await cache.fetchQuery(clientReadQueryOptions(api, cache, CLIENT, actor));
    const before = clientReadKey(CLIENT, currentReadActor(cache));
    cache.setQueryData(["identity"], identity(OTHER, "user-2"));
    const after = clientReadKey(CLIENT, currentReadActor(cache));
    expect(after).not.toEqual(before);
    expect(cache.getQueryData(before)).toBeDefined();
    expect(cache.getQueryData(after)).toBeUndefined();
  });
});

describe("finding 2 — the shared entry is only populated through the canonical receipt", () => {
  it("rejects a response carrying the requested id but a different tenant", async () => {
    const { cache, api, actor } = cacheWith(clientRow(OTHER));
    const options = clientReadQueryOptions(api, cache, CLIENT, actor);

    await expect(cache.fetchQuery(options)).rejects.toThrow(
      /unexpected response/,
    );
    // Nothing was published into the shared entry the frame/profile readers consult.
    expect(cache.getQueryData(options.queryKey)).toBeUndefined();
  });

  it("accepts the normal receipt and keeps one shared GET", async () => {
    const { cache, api, paths, actor } = cacheWith(clientRow());
    const options = clientReadQueryOptions(api, cache, CLIENT, actor);
    await cache.fetchQuery(options);
    await cache.fetchQuery(options);
    expect(paths).toHaveLength(1);
    expect(cache.getQueryData(clientReadKey(CLIENT, actor))).toMatchObject({
      id: CLIENT,
    });
  });

  it("has exactly ONE producer for the shared key (pin)", () => {
    const selected = readFileSync(
      join(__dirname, "..", "src", "shared", "session", "SelectedClient.tsx"),
      "utf8",
    );
    expect(selected).toContain("clientReadQueryOptions");
    // No private queryFn/schema on the shared key any more.
    expect(selected).not.toContain("clientSchema.refine");
  });
});

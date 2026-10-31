import { describe, expect, it, vi } from "vitest";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { createApiClient } from "../src/shared/portfolio/api/http";
import { clientReadKey } from "../src/shared/portfolio/api/client-read";
import { recordedActivitySchema } from "../src/features/portfolio/client-profile/recorded-activity-contract";
import { recordedActivityQueryOptions } from "../src/features/portfolio/client-profile/useRecordedActivity";

const actor = {
  userId: "synthetic-user",
  tenantId: "synthetic-tenant",
  role: "standard_user",
};
const zero = () => ({
  meetings: 0,
  emails: 0,
  tasksCompleted: 0,
  debriefs: 0,
  outreachSent: 0,
});
function response() {
  return {
    version: 1,
    measure: "recorded_activity_index",
    basis: "Recorded activity index",
    disclosure:
      "Measures internal logging, not relationship quality or effectiveness.",
    scope: {
      tenantId: actor.tenantId,
      actorUserId: actor.userId,
      clientId: "client-a",
    },
    asOf: "2026-10-31T12:00:00.000Z",
    period: "7d",
    window: {
      from: "2026-10-24T12:00:00.000Z",
      to: "2026-10-31T12:00:00.000Z",
    },
    comparisonWindow: {
      from: "2026-10-17T12:00:00.000Z",
      to: "2026-10-24T12:00:00.000Z",
    },
    timestampBasis: {
      meetings: "startsAt",
      emails: "mailThread.lastMessageAt",
      tasksCompleted: "doneTask.updatedAt",
      debriefs: "createdAt",
      outreachSent: "sentAt",
    },
    status: "complete",
    reason: null,
    score: 0,
    priorScore: 0,
    trend: "stable",
    breakdown: zero(),
    priorBreakdown: zero(),
  };
}
const schema = recordedActivitySchema("client-a", actor);
function admitted() {
  const cache = new QueryClient();
  cache.setQueryData(["identity"], {
    user: { id: actor.userId, email: null },
    tenant: { id: actor.tenantId, name: "Synthetic" },
    role: actor.role,
  });
  cache.setQueryData(clientReadKey("client-a", actor), { id: "client-a" });
  return cache;
}
describe("versioned recorded activity receiving", () => {
  it("accepts complete authorized zero without inventing missing values", () =>
    expect(schema.parse(response()).score).toBe(0));
  it.each(["capacity", "changed"])(
    "accepts all-null %s without converting to zero",
    (reason) => {
      const value = schema.parse({
        ...response(),
        status: "incomplete",
        reason,
        score: null,
        priorScore: null,
        breakdown: null,
        priorBreakdown: null,
        trend: null,
      });
      expect(value.score).toBeNull();
      expect(schema.safeParse({ ...value, score: 0 }).success).toBe(false);
    },
  );
  it.each(["tenantId", "actorUserId", "clientId"])(
    "rejects foreign %s",
    (key) => {
      const value = response();
      Object.assign(value.scope, { [key]: "different" });
      expect(schema.safeParse(value).success).toBe(false);
    },
  );
  it.each([
    "version",
    "measure",
    "basis",
    "disclosure",
    "period",
    "score",
    "trend",
    "timestampBasis",
  ])("rejects invalid %s", (key) => {
    expect(schema.safeParse({ ...response(), [key]: "wrong" }).success).toBe(
      false,
    );
  });
  it("rejects legacy and partial score payloads", () => {
    expect(schema.safeParse({ score: 42, trend: "stable" }).success).toBe(
      false,
    );
    expect(schema.safeParse({ ...response(), breakdown: null }).success).toBe(
      false,
    );
  });
  it.each(["window", "comparisonWindow"])(
    "rejects incorrect %s bounds",
    (key) => {
      expect(
        schema.safeParse({ ...response(), [key]: response().window }).success,
      ).toBe(key === "window");
      expect(
        schema.safeParse({
          ...response(),
          [key]: { from: response().asOf, to: response().asOf },
        }).success,
      ).toBe(false);
    },
  );
  it("verifies weighted scores, caps, and strict trend thresholds", () => {
    const value = response();
    value.breakdown.outreachSent = 1;
    value.score = 5;
    expect(schema.safeParse(value).success).toBe(true);
    value.trend = "improving";
    expect(schema.safeParse(value).success).toBe(false);
    value.breakdown.emails = 1;
    value.score = 7;
    expect(schema.safeParse(value).success).toBe(true);
    value.breakdown.meetings = 10;
    value.score = 100;
    expect(schema.safeParse(value).success).toBe(true);
    value.score = 99;
    expect(schema.safeParse(value).success).toBe(false);
    const prior = response();
    prior.priorBreakdown.outreachSent = 1;
    prior.priorScore = 5;
    expect(schema.safeParse(prior).success).toBe(true);
    prior.priorBreakdown.emails = 1;
    prior.priorScore = 7;
    prior.trend = "declining";
    expect(schema.safeParse(prior).success).toBe(true);
  });
  it.each([-1, 0.5, NaN])("rejects invalid source counts %s", (count) => {
    const value = response();
    value.breakdown.emails = count;
    expect(schema.safeParse(value).success).toBe(false);
  });
});
describe("recorded activity read admission and currentness", () => {
  it.each([undefined, 1] as const)(
    "does not read without current client admission, gate %s",
    (version) => {
      const fetcher = vi.fn();
      const options = recordedActivityQueryOptions(
        createApiClient(fetcher),
        admitted(),
        "client-a",
        actor,
        version,
        false,
      );
      expect(options.enabled).toBe(false);
      return expect(options.queryFn({ signal: new AbortController().signal }))
        .rejects.toThrow()
        .then(() => expect(fetcher).not.toHaveBeenCalled());
    },
  );
  it("does not read before producer activation even with a client", async () => {
    const fetcher = vi.fn();
    const options = recordedActivityQueryOptions(
      createApiClient(fetcher),
      admitted(),
      "client-a",
      actor,
      undefined,
      true,
    );
    expect(options.enabled).toBe(false);
    await expect(
      options.queryFn({ signal: new AbortController().signal }),
    ).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("reads the exact scoped GET with cancellation and no-store", async () => {
    const fetcher = vi.fn(async () => Response.json(response()));
    const options = recordedActivityQueryOptions(
      createApiClient(fetcher),
      admitted(),
      "client-a",
      actor,
      1,
      true,
    );
    const signal = new AbortController().signal;
    expect(options.enabled).toBe(true);
    expect(options.retry).toBe(false);
    expect((await options.queryFn({ signal })).score).toBe(0);
    expect(fetcher).toHaveBeenCalledWith(
      "/api/backend/core/intelligence/clients/client-a/health-score",
      expect.objectContaining({ method: "GET", cache: "no-store", signal }),
    );
  });
  it.each(["actor", "client", "error", "revision", "abort"])(
    "discards a late response after %s changes",
    async (kind) => {
      const cache = admitted();
      const controller = new AbortController();
      const fetcher = vi.fn(async () => {
        if (kind === "actor")
          cache.setQueryData(["identity"], {
            user: { id: "other", email: null },
            tenant: { id: actor.tenantId, name: "Synthetic" },
            role: actor.role,
          });
        if (kind === "client")
          cache.removeQueries({ queryKey: clientReadKey("client-a", actor) });
        if (kind === "revision")
          cache.setQueryData(clientReadKey("client-a", actor), {
            id: "client-a",
          });
        if (kind === "error")
          cache
            .getQueryCache()
            .find({ queryKey: clientReadKey("client-a", actor) })
            ?.setState({ status: "error", error: new Error("denied") });
        if (kind === "abort") controller.abort();
        return Response.json(response());
      });
      await expect(
        recordedActivityQueryOptions(
          createApiClient(fetcher),
          cache,
          "client-a",
          actor,
          1,
          true,
        ).queryFn({ signal: controller.signal }),
      ).rejects.toThrow();
    },
  );
  it.each([403, 404, 503])("keeps HTTP %s unavailable", async (status) => {
    const api = createApiClient(async () =>
      Response.json({ message: "unavailable" }, { status }),
    );
    await expect(
      recordedActivityQueryOptions(
        api,
        admitted(),
        "client-a",
        actor,
        1,
        true,
      ).queryFn({ signal: new AbortController().signal }),
    ).rejects.toThrow();
  });
});

describe("recorded activity cached selection", () => {
  it("revalidates a cached result on mount despite the shared 30-second freshness default", async () => {
    const cache = admitted();
    cache.setDefaultOptions({ queries: { staleTime: 30_000 } });
    const fetcher = vi.fn(async () => Response.json(response()));
    const options = recordedActivityQueryOptions(
      createApiClient(fetcher),
      cache,
      "client-a",
      actor,
      1,
      true,
    );
    cache.setQueryData(options.queryKey, schema.parse(response()));
    const observer = new QueryObserver(cache, options);
    const unsubscribe = observer.subscribe(() => undefined);
    expect(observer.getCurrentResult().isFetching).toBe(true);
    await vi.waitFor(() =>
      expect(observer.getCurrentResult().isFetchedAfterMount).toBe(true),
    );
    expect(fetcher).toHaveBeenCalledOnce();
    expect(observer.getCurrentResult().isSuccess).toBe(true);
    unsubscribe();
    cache.clear();
  });
  it("separates client, actor and activation versions in cache keys", () => {
    const cache = admitted();
    const api = createApiClient(vi.fn());
    const key = recordedActivityQueryOptions(
      api,
      cache,
      "client-a",
      actor,
      1,
      true,
    ).queryKey;
    expect(
      recordedActivityQueryOptions(api, cache, "client-b", actor, 1, true)
        .queryKey,
    ).not.toEqual(key);
    expect(
      recordedActivityQueryOptions(
        api,
        cache,
        "client-a",
        { ...actor, userId: "other" },
        1,
        true,
      ).queryKey,
    ).not.toEqual(key);
    expect(
      recordedActivityQueryOptions(
        api,
        cache,
        "client-a",
        actor,
        undefined,
        true,
      ).queryKey,
    ).not.toEqual(key);
  });
});

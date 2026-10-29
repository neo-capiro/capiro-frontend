import { QueryClient } from "@tanstack/react-query";
import { afterEach, expect, it } from "vitest";
import { observeActivityCompletion } from "../src/features/portfolio/client-profile/activity-completion";
import { profileKey } from "../src/features/portfolio/client-profile/profile-keys";

const actor = { userId: "actor-a", tenantId: "tenant-a" };
const activityKey = profileKey("client-a", "activity");
const identity = (userId = actor.userId, tenantId = actor.tenantId) => ({
  user: { id: userId, email: "synthetic@example.test" },
  tenant: { id: tenantId, name: "Synthetic tenant" },
  role: "user_admin",
});
const caches: QueryClient[] = [];
function setup() {
  const cache = new QueryClient();
  caches.push(cache);
  cache.setQueryData(["identity"], identity());
  cache.setQueryData(activityKey, [{ id: "activity-a" }]);
  return {
    cache,
    completion: observeActivityCompletion(cache, "client-a", actor),
  };
}
afterEach(() => {
  for (const cache of caches.splice(0)) cache.clear();
});

it("refreshes the existing feed and its counts while the original actor remains current", async () => {
  const { cache, completion } = setup();
  const otherClient = profileKey("client-b", "activity");
  const descendant = [...activityKey, "unrelated-projection"];
  const metrics = [...activityKey, "metrics", "current-actor"];
  cache.setQueryData(otherClient, []);
  cache.setQueryData(descendant, []);
  cache.setQueryData(metrics, { counts: {} });
  await completion.invalidate();
  expect(cache.getQueryState(activityKey)?.isInvalidated).toBe(true);
  expect(cache.getQueryState(otherClient)?.isInvalidated).toBe(false);
  expect(cache.getQueryState(descendant)?.isInvalidated).toBe(false);
  expect(cache.getQueryState(metrics)?.isInvalidated).toBe(true);
  completion.dispose();
});

it.each(["actor", "tenant", "role", "invalidated"] as const)(
  "a %s authority round trip cannot reacquire old completion eligibility",
  async (boundary) => {
    const { cache, completion } = setup();
    if (boundary === "invalidated")
      await cache.invalidateQueries({
        queryKey: ["identity"],
        refetchType: "none",
      });
    else
      cache.setQueryData(
        ["identity"],
        boundary === "actor"
          ? identity("actor-b")
          : boundary === "tenant"
            ? identity(actor.userId, "tenant-b")
            : { ...identity(), role: "basic_user" },
      );
    cache.setQueryData(["identity"], identity());
    await completion.invalidate();
    expect(cache.getQueryState(activityKey)?.isInvalidated).toBe(false);
    completion.dispose();
  },
);

it.each(["activity", "identity", "entire-cache"] as const)(
  "a replaced %s query instance cannot inherit the former completion",
  async (boundary) => {
    const { cache, completion } = setup();
    if (boundary === "entire-cache") cache.clear();
    else
      cache.removeQueries({
        queryKey: boundary === "identity" ? ["identity"] : activityKey,
        exact: true,
      });
    cache.setQueryData(["identity"], identity());
    cache.setQueryData(activityKey, [{ id: "replacement-current-record" }]);
    await completion.invalidate();
    expect(cache.getQueryState(activityKey)?.isInvalidated).toBe(false);
    expect(cache.getQueryData(activityKey)).toEqual([
      { id: "replacement-current-record" },
    ]);
    completion.dispose();
  },
);

it("a feed missing at capture is not adopted when it later appears", async () => {
  const { cache, completion: prior } = setup();
  prior.dispose();
  cache.removeQueries({ queryKey: activityKey, exact: true });
  const completion = observeActivityCompletion(cache, "client-a", actor);
  cache.setQueryData(activityKey, [{ id: "new-current-record" }]);
  await completion.invalidate();
  expect(cache.getQueryState(activityKey)?.isInvalidated).toBe(false);
  completion.dispose();
});

it("disposed completion cannot refresh even while the actor remains current", async () => {
  const { cache, completion } = setup();
  completion.dispose();
  await completion.invalidate();
  expect(cache.getQueryState(activityKey)?.isInvalidated).toBe(false);
});

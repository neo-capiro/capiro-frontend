import { describe, expect, it } from "vitest";
import {
  assertWatchlistView,
  currentWatchlistReader,
  currentWatchlistView,
} from "../src/features/portfolio/bill-tracker/watchlist-source";
import {
  createWatchlistSession,
  unconfirmedWatchlistDraft,
  watchlistUnconfirmed,
} from "../src/features/portfolio/bill-tracker/watchlist-session";
import { ApiError } from "../src/shared/portfolio/api/http";
import {
  watchlistActor,
  watchlistClientId,
  watchlistFixture,
} from "./watchlist-current-fixtures";

it("retains legitimate Core standard_user authority without inventing a Clerk echo", () => {
  const { cache, view } = watchlistFixture("core", "standard_user");
  expect(view.reader.actor.userId).toBe("database-user");
  expect(() => assertWatchlistView(cache, view, true)).not.toThrow();
});
it("lets Intel readers review current targeting while its native administrator write guard remains explicit", () => {
  const { cache, view } = watchlistFixture("intelligence", "standard_user");
  expect(() => assertWatchlistView(cache, view)).not.toThrow();
  expect(() => assertWatchlistView(cache, view, true)).toThrow("administrator");
});
it.each([
  "client",
  "targeting",
  "taxonomy",
  "jurisdictions",
  "identity",
] as const)(
  "withholds the combined projection when %s is invalidated",
  (source) => {
    const { cache, view, keys } = watchlistFixture();
    void cache.invalidateQueries({
      queryKey: keys[source],
      exact: true,
      refetchType: "none",
    });
    expect(
      currentWatchlistView(cache, watchlistClientId, "intelligence"),
    ).toBeUndefined();
    expect(() => assertWatchlistView(cache, view)).toThrow();
  },
);
it.each(["client", "targeting", "taxonomy", "jurisdictions"] as const)(
  "retained %s data under a failed read does not prove a current view",
  (source) => {
    const { cache, keys } = watchlistFixture();
    const query = cache
      .getQueryCache()
      .find({ queryKey: keys[source], exact: true })!;
    expect(query.state.data).toBeDefined();
    query.setState({ status: "error", error: new ApiError(403, "Denied") });
    expect(
      currentWatchlistView(cache, watchlistClientId, "intelligence"),
    ).toBeUndefined();
  },
);
it.each([{ id: "other-client" }, { tenantId: "other-tenant" }])(
  "requires the exact native client association even for a valid default watchlist (%j)",
  (replacement) => {
    const { cache, keys } = watchlistFixture("core");
    const original = cache.getQueryData<Record<string, unknown>>(keys.client)!;
    cache.setQueryData(keys.client, { ...original, ...replacement });
    expect(
      currentWatchlistView(cache, watchlistClientId, "core"),
    ).toBeUndefined();
  },
);
it("does not reuse a previous actor's successful query entries", () => {
  const { cache } = watchlistFixture();
  cache.setQueryData(["identity"], {
    ...watchlistActor,
    user: { ...watchlistActor.user, id: "other-user" },
  });
  expect(currentWatchlistReader(cache)?.actor.userId).toBe("other-user");
  expect(
    currentWatchlistView(cache, watchlistClientId, "intelligence"),
  ).toBeUndefined();
});

describe("one interrupted native attempt", () => {
  it.each([
    "client",
    "targeting",
    "taxonomy",
    "jurisdictions",
    "identity",
  ] as const)(
    "latches %s invalidation even when the same callback restores its data",
    (source) => {
      const { cache, keys, view, draft } = watchlistFixture();
      const session = createWatchlistSession(cache, view, true, () => {});
      session.dispatch(draft);
      const original = structuredClone(cache.getQueryData(keys[source]));
      void cache.invalidateQueries({
        queryKey: keys[source],
        exact: true,
        refetchType: "none",
      });
      cache.setQueryData(keys[source], original);
      expect(session.signal.aborted).toBe(true);
      expect(() => session.confirm()).toThrow();
      expect(watchlistUnconfirmed(cache, view)).toBe(true);
      session.close();
    },
  );
  it("keeps the sent draft and uncertainty across closing, reopening and explicit read-only review", () => {
    const { cache, view, draft } = watchlistFixture("core");
    draft.topics[0]!.label = "Unacknowledged value";
    const first = createWatchlistSession(cache, view, true, () => {});
    first.dispatch(draft);
    first.close();
    expect(unconfirmedWatchlistDraft(cache, view)?.topics[0]!.label).toBe(
      "Unacknowledged value",
    );
    const reopened = createWatchlistSession(cache, view, false, () => {});
    expect(() => reopened.dispatch(draft)).toThrow("unconfirmed");
    const readValues = { ...draft, topics: [] };
    reopened.review(readValues);
    expect(unconfirmedWatchlistDraft(cache, view)?.topics).toEqual([]);
    expect(watchlistUnconfirmed(cache, view)).toBe(true);
    reopened.close();
  });
  it("permits correction after Intel's definite 428 refusal without treating it as an unknown write", () => {
    const { cache, view, draft } = watchlistFixture();
    const session = createWatchlistSession(cache, view, true, () => {});
    session.dispatch(draft);
    session.reject(new ApiError(428, "Reload a native version"));
    expect(watchlistUnconfirmed(cache, view)).toBe(false);
    session.close();
  });
  it("does not clear a fence after a transport or receipt failure", () => {
    const { cache, view, draft } = watchlistFixture("core");
    const session = createWatchlistSession(cache, view, true, () => {});
    session.dispatch(draft);
    session.reject(new ApiError(502, "Unexpected native receipt"));
    expect(watchlistUnconfirmed(cache, view)).toBe(true);
    session.close();
  });
});

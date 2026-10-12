import { expect, it } from "vitest";
import {
  coreWatchlistReceipt,
  fromCoreWatchlist,
} from "../src/features/portfolio/bill-tracker/watchlist-contracts";
import { createWatchlistSession } from "../src/features/portfolio/bill-tracker/watchlist-session";
import { writeWatchlist } from "../src/features/portfolio/bill-tracker/watchlist-writer";
import {
  watchlistApi,
  watchlistClient,
  watchlistFixture,
  nativeCoreWatchlist,
  nativeIntelWatchlist,
} from "./watchlist-current-fixtures";

it("accepts Core's documented trimming/deduplication and detects loss of any legacy term family", () => {
  const submitted = {
    ...nativeCoreWatchlist,
    tags: [
      {
        ...nativeCoreWatchlist.tags[0]!,
        tag: " Sensors ",
        synonyms: [" Radar ", "Radar", ""],
        relatedEntities: [" Agency "],
        riskTerms: [" Prohibition "],
      },
    ],
  };
  expect(
    coreWatchlistReceipt(submitted).safeParse(nativeCoreWatchlist).success,
  ).toBe(true);
  for (const family of ["synonyms", "relatedEntities", "riskTerms"] as const) {
    const incomplete = {
      ...nativeCoreWatchlist,
      tags: [{ ...nativeCoreWatchlist.tags[0]!, [family]: [] }],
    };
    expect(coreWatchlistReceipt(submitted).safeParse(incomplete).success).toBe(
      false,
    );
  }
});

it("sends Core's unchanged five-field tag projection after exact client and current saved-targeting preflights", async () => {
  const { cache, view, draft } = watchlistFixture("core", "standard_user");
  draft.topics[0]!.label = "Edited sensors";
  const { api, calls } = watchlistApi((request) =>
    request.method === "PUT"
      ? request.body
      : request.path.endsWith("/watchlist")
        ? nativeCoreWatchlist
        : watchlistClient,
  );
  const session = createWatchlistSession(cache, view, true, () => {});
  const result = await writeWatchlist(
    api,
    view,
    draft,
    session.current,
    session.signal,
    () => session.dispatch(draft),
  );
  expect(calls.map((request) => request.method)).toEqual(["GET", "GET", "PUT"]);
  expect(calls[0]!.path).toBe(`/api/backend/core/clients/${view.clientId}`);
  expect(calls[2]!.body).toEqual({
    ...nativeCoreWatchlist,
    tags: [{ ...nativeCoreWatchlist.tags[0]!, tag: "Edited sensors" }],
  });
  expect(result.topics[0]!.terms).toEqual(
    fromCoreWatchlist(nativeCoreWatchlist).topics[0]!.terms,
  );
  session.confirm();
  session.close();
});

it("refuses Core's observed intervening saved-value change before any PUT", async () => {
  const { cache, view, draft } = watchlistFixture("core");
  const { api, calls } = watchlistApi((request) =>
    request.path.endsWith("/watchlist")
      ? { ...nativeCoreWatchlist, tags: [] }
      : watchlistClient,
  );
  const session = createWatchlistSession(cache, view, true, () => {});
  await expect(
    writeWatchlist(api, view, draft, session.current, session.signal, () =>
      session.dispatch(draft),
    ),
  ).rejects.toMatchObject({ status: 409 });
  expect(calls.map((request) => request.method)).toEqual(["GET", "GET"]);
  expect(session.dispatched()).toBe(false);
  session.close();
});

it("does not silently normalize unsupported Core issue-area aliases on the client", async () => {
  const { cache, view, draft } = watchlistFixture("core");
  draft.issueAreas = ["unreviewed-alias"];
  const { api, calls } = watchlistApi((request) =>
    request.path.endsWith("/watchlist") ? nativeCoreWatchlist : watchlistClient,
  );
  const session = createWatchlistSession(cache, view, true, () => {});
  await expect(
    writeWatchlist(api, view, draft, session.current, session.signal, () =>
      session.dispatch(draft),
    ),
  ).rejects.toMatchObject({ status: 400 });
  expect(calls.every((request) => request.method === "GET")).toBe(true);
  session.close();
});

it("rejects an exact-client preflight mismatch before Core or Intel can dispatch targeting", async () => {
  for (const backend of ["core", "intelligence"] as const) {
    const { cache, view, draft } = watchlistFixture(backend);
    const { api, calls } = watchlistApi(() => ({
      ...watchlistClient,
      id: "other-client",
    }));
    const session = createWatchlistSession(cache, view, true, () => {});
    await expect(
      writeWatchlist(api, view, draft, session.current, session.signal, () =>
        session.dispatch(draft),
      ),
    ).rejects.toMatchObject({ status: 502 });
    expect(calls).toHaveLength(1);
    expect(session.dispatched()).toBe(false);
    session.close();
  }
});

it("does not proceed past a held client preflight after synchronous authority interruption and restoration", async () => {
  const { cache, view, draft, keys } = watchlistFixture();
  const { api, calls } = watchlistApi(() => {
    const identity = structuredClone(cache.getQueryData(keys.identity));
    void cache.invalidateQueries({
      queryKey: keys.identity,
      exact: true,
      refetchType: "none",
    });
    cache.setQueryData(keys.identity, identity);
    return watchlistClient;
  });
  const session = createWatchlistSession(cache, view, true, () => {});
  await expect(
    writeWatchlist(api, view, draft, session.current, session.signal, () =>
      session.dispatch(draft),
    ),
  ).rejects.toThrow();
  expect(calls).toHaveLength(1);
  expect(session.dispatched()).toBe(false);
  session.close();
});

it("rejects Core's shape-valid old projection after one dispatched PUT", async () => {
  const { cache, view, draft } = watchlistFixture("core");
  draft.topics[0]!.label = "New value";
  const { api, calls } = watchlistApi((request) =>
    request.path.endsWith("/watchlist") ? nativeCoreWatchlist : watchlistClient,
  );
  const session = createWatchlistSession(cache, view, true, () => {});
  await expect(
    writeWatchlist(api, view, draft, session.current, session.signal, () =>
      session.dispatch(draft),
    ),
  ).rejects.toMatchObject({ status: 502 });
  expect(calls.filter((request) => request.method === "PUT")).toHaveLength(1);
  session.close();
});

it.each([7, 9])(
  "does not accept Intel version %i as the expected version-8 receipt",
  async (version) => {
    const { cache, view, draft } = watchlistFixture();
    const { api, calls } = watchlistApi((request) =>
      request.method === "PUT"
        ? { ...nativeIntelWatchlist, version }
        : watchlistClient,
    );
    const session = createWatchlistSession(cache, view, true, () => {});
    await expect(
      writeWatchlist(api, view, draft, session.current, session.signal, () =>
        session.dispatch(draft),
      ),
    ).rejects.toMatchObject({ status: 502 });
    expect(calls.map((request) => request.method)).toEqual(["GET", "PUT"]);
    session.close();
  },
);

it("retains Intel partial rejections and exact version without inventing a Core-style identity echo", async () => {
  const { cache, view, draft } = watchlistFixture();
  const rejected = {
    topics: [],
    terms: [{ topicLabel: "Sensors", value: "xx", reason: "Term too short" }],
  };
  const { api, calls } = watchlistApi((request) =>
    request.method === "PUT"
      ? { ...nativeIntelWatchlist, version: 8, rejected }
      : watchlistClient,
  );
  const session = createWatchlistSession(cache, view, true, () => {});
  const result = await writeWatchlist(
    api,
    view,
    draft,
    session.current,
    session.signal,
    () => session.dispatch(draft),
  );
  expect(result.rejected).toEqual(rejected);
  expect(calls[1]!.body).toMatchObject({
    expectedVersion: 7,
    jurisdictions: ["VA"],
  });
  session.confirm();
  session.close();
});

it("rejects an Intel receipt for another client despite the expected version", async () => {
  const { cache, view, draft } = watchlistFixture();
  const { api } = watchlistApi((request) =>
    request.method === "PUT"
      ? { ...nativeIntelWatchlist, clientId: "other-client", version: 8 }
      : watchlistClient,
  );
  const session = createWatchlistSession(cache, view, true, () => {});
  await expect(
    writeWatchlist(api, view, draft, session.current, session.signal, () =>
      session.dispatch(draft),
    ),
  ).rejects.toMatchObject({ status: 502 });
  session.close();
});

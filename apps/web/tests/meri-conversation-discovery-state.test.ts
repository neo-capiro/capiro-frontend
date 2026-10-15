import { describe, expect, it } from "vitest";
import {
  createDiscoveryState,
  reduceDiscovery,
  type DiscoveryRequest,
  type DiscoveryState,
} from "../src/shared/meri-conversations/discovery-state";

const scope = {
  tenantId: "synthetic-tenant",
  actorId: "synthetic-actor",
  selectedClientId: "synthetic-client",
};
function load(state = createDiscoveryState(scope)) {
  const loading = reduceDiscovery(state, { type: "load" });
  expect(loading.status).toBe("loading");
  expect(loading.request).not.toBeNull();
  return { state: loading, request: loading.request! };
}
function page(
  loading: { state: DiscoveryState; request: DiscoveryRequest },
  rowKeys: readonly string[],
  nextCursor: string | null,
) {
  return reduceDiscovery(loading.state, {
    type: "page",
    request: loading.request,
    rowKeys,
    nextCursor,
  });
}

describe("local discovery progress, without a protocol adapter", () => {
  it("starts idle; no empty result or request is invented", () => {
    const state = createDiscoveryState(scope);
    expect(state.status).toBe("idle");
    expect(state.rowKeys).toEqual([]);
    expect(state.request).toBeNull();
    const loading = load(state);
    expect(loading.request.cursor).toBeNull();
    expect(loading.request.scope).toBe(state.scope);
  });

  it("only an accepted complete zero traversal becomes empty", () => {
    const loading = load();
    expect(page(loading, [], null).status).toBe("empty");
    expect(page(loading, [], "page-a").status).toBe("more");
  });

  it("advances through zero-visible pages without inferring empty", () => {
    const first = page(load(), [], "page-a");
    const second = load(first);
    expect(second.request.cursor).toBe("page-a");
    const third = load(page(second, [], "page-b"));
    expect(third.request.cursor).toBe("page-b");
    expect(page(third, ["visible-row"], null)).toMatchObject({
      status: "complete",
      rowKeys: ["visible-row"],
    });
  });

  it("an empty final page does not erase earlier visible rows", () => {
    const next = load(page(load(), ["first-row"], "page-a"));
    expect(page(next, [], null)).toMatchObject({
      status: "complete",
      rowKeys: ["first-row"],
    });
  });

  it("deduplicates rows while preserving their first observed order", () => {
    const first = page(load(), ["row-a", "row-a", "row-b"], "page-a");
    expect(page(load(first), ["row-b", "row-c"], null).rowKeys).toEqual([
      "row-a",
      "row-b",
      "row-c",
    ]);
  });

  it("does not create a competing request while loading", () => {
    const loading = load();
    expect(reduceDiscovery(loading.state, { type: "load" })).toBe(
      loading.state,
    );
  });

  it("ignores repeated delivery of an already accepted page", () => {
    const loading = load();
    const accepted = page(loading, ["row-a"], "page-a");
    expect(
      reduceDiscovery(accepted, {
        type: "page",
        request: loading.request,
        rowKeys: ["replayed-row"],
        nextCursor: "wrong-page",
      }),
    ).toBe(accepted);
  });

  it("ignores a replayed earlier page during the next request", () => {
    const first = load();
    const second = load(page(first, ["row-a"], "page-a"));
    expect(
      reduceDiscovery(second.state, {
        type: "page",
        request: first.request,
        rowKeys: ["replayed-row"],
        nextCursor: "wrong-page",
      }),
    ).toBe(second.state);
    expect(page(second, ["row-b"], null).rowKeys).toEqual(["row-a", "row-b"]);
  });

  it.each(["tenantId", "actorId", "selectedClientId"] as const)(
    "rejects the old request after %s replacement",
    (field) => {
      const old = load();
      const current = load(
        createDiscoveryState({ ...scope, [field]: "replacement" }),
      );
      expect(
        reduceDiscovery(current.state, {
          type: "page",
          request: old.request,
          rowKeys: ["old-private-row"],
          nextCursor: null,
        }),
      ).toBe(current.state);
      expect(current.state.rowKeys).toEqual([]);
    },
  );

  it("returning to identical scope values still creates a new generation", () => {
    const old = load();
    const current = load(createDiscoveryState(scope));
    expect(current.request.scope).toEqual(old.request.scope);
    expect(current.request.scope).not.toBe(old.request.scope);
    for (const type of ["denied", "unavailable", "restart"] as const)
      expect(
        reduceDiscovery(current.state, { type, request: old.request }),
      ).toBe(current.state);
    expect(
      reduceDiscovery(current.state, {
        type: "page",
        request: old.request,
        rowKeys: ["stale-row"],
        nextCursor: null,
      }),
    ).toBe(current.state);
  });

  it("requires exact ticket identity, not a copied request-shaped object", () => {
    const loading = load();
    expect(
      reduceDiscovery(loading.state, {
        type: "page",
        request: { ...loading.request },
        rowKeys: ["unmatched-row"],
        nextCursor: null,
      }),
    ).toBe(loading.state);
  });

  it("keeps dependency failure distinct from empty and retries the same cursor", () => {
    const next = load(page(load(), ["row-a"], "page-a"));
    const failed = reduceDiscovery(next.state, {
      type: "unavailable",
      request: next.request,
    });
    expect(failed).toMatchObject({
      status: "unavailable",
      nextCursor: "page-a",
      rowKeys: ["row-a"],
      request: null,
    });
    const retry = load(failed);
    expect(retry.request.cursor).toBe("page-a");
    expect(retry.request).not.toBe(next.request);
    expect(page(retry, ["row-b"], null).rowKeys).toEqual(["row-a", "row-b"]);
  });

  it("an earlier retry cannot settle or fail the current request", () => {
    const first = load();
    const retry = load(
      reduceDiscovery(first.state, {
        type: "unavailable",
        request: first.request,
      }),
    );
    for (const type of ["denied", "unavailable", "restart"] as const)
      expect(
        reduceDiscovery(retry.state, { type, request: first.request }),
      ).toBe(retry.state);
    expect(
      reduceDiscovery(retry.state, {
        type: "page",
        request: first.request,
        rowKeys: ["late-row"],
        nextCursor: null,
      }),
    ).toBe(retry.state);
  });

  it("denial clears retained rows and an explicit retry starts at the beginning", () => {
    const next = load(page(load(), ["old-row"], "page-a"));
    const denied = reduceDiscovery(next.state, {
      type: "denied",
      request: next.request,
    });
    expect(denied).toMatchObject({
      status: "denied",
      rowKeys: [],
      nextCursor: null,
      consumedCursors: [],
      request: null,
    });
    expect(load(denied).request.cursor).toBeNull();
  });

  it.each(["page-a", "page-b", ""])(
    "refuses cyclic or nonprogressing next cursor %j",
    (nextCursor) => {
      const second = load(page(load(), ["row-a"], "page-a"));
      const third = load(page(second, ["row-b"], "page-b"));
      const refused = page(third, ["uncertain-row"], nextCursor);
      expect(refused.status).toBe("restart-required");
      expect(refused.rowKeys).toEqual([]);
      expect(reduceDiscovery(refused, { type: "load" })).toBe(refused);
      const restarted = load(createDiscoveryState(refused.scope));
      expect(restarted.request.cursor).toBeNull();
    },
  );

  it("an explicit cursor invalidation requires a fresh traversal", () => {
    const next = load(page(load(), ["row-a"], "page-a"));
    const invalid = reduceDiscovery(next.state, {
      type: "restart",
      request: next.request,
    });
    expect(invalid.status).toBe("restart-required");
    expect(invalid.rowKeys).toEqual([]);
    const restarted = load(createDiscoveryState(invalid.scope));
    expect(page(restarted, ["fresh-row"], null).rowKeys).toEqual(["fresh-row"]);
  });

  it.each([{ rowKeys: [] }, { rowKeys: ["row-a"] }])(
    "does not auto-reload a completed traversal $rowKeys",
    ({ rowKeys }) => {
      const completed = page(load(), rowKeys, null);
      expect(reduceDiscovery(completed, { type: "load" })).toBe(completed);
    },
  );

  it("freezes snapshots and copies caller-owned scope and row arrays", () => {
    const mutableScope = { ...scope };
    const initial = createDiscoveryState(mutableScope);
    mutableScope.actorId = "changed-after-creation";
    expect(initial.scope.actorId).toBe(scope.actorId);
    const keys = ["row-a"];
    const completed = page(load(initial), keys, null);
    keys.push("changed-after-delivery");
    expect(completed.rowKeys).toEqual(["row-a"]);
    for (const value of [
      completed,
      completed.scope,
      completed.rowKeys,
      completed.consumedCursors,
      load().request,
    ])
      expect(Object.isFrozen(value)).toBe(true);
  });
});

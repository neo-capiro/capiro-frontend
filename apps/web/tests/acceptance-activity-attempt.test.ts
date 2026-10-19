import { QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it } from "vitest";
import {
  activityAttemptKey,
  assertActivityReviewAttempt,
  beginActivityAttempt,
  currentActivityAttempt,
  settleActivityAttempt,
} from "../src/features/portfolio/client-profile/activity-attempt";

const actor = { tenantId: "tenant-a", userId: "user-a" };
const key = activityAttemptKey("client-a", "note-a", actor);
const caches: QueryClient[] = [];
function cache() {
  const value = new QueryClient();
  caches.push(value);
  return value;
}
afterEach(() => {
  for (const value of caches.splice(0)) value.clear();
});

describe("activity attempt retention in the existing session cache", () => {
  it("blocks another write while pending and unknown, even when its new intent differs", () => {
    const client = cache();
    const first = beginActivityAttempt(client, key, {
      action: "pin",
      pinned: true,
    });
    expect(() =>
      beginActivityAttempt(client, key, { action: "remove" }),
    ).toThrow("Review the latest activity");
    settleActivityAttempt(client, key, first.token, true);
    expect(currentActivityAttempt(client, key)).toMatchObject({
      status: "unknown",
      change: { action: "pin", pinned: true },
    });
    expect(() =>
      beginActivityAttempt(client, key, { action: "pin", pinned: false }),
    ).toThrow("Review the latest activity");
  });

  it("retains the submitted edit values rather than a caller's mutable draft", () => {
    const client = cache();
    const fields = {
      title: "Original submitted title",
      body: "Original detail",
    };
    const first = beginActivityAttempt(client, key, { action: "edit", fields });
    fields.title = "A later draft";
    fields.body = "Different detail";
    settleActivityAttempt(client, key, first.token, true);
    expect(currentActivityAttempt(client, key)?.change).toEqual({
      action: "edit",
      fields: { title: "Original submitted title", body: "Original detail" },
    });
  });

  it.each([
    [
      "tenant",
      activityAttemptKey("client-a", "note-a", {
        ...actor,
        tenantId: "tenant-b",
      }),
    ],
    [
      "actor",
      activityAttemptKey("client-a", "note-a", { ...actor, userId: "user-b" }),
    ],
    ["client", activityAttemptKey("client-b", "note-a", actor)],
    ["activity", activityAttemptKey("client-a", "note-b", actor)],
  ] as const)(
    "does not expose or clear the original intent in a different %s scope",
    (_, otherKey) => {
      const client = cache();
      const original = beginActivityAttempt(client, key, {
        action: "pin",
        pinned: true,
      });
      settleActivityAttempt(client, key, original.token, true);
      expect(currentActivityAttempt(client, otherKey)).toBeNull();
      const other = beginActivityAttempt(client, otherKey, {
        action: "remove",
      });
      settleActivityAttempt(client, otherKey, original.token, false);
      expect(currentActivityAttempt(client, otherKey)?.token).toBe(other.token);
      expect(currentActivityAttempt(client, key)).toMatchObject({
        token: original.token,
        status: "unknown",
        change: { action: "pin", pinned: true },
      });
    },
  );

  it("refuses review while dispatched work is pending, then permits explicit unknown review", () => {
    const client = cache();
    const first = beginActivityAttempt(client, key, {
      action: "pin",
      pinned: true,
    });
    expect(() =>
      assertActivityReviewAttempt(client, key, first.token),
    ).toThrow();
    settleActivityAttempt(client, key, first.token, true);
    expect(() =>
      assertActivityReviewAttempt(client, key, first.token),
    ).not.toThrow();
    settleActivityAttempt(client, key, first.token, false);
    expect(currentActivityAttempt(client, key)).toBeNull();
    expect(() =>
      beginActivityAttempt(client, key, { action: "pin", pinned: false }),
    ).not.toThrow();
  });

  it("a stale review or completion cannot clear or relabel a newer attempt", () => {
    const client = cache();
    const first = beginActivityAttempt(client, key, {
      action: "pin",
      pinned: true,
    });
    settleActivityAttempt(client, key, first.token, true);
    assertActivityReviewAttempt(client, key, first.token);
    settleActivityAttempt(client, key, first.token, false);
    const second = beginActivityAttempt(client, key, {
      action: "pin",
      pinned: false,
    });
    settleActivityAttempt(client, key, second.token, true);
    expect(() =>
      assertActivityReviewAttempt(client, key, first.token),
    ).toThrow();
    settleActivityAttempt(client, key, first.token, false);
    settleActivityAttempt(client, key, first.token, true);
    expect(currentActivityAttempt(client, key)).toMatchObject({
      token: second.token,
      status: "unknown",
      change: { action: "pin", pinned: false },
    });
  });

  it("session cache disposal removes private intent and late completion cannot recreate it", () => {
    const client = cache();
    const first = beginActivityAttempt(client, key, {
      action: "edit",
      fields: { title: "Prior session private title", body: "Private detail" },
    });
    client.clear();
    settleActivityAttempt(client, key, first.token, true);
    expect(client.getQueryState(key)).toBeUndefined();
    expect(() =>
      assertActivityReviewAttempt(client, key, first.token),
    ).toThrow();
    expect(currentActivityAttempt(cache(), key)).toBeNull();
  });

  it("a conflict review without an unknown attempt cannot adopt a newly admitted write", () => {
    const client = cache();
    expect(() =>
      assertActivityReviewAttempt(client, key, undefined),
    ).not.toThrow();
    beginActivityAttempt(client, key, { action: "remove" });
    expect(() => assertActivityReviewAttempt(client, key, undefined)).toThrow();
  });
});

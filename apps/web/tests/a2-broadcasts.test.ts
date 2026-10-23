import { describe, expect, it } from "vitest";
import {
  clearBroadcastAttempt,
  readBroadcastAttempt,
  requireBroadcastReceipt,
  retainBroadcastAttempt,
} from "../src/shared/shell/broadcast-receipts";
import { settingsOperations } from "../src/shared/capiro/operations/settings";
const first = "11111111-1111-4111-8111-111111111111";
const second = "22222222-2222-4222-8222-222222222222";
function storage() {
  const rows = new Map<string, string>();
  return {
    rows,
    getItem: (key: string) => rows.get(key) ?? null,
    setItem: (key: string, value: string) => {
      rows.set(key, value);
    },
    removeItem: (key: string) => {
      rows.delete(key);
    },
  };
}
describe("broadcast recipient contracts and nonsecret recovery", () => {
  it("accepts only the exact persisted broadcast acknowledgement", () => {
    const receipt = {
      ok: true,
      broadcastId: first,
      acknowledgedAt: "2026-10-23T00:00:00.000Z",
    };
    expect(requireBroadcastReceipt(first, receipt)).toEqual(receipt);
    expect(() => requireBroadcastReceipt(second, receipt)).toThrow();
    expect(() => requireBroadcastReceipt(first, { ok: true })).toThrow();
    expect(() =>
      requireBroadcastReceipt(first, { ...receipt, acknowledgedAt: null }),
    ).toThrow();
  });
  it("retains only an exact opaque notice ID and cannot clear a newer attempt", () => {
    const store = storage();
    retainBroadcastAttempt(store, "actor-a", first);
    expect(readBroadcastAttempt(store, "actor-a")).toEqual({
      version: 1,
      broadcastId: first,
    });
    expect(readBroadcastAttempt(store, "actor-b")).toBeUndefined();
    retainBroadcastAttempt(store, "actor-a", second);
    clearBroadcastAttempt(store, "actor-a", first);
    expect(readBroadcastAttempt(store, "actor-a")?.broadcastId).toBe(second);
    clearBroadcastAttempt(store, "actor-a", second);
    expect(readBroadcastAttempt(store, "actor-a")).toBeUndefined();
  });
  it("does not silently discard malformed retained recovery identity", () => {
    const store = storage();
    store.setItem("key", "bad-json");
    expect(() => readBroadcastAttempt(store, "key")).toThrow();
    expect(store.getItem("key")).toBe("bad-json");
    expect(() => retainBroadcastAttempt(store, "key", "not-an-id")).toThrow();
  });
  it("recipient operations are fixed and reject tenant, actor, or acknowledgement body inputs", () => {
    const read = settingsOperations["me.broadcasts.pending"];
    const write = settingsOperations["me.broadcasts.acknowledge"];
    expect(read.method).toBe("GET");
    expect(write.method).toBe("POST");
    expect(read.request.safeParse({ tenantId: "injected" }).success).toBe(
      false,
    );
    expect(
      write.request.safeParse({
        params: { id: first },
        body: { acknowledged: true },
      }).success,
    ).toBe(false);
    expect(
      read.response.safeParse(
        Array.from({ length: 101 }, () => ({
          id: first,
          title: "Synthetic",
          body: "Text",
          createdAt: "2026-10-23T00:00:00Z",
        })),
      ).success,
    ).toBe(false);
  });
});

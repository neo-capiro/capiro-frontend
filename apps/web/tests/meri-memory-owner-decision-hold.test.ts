import { describe, expect, it } from "vitest";
import {
  holdOwnerDecision,
  ownerDecisionHoldKey,
  readOwnerDecisionHolds,
  releaseOwnerDecision,
} from "../src/features/meri/memory-review/owner-decision-hold";

const id = "11111111-1111-4111-8111-111111111111";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
  };
}

describe("owner memory decision recovery", () => {
  it("retains an unknown decision across reload and tabs for the same actor", () => {
    const storage = memoryStorage();
    const actor = ownerDecisionHoldKey("user-one", "firm-one")!;
    expect(holdOwnerDecision(storage, actor, id)).toBe(true);
    expect(readOwnerDecisionHolds(storage, actor)).toEqual(new Set([id]));
    // A fresh component reads the same durable marker before permitting a POST.
    expect(holdOwnerDecision(storage, actor, id)).toBe(false);
    expect(readOwnerDecisionHolds(storage, actor)).toEqual(new Set([id]));
    // A pending-only Core list is not a terminal receipt and never clears it.
  });

  it("scopes the marker to both user and organization", () => {
    const storage = memoryStorage();
    const actor = ownerDecisionHoldKey("user-one", "firm-one")!;
    expect(holdOwnerDecision(storage, actor, id)).toBe(true);
    expect(
      readOwnerDecisionHolds(
        storage,
        ownerDecisionHoldKey("user-two", "firm-one")!,
      ),
    ).toEqual(new Set());
    expect(
      readOwnerDecisionHolds(
        storage,
        ownerDecisionHoldKey("user-one", "firm-two")!,
      ),
    ).toEqual(new Set());
    expect(releaseOwnerDecision(storage, actor, id)).toBe(true);
    expect(readOwnerDecisionHolds(storage, actor)).toEqual(new Set());
  });

  it("holds decisions when recovery storage is corrupt or unavailable", () => {
    const storage = memoryStorage();
    const actor = ownerDecisionHoldKey("user-one", null)!;
    storage.setItem(actor, "broken record");
    expect(readOwnerDecisionHolds(storage, actor)).toBeNull();
    expect(holdOwnerDecision(storage, actor, id)).toBe(false);
    const unavailable = {
      getItem: () => {
        throw new Error("storage denied");
      },
      setItem: () => {
        throw new Error("storage denied");
      },
    };
    expect(readOwnerDecisionHolds(unavailable, actor)).toBeNull();
    expect(holdOwnerDecision(unavailable, actor, id)).toBe(false);
  });
});

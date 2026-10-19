import { describe, it, expect } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import {
  currentBoard,
  trackerReaderKey,
  assertTrackerReader,
} from "../src/features/portfolio/bill-tracker/current-data";
import {
  intelBoard,
  intelBoardSchema,
} from "../src/features/portfolio/bill-tracker/contracts";
import { trackerIdentity } from "./tracker-preference-fixtures";

const raw = {
  columns: [
    {
      id: "committee",
      label: "In committee",
      cards: [
        {
          billId: "tx-2025-hb1",
          displayNum: "HB 1",
          title: "Synthetic bill",
          stage: "committee",
          passageProbability: 0.17,
          matchedTags: [],
          changeChip: null,
          terminalRisk: true,
          unread: false,
          hearingCount: 0,
          lastHearingSessionId: null,
          latestActionText: "Original action",
        },
      ],
    },
  ],
  total: 8,
  nextCursor: "next",
  hasMore: true,
  withheld: 7,
};
describe("current Bill Tracker reads", () => {
  it("conceals cached rows, columns and counts after a failed or pending read", () => {
    const page = intelBoard(intelBoardSchema.parse(raw));
    for (const source of [
      { isSuccess: false, error: new Error("Denied") },
      { isSuccess: false, error: null },
      { isSuccess: true, error: new Error("Unexpected") },
    ]) {
      expect(currentBoard({ ...source, data: { pages: [page] } })).toEqual({
        pages: [],
        bills: [],
        columns: [],
        total: undefined,
      });
    }
  });
  it("projects only the latest successful records and retains native paging/count semantics", () => {
    const first = intelBoard(intelBoardSchema.parse(raw));
    const updated = {
      ...first,
      columns: [
        {
          ...first.columns[0]!,
          bills: [
            {
              ...first.columns[0]!.bills[0]!,
              latestActionText: "Updated action",
            },
          ],
        },
      ],
      nextCursor: null,
    };
    const result = currentBoard(
      { isSuccess: true, error: null, data: { pages: [first, updated] } },
      "synthetic",
    );
    expect(result.bills).toHaveLength(1);
    expect(result.bills[0]?.latestActionText).toBe("Updated action");
    expect(result.total).toBe(8);
    expect(result.pages[0]?.nextCursor).toBe("next");
    expect(result.columns[0]?.bills[0]?.probability).toBe(0.17);
  });
  it("binds reads to current tenant/database actor/role without requiring the personal Clerk field", async () => {
    const cache = new QueryClient();
    const { clerkUserId: _clerk, ...user } = trackerIdentity.user;
    expect(_clerk).toBeDefined();
    cache.setQueryData(["identity"], { ...trackerIdentity, user });
    const scope = trackerReaderKey(cache);
    expect(scope).not.toBe("");
    expect(() => assertTrackerReader(cache, scope)).not.toThrow();
    cache.setQueryData(["identity"], {
      ...trackerIdentity,
      role: "client_portal_user",
    });
    expect(() => assertTrackerReader(cache, scope)).toThrow("session changed");
    await cache.invalidateQueries({
      queryKey: ["identity"],
      refetchType: "none",
    });
    expect(trackerReaderKey(cache)).toBe("");
  });
});
